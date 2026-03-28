import { AnalysisResponse, BedroomType, PropertySnapshot, RentByBedroom, UnitInput } from "@/lib/types";

const RENTCAST_BASE_URL = process.env.RENTCAST_BASE_URL ?? "https://api.rentcast.io/v1";
const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;
const DEFAULT_BEDROOM_TYPES: BedroomType[] = ["studio", "1br", "2br", "3br", "4br"];

type RentcastProperty = {
  id?: string;
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  features?: {
    unitCount?: number | null;
  } | null;
  units?: Array<{
    bedrooms?: number | null;
  }> | null;
  price?: number | null;
  listingPrice?: number | null;
  lastSalePrice?: number | null;
  yearBuilt?: number | null;
  lotSize?: number | null;
};

type RentcastSaleListing = {
  id?: string;
  formattedAddress?: string;
  price?: number | null;
};

type RentEstimateResponse = {
  rent?: number;
};

function getHeaders() {
  if (!RENTCAST_API_KEY) {
    return null;
  }

  return {
    accept: "application/json",
    "X-Api-Key": RENTCAST_API_KEY,
  };
}

async function fetchRentcast<T>(path: string, searchParams?: Record<string, string | number | undefined>) {
  const headers = getHeaders();
  if (!headers) {
    throw new Error("Missing RENTCAST_API_KEY");
  }

  const url = new URL(`${RENTCAST_BASE_URL}${path}`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Rentcast request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

function buildAddress(property: RentcastProperty, fallback: string) {
  return (
    property.formattedAddress ||
    [property.addressLine1, property.city, property.state, property.zipCode].filter(Boolean).join(", ") ||
    fallback
  );
}

function inferPurchasePrice(property: RentcastProperty | null, saleListing: RentcastSaleListing | null) {
  return saleListing?.price ?? property?.listingPrice ?? property?.price ?? property?.lastSalePrice ?? null;
}

function toBedroomType(bedrooms?: number | null): BedroomType {
  if (!bedrooms || bedrooms <= 0) {
    return "studio";
  }

  if (bedrooms >= 4) {
    return "4br";
  }

  return `${bedrooms}br` as BedroomType;
}

function inferUnitMix(property: RentcastProperty): UnitInput[] {
  if (property.units?.length) {
    return property.units.map((unit, index) => {
      const bedroomType = toBedroomType(unit.bedrooms);

      return {
        id: `provider-${index + 1}`,
        label: `Unit ${index + 1}`,
        bedroomType,
        estimatedRent: null,
        rent: null,
      };
    });
  }

  const unitCount = property.features?.unitCount ?? null;
  if (unitCount && property.bedrooms && unitCount > 0) {
    const avgBedrooms = Math.max(1, Math.round(property.bedrooms / unitCount));
    const bedroomType = toBedroomType(avgBedrooms);

    return Array.from({ length: unitCount }, (_, index) => ({
      id: `provider-${index + 1}`,
      label: `Unit ${index + 1}`,
      bedroomType,
      estimatedRent: null,
      rent: null,
    }));
  }

  return [];
}

async function getPropertyDetails(address: string) {
  const properties = await fetchRentcast<RentcastProperty[]>("/properties", { address });
  return properties[0] ?? null;
}

async function getSaleListing(address: string) {
  const listings = await fetchRentcast<RentcastSaleListing[]>("/listings/sale", { address });
  return listings[0] ?? null;
}

async function getRentEstimate(address: string, bedroomType: BedroomType) {
  const bedrooms = bedroomType === "studio" ? 0 : Number(bedroomType.replace("br", ""));

  const result = await fetchRentcast<RentEstimateResponse>("/avm/rent/long-term", {
    address,
    bedrooms,
    propertyType: "Multi-Family",
  });

  return result.rent ?? null;
}

async function getRentByBedroom(address: string, bedroomTypes: BedroomType[]) {
  const uniqueTypes = [...new Set(bedroomTypes)];
  const estimates = await Promise.all(
    uniqueTypes.map(async (bedroomType) => {
      try {
        const rent = await getRentEstimate(address, bedroomType);
        return [bedroomType, rent] as const;
      } catch {
        return [bedroomType, null] as const;
      }
    }),
  );

  return estimates.reduce<RentByBedroom>((acc, [bedroomType, rent]) => {
    if (rent !== null) {
      acc[bedroomType] = rent;
    }
    return acc;
  }, {});
}

function applyRents(units: UnitInput[], rentByBedroom: RentByBedroom) {
  return units.map((unit) => {
    const estimatedRent = rentByBedroom[unit.bedroomType] ?? null;
    return {
      ...unit,
      estimatedRent,
      rent: estimatedRent,
    };
  });
}

function buildPropertySnapshot(address: string, property: RentcastProperty | null, saleListing: RentcastSaleListing | null): PropertySnapshot {
  return {
    address: property ? buildAddress(property, address) : saleListing?.formattedAddress ?? address,
    purchasePrice: inferPurchasePrice(property, saleListing),
    units: property?.features?.unitCount ?? property?.units?.length ?? null,
    bedrooms: property?.bedrooms ?? null,
    bathrooms: property?.bathrooms ?? null,
    propertyType: property?.propertyType ?? null,
    yearBuilt: property?.yearBuilt ?? null,
    lotSize: property?.lotSize ?? null,
  };
}

export async function analyzeAddressWithRentcast(address: string): Promise<AnalysisResponse> {
  const warnings: string[] = [];

  if (!RENTCAST_API_KEY) {
    return {
      address,
      property: buildPropertySnapshot(address, null, null),
      unitMixSource: "fallback",
      units: [],
      rentByBedroom: {},
      warnings: ["Rentcast API key is missing. Enter units, price, and rent manually to continue."],
    };
  }

  const [propertyResult, saleListingResult] = await Promise.allSettled([
    getPropertyDetails(address),
    getSaleListing(address),
  ]);

  const property = propertyResult.status === "fulfilled" ? propertyResult.value : null;
  const saleListing = saleListingResult.status === "fulfilled" ? saleListingResult.value : null;

  if (propertyResult.status === "rejected") {
    warnings.push("Property details could not be pulled from Rentcast. Manual overrides are available.");
  }

  if (!saleListing) {
    warnings.push("Listing price was not available from Rentcast. Enter the purchase price manually if needed.");
  }

  const providerUnits = property ? inferUnitMix(property) : [];
  const unitMixSource = providerUnits.length > 0 ? "provider" : "fallback";

  if (unitMixSource === "fallback") {
    warnings.push("Unit mix was not available from the provider. Select the number of units and bedroom count for each unit.");
  }

  const bedroomTypesToEstimate =
    providerUnits.length > 0 ? providerUnits.map((unit) => unit.bedroomType) : DEFAULT_BEDROOM_TYPES;
  const rentByBedroom = await getRentByBedroom(address, bedroomTypesToEstimate);

  if (Object.keys(rentByBedroom).length === 0) {
    warnings.push("Rent estimates were unavailable. You can enter rents manually for each unit.");
  }

  return {
    address,
    property: buildPropertySnapshot(address, property, saleListing),
    unitMixSource,
    units: applyRents(providerUnits, rentByBedroom),
    rentByBedroom,
    warnings,
  };
}
