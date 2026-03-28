import { UnitInput } from "@/lib/types";

export type DealMetrics = {
  totalMonthlyRent: number;
  rentToPrice: number | null;
  grm: number | null;
  maxPurchasePrice: number;
};

export function calculateTotalMonthlyRent(units: UnitInput[]) {
  return units.reduce((sum, unit) => sum + (unit.rent ?? 0), 0);
}

export function calculateRentToPrice(totalMonthlyRent: number, purchasePrice: number | null) {
  if (!purchasePrice || purchasePrice <= 0) {
    return null;
  }

  return totalMonthlyRent / purchasePrice;
}

export function calculateGrm(totalMonthlyRent: number, purchasePrice: number | null) {
  if (!purchasePrice || purchasePrice <= 0 || totalMonthlyRent <= 0) {
    return null;
  }

  return purchasePrice / (totalMonthlyRent * 12);
}

export function calculateMaxPurchasePrice(totalMonthlyRent: number, targetThreshold = 0.0085) {
  if (totalMonthlyRent <= 0) {
    return 0;
  }

  return totalMonthlyRent / targetThreshold;
}

export function calculateDealMetrics(units: UnitInput[], purchasePrice: number | null): DealMetrics {
  const totalMonthlyRent = calculateTotalMonthlyRent(units);

  return {
    totalMonthlyRent,
    rentToPrice: calculateRentToPrice(totalMonthlyRent, purchasePrice),
    grm: calculateGrm(totalMonthlyRent, purchasePrice),
    maxPurchasePrice: calculateMaxPurchasePrice(totalMonthlyRent),
  };
}
