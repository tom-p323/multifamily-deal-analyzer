export type Verdict = "Pass" | "Maybe" | "Analyze Further";
export type GrmStrength = "strong" | "workable" | "weak" | "unknown";

export type VerdictResult = {
  verdict: Verdict;
  strongDeal: boolean;
  grmStrength: GrmStrength;
};

export function getGrmStrength(grm: number | null): GrmStrength {
  if (grm === null) {
    return "unknown";
  }

  if (grm <= 10) {
    return "strong";
  }

  if (grm <= 12) {
    return "workable";
  }

  return "weak";
}

export function getVerdict(rentToPrice: number | null, grm: number | null): VerdictResult {
  const strongDeal = rentToPrice !== null && rentToPrice >= 0.01 && grm !== null && grm <= 10;
  const grmStrength = getGrmStrength(grm);

  if ((rentToPrice !== null && rentToPrice < 0.0075) || (grm !== null && grm > 13)) {
    return { verdict: "Pass", strongDeal, grmStrength };
  }

  if (
    (rentToPrice !== null && rentToPrice >= 0.0075 && rentToPrice < 0.0085) ||
    (grm !== null && grm > 12 && grm <= 13)
  ) {
    return { verdict: "Maybe", strongDeal, grmStrength };
  }

  if (rentToPrice !== null && rentToPrice >= 0.0085) {
    return { verdict: "Analyze Further", strongDeal, grmStrength };
  }

  return { verdict: "Maybe", strongDeal, grmStrength };
}
