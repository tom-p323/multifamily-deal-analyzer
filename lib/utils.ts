import { BedroomType, UnitInput } from "@/lib/types";

export const BEDROOM_OPTIONS: { label: string; value: BedroomType }[] = [
  { label: "Studio", value: "studio" },
  { label: "1BR", value: "1br" },
  { label: "2BR", value: "2br" },
  { label: "3BR", value: "3br" },
  { label: "4BR", value: "4br" },
];

export function createFallbackUnits(count: number): UnitInput[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `fallback-${Date.now()}-${index + 1}`,
    label: `Unit ${index + 1}`,
    bedroomType: "2br" as const,
    estimatedRent: null,
    rent: null,
  }));
}

export function normalizePositiveNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
