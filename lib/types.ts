export type BedroomType = "studio" | "1br" | "2br" | "3br" | "4br";

export type UnitInput = {
  id: string;
  label: string;
  bedroomType: BedroomType;
  estimatedRent: number | null;
  rent: number | null;
};

export type RentByBedroom = Partial<Record<BedroomType, number>>;

export type PropertySnapshot = {
  address: string;
  purchasePrice: number | null;
  units: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType?: string | null;
  yearBuilt?: number | null;
  lotSize?: number | null;
};

export type AnalysisResponse = {
  address: string;
  property: PropertySnapshot;
  unitMixSource: "provider" | "fallback";
  units: UnitInput[];
  rentByBedroom: RentByBedroom;
  warnings: string[];
};
