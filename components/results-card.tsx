"use client";

import { calculateDealMetrics, calculateMaxPurchasePrice } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { AnalysisResponse, BedroomType, UnitInput } from "@/lib/types";
import { BEDROOM_OPTIONS, createFallbackUnits, normalizePositiveNumber } from "@/lib/utils";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";

type ResultsCardProps = {
  analysis: AnalysisResponse;
  onSummaryChange?: (summary: DashboardSummary) => void;
};

type CriteriaState = {
  targetRatio: string;
  passRatio: string;
  strongGrm: string;
  weakGrm: string;
};

export type DashboardSummary = {
  grm: number | null;
  rentToPrice: number | null;
  totalMonthlyRent: number;
  maxPurchasePrice: number;
  verdict: VerdictDisplay | null;
};

type VerdictDisplay = {
  label: string;
  body: string;
  tone: "green" | "yellow" | "red";
};

const DEFAULT_CRITERIA: CriteriaState = {
  targetRatio: "0.85",
  passRatio: "0.75",
  strongGrm: "10",
  weakGrm: "13",
};

export function ResultsCard({ analysis, onSummaryChange }: ResultsCardProps) {
  const purchasePriceRef = useRef<HTMLInputElement>(null);
  const [purchasePrice, setPurchasePrice] = useState<string>(analysis.property.purchasePrice?.toString() ?? "");
  const [units, setUnits] = useState<UnitInput[]>(analysis.units);
  const [unitCount, setUnitCount] = useState<number>(analysis.units.length || analysis.property.units || 2);
  const [criteria, setCriteria] = useState<CriteriaState>(DEFAULT_CRITERIA);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  useEffect(() => {
    const initialUnits = buildInitialUnits(analysis);
    setPurchasePrice(analysis.property.purchasePrice?.toString() ?? "");
    setUnits(initialUnits);
    setUnitCount(initialUnits.length);
  }, [analysis]);

  useEffect(() => {
    purchasePriceRef.current?.focus();
  }, []);

  useEffect(() => {
    setUnits((currentUnits) => {
      if (currentUnits.length === unitCount) {
        return currentUnits;
      }

      if (currentUnits.length > unitCount) {
        return currentUnits.slice(0, unitCount);
      }

      const additionalUnits = createFallbackUnits(unitCount - currentUnits.length).map((unit, index) => ({
        ...unit,
        label: `Unit ${currentUnits.length + index + 1}`,
        estimatedRent: analysis.rentByBedroom[unit.bedroomType] ?? null,
        rent: analysis.rentByBedroom[unit.bedroomType] ?? null,
      }));

      return [...currentUnits, ...additionalUnits];
    });
  }, [analysis.rentByBedroom, unitCount]);

  const compactUnits = units.slice(0, unitCount);
  const parsedPurchasePrice = normalizePositiveNumber(purchasePrice);
  const rentTargetDecimal = Math.max(normalizePercent(criteria.targetRatio) ?? 0.0085, 0.0001);
  const rentPassDecimal = Math.max(normalizePercent(criteria.passRatio) ?? 0.0075, 0);
  const strongGrmThreshold = normalizePositiveNumber(criteria.strongGrm) ?? 10;
  const weakGrmThreshold = normalizePositiveNumber(criteria.weakGrm) ?? 13;
  const isReadyForVerdict = parsedPurchasePrice !== null && compactUnits.length > 0 && compactUnits.every((unit) => unit.rent !== null);

  const baseMetrics = useMemo(() => calculateDealMetrics(compactUnits, parsedPurchasePrice), [compactUnits, parsedPurchasePrice]);
  const metrics = useMemo(
    () => ({
      ...baseMetrics,
      maxPurchasePrice: calculateMaxPurchasePrice(baseMetrics.totalMonthlyRent, rentTargetDecimal),
    }),
    [baseMetrics, rentTargetDecimal],
  );

  const verdictDisplay = useMemo(
    () =>
      isReadyForVerdict
        ? getVerdictDisplay(
            metrics.rentToPrice,
            metrics.grm,
            rentPassDecimal,
            rentTargetDecimal,
            strongGrmThreshold,
            weakGrmThreshold,
          )
        : null,
    [isReadyForVerdict, metrics.grm, metrics.rentToPrice, rentPassDecimal, rentTargetDecimal, strongGrmThreshold, weakGrmThreshold],
  );

  useEffect(() => {
    onSummaryChange?.({
      grm: metrics.grm,
      rentToPrice: metrics.rentToPrice,
      totalMonthlyRent: metrics.totalMonthlyRent,
      maxPurchasePrice: metrics.maxPurchasePrice,
      verdict: verdictDisplay,
    });
  }, [metrics.grm, metrics.maxPurchasePrice, metrics.rentToPrice, metrics.totalMonthlyRent, onSummaryChange, verdictDisplay]);

  function updateUnit(index: number, updates: Partial<UnitInput>) {
    setUnits((current) => current.map((unit, unitIndex) => (unitIndex === index ? { ...unit, ...updates } : unit)));
  }

  function updateBedroomType(index: number, bedroomType: BedroomType) {
    const estimatedRent = analysis.rentByBedroom[bedroomType] ?? null;

    updateUnit(index, {
      bedroomType,
      estimatedRent,
      rent: estimatedRent,
    });
  }

  function handleCurrencyInputChange(value: string, onValueChange: (next: string) => void) {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    onValueChange(digitsOnly);
  }

  function handleClear() {
    const initialUnits = buildInitialUnits(analysis);
    setPurchasePrice(analysis.property.purchasePrice?.toString() ?? "");
    setUnits(initialUnits);
    setUnitCount(initialUnits.length);
  }

  return (
    <section className="glass-panel rounded-[1.7rem] border border-white/50 p-4 shadow-card md:p-5">
      <section className="rounded-[1.45rem] border border-ink/10 bg-white/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/60">Inputs</h2>
        </div>

        <div
          className={clsx(
            "grid gap-3",
            criteriaOpen
              ? "lg:grid-cols-[minmax(190px,230px)_minmax(190px,230px)_110px_minmax(320px,1fr)_110px]"
              : "lg:grid-cols-[minmax(190px,230px)_minmax(190px,230px)_110px_minmax(220px,1fr)_110px]",
          )}
        >
          <ControlShell>
            <LabelWithTooltip label="Purchase price" tooltip="Enter purchase price manually if not already filled." />
            <input
              ref={purchasePriceRef}
              value={formatCurrencyInput(purchasePrice)}
              onChange={(event) => handleCurrencyInputChange(event.target.value, setPurchasePrice)}
              placeholder="$0"
              inputMode="numeric"
              className={inputClassName(parsedPurchasePrice === null)}
            />
          </ControlShell>

          <ControlShell>
            <div className="text-sm text-ink/70">Max purchase price</div>
            <div className="mt-2 px-3 py-2 text-base font-semibold text-ink">
              {formatCurrency(metrics.maxPurchasePrice)}
            </div>
          </ControlShell>

          <ControlShell>
            <LabelWithTooltip label="Units" tooltip="Select number of units and assign bedroom type for each." />
            <select
              value={unitCount}
              onChange={(event) => setUnitCount(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-base outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
            >
              {[2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </ControlShell>

          <ControlShell>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCriteriaOpen((current) => !current)}
                  aria-expanded={criteriaOpen}
                  className="flex w-full items-center justify-between rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink/60 transition hover:border-clay/20 hover:text-ink"
                >
                  <span>Deal Criteria</span>
                  <span className={clsx("text-sm leading-none transition", criteriaOpen && "rotate-180")}>v</span>
                </button>
                <Tooltip
                  text={
                    <>
                      <div>{"\u2022"} R-to-P = Rent-to-price</div>
                      <div>{"\u2022"} CAUTION! These thresholds vary by market. Verify and adjust accordingly.</div>
                    </>
                  }
                />
              </div>
              {criteriaOpen ? (
                <div className="grid gap-2 rounded-xl border border-ink/10 bg-white/90 p-2.5 text-left text-xs md:grid-cols-2">
                  <CriteriaInput
                    label="R-to-P Target (%)"
                    suffix="%"
                    value={criteria.targetRatio}
                    onChange={(value) => setCriteria((current) => ({ ...current, targetRatio: value }))}
                  />
                  <CriteriaInput
                    label="R-to-P Min (%)"
                    suffix="%"
                    value={criteria.passRatio}
                    onChange={(value) => setCriteria((current) => ({ ...current, passRatio: value }))}
                  />
                  <CriteriaInput
                    label="GRM (Strong <=)"
                    value={criteria.strongGrm}
                    onChange={(value) => setCriteria((current) => ({ ...current, strongGrm: value }))}
                  />
                  <CriteriaInput
                    label="GRM (Weak >=)"
                    value={criteria.weakGrm}
                    onChange={(value) => setCriteria((current) => ({ ...current, weakGrm: value }))}
                  />
                </div>
              ) : null}
            </div>
          </ControlShell>

          <ControlShell>
            <button
              type="button"
              onClick={handleClear}
              className="flex h-full w-full items-center justify-center rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink/60 transition hover:border-clay/20 hover:text-ink"
            >
              Clear
            </button>
          </ControlShell>
        </div>

<div className="mt-3 overflow-hidden rounded-[1.3rem] border border-ink/10 bg-white/75">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] text-left text-sm md:min-w-full">
              <thead className="bg-mist text-ink/70">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Unit</th>
                  <th className="px-3 py-2 align-top">
                    <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink/45">Total monthly rent</div>
                    <div className="mt-1 text-xl font-semibold leading-none text-ink md:text-2xl">{formatCurrency(metrics.totalMonthlyRent)}</div>
                  </th>
                  <th className="px-3 py-2.5 font-medium">Unit type</th>
                  <th className="px-3 py-2.5 font-medium">Estimated rent</th>
                </tr>
              </thead>
              <tbody>
                {compactUnits.map((unit, index) => (
                  <tr key={unit.id} className="border-t border-ink/5">
                    <td className="px-3 py-2.5 font-medium text-ink">{unit.label}</td>
                    <td className="px-3 py-2.5">
                      <input
                        value={formatCurrencyInput(unit.rent?.toString() ?? "")}
                        onChange={(event) =>
                          updateUnit(index, {
                            rent: normalizePositiveNumber(event.target.value),
                          })
                        }
                        placeholder="$0"
                        inputMode="numeric"
                        className={inputClassName(unit.rent === null)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={unit.bedroomType}
                        onChange={(event) => updateBedroomType(index, event.target.value as BedroomType)}
                        className="w-full rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-ink/80 outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
                      >
                        {BEDROOM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-ink/70">{formatCurrency(unit.estimatedRent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}

function buildInitialUnits(analysis: AnalysisResponse) {
  return (
    analysis.units.length > 0
      ? analysis.units
      : createFallbackUnits(
          analysis.property.units && analysis.property.units >= 2 && analysis.property.units <= 4 ? analysis.property.units : 2,
        ).map((unit) => ({
          ...unit,
          estimatedRent: analysis.rentByBedroom[unit.bedroomType] ?? null,
          rent: analysis.rentByBedroom[unit.bedroomType] ?? null,
        }))
  );
}

function ControlShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1.15rem] border border-ink/10 bg-white/85 p-3">{children}</div>;
}

function CriteriaInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55">{label}</span>
      <div className="relative mt-1">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          className="w-full rounded-lg border border-ink/10 bg-white px-2.5 py-2 pr-5 text-sm font-medium outline-none focus:border-clay focus:ring-2 focus:ring-clay/20"
        />
        {suffix ? <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink/45">{suffix}</span> : null}
      </div>
    </label>
  );
}

function LabelWithTooltip({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink/70">
      <span>{label}</span>
      {tooltip ? <Tooltip text={tooltip} /> : null}
    </div>
  );
}

function Tooltip({ text }: { text: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={text}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-ink/15 bg-white text-[11px] font-semibold text-ink/55 transition hover:border-clay/40 hover:text-clay focus:border-clay focus:outline-none"
      >
        i
      </button>
      <div
        className={clsx(
          "pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-ink/10 bg-ink px-3 py-2 text-xs leading-relaxed text-cream shadow-lg opacity-0 transition group-hover:opacity-100 md:w-60",
          open && "pointer-events-auto opacity-100",
        )}
      >
        {text}
      </div>
    </div>
  );
}

function inputClassName(isMissing: boolean) {
  return clsx(
    "mt-2 w-full rounded-xl px-3 py-2 text-base font-semibold outline-none transition focus:ring-2 focus:ring-clay/20",
    isMissing
      ? "border border-clay/30 bg-clay/10 text-ink focus:border-clay"
      : "border border-ink/10 bg-white text-ink focus:border-clay",
  );
}

function formatCurrencyInput(value: string) {
  const parsed = normalizePositiveNumber(value);
  return parsed === null ? "" : formatCurrency(parsed);
}

function normalizePercent(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed / 100;
}

function getVerdictDisplay(
  rentToPrice: number | null,
  grm: number | null,
  passThreshold: number,
  targetThreshold: number,
  strongGrmThreshold: number,
  weakGrmThreshold: number,
): VerdictDisplay | null {
  if ((rentToPrice !== null && rentToPrice < passThreshold) || (grm !== null && grm > weakGrmThreshold)) {
    return {
      label: "NO GO!",
      body: "Does not meet criteria",
      tone: "red",
    };
  }

  if (
    (rentToPrice !== null && rentToPrice >= passThreshold && rentToPrice < targetThreshold) ||
    (grm !== null && grm > strongGrmThreshold && grm <= weakGrmThreshold)
  ) {
    return {
      label: "MAYBE",
      body: "Review more closely",
      tone: "yellow",
    };
  }

  if (rentToPrice !== null && rentToPrice >= targetThreshold) {
    return {
      label: "ANALYZE!",
      body: "Meets screening criteria",
      tone: "green",
    };
  }

  return null;
}