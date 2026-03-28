"use client";

import { AddressForm } from "@/components/address-form";
import { DashboardSummary, ResultsCard } from "@/components/results-card";
import { formatCurrency, formatDecimal, formatRatio } from "@/lib/format";
import { AnalysisResponse } from "@/lib/types";
import clsx from "clsx";
import { useState } from "react";

function createEmptyAnalysis(address: string): AnalysisResponse {
  return {
    address,
    property: {
      address,
      purchasePrice: null,
      units: 2,
      bedrooms: null,
      bathrooms: null,
      propertyType: null,
      yearBuilt: null,
      lotSize: null,
    },
    unitMixSource: "fallback",
    units: [],
    rentByBedroom: {},
    warnings: [],
  };
}

function createEmptySummary(): DashboardSummary {
  return {
    grm: null,
    rentToPrice: null,
    maxPurchasePrice: 0,
    verdict: null,
  };
}

export default function HomePage() {
  const [address, setAddress] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse>(createEmptyAnalysis(""));
  const [summary, setSummary] = useState<DashboardSummary>(createEmptySummary());
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!address.trim()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      const payload = (await response.json()) as AnalysisResponse & { error?: string };

      if (!response.ok) {
        setAnalysis(createEmptyAnalysis(address));
        return;
      }

      setAnalysis({
        ...payload,
        warnings: [],
      });
    } catch {
      setAnalysis(createEmptyAnalysis(address));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 md:px-6 md:py-5">
      <header className="mb-3 rounded-[1.5rem] border border-[#e8dfd0] bg-[#F4EFE6] px-4 py-4 text-ink shadow-card md:px-5 md:py-4.5">
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold tracking-[0.08em] text-ink/85 md:text-[1.05rem]">Multifamily Deal Analyzer</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <TopMetricCard
              label="GRM"
              value={formatDecimal(summary.grm)}
              tooltip="Purchase Price / Annual Gross Rent"
              tone={summary.verdict ? getGrmTone(summary.grm) : "neutral"}
            />
            <TopMetricCard
              label="Rent-to-price"
              value={formatRatio(summary.rentToPrice)}
              tooltip="Monthly Rent / Purchase Price"
              tone={summary.verdict ? getRentToPriceTone(summary.rentToPrice) : "neutral"}
            />
            <TopMetricCard label="Max purchase price" value={formatCurrency(summary.maxPurchasePrice)} />
          </div>
          <div className="min-h-[22px] px-1 text-sm font-semibold tracking-[0.02em]">
            {summary.verdict ? (
              <span
                className={clsx(
                  summary.verdict.tone === "green" && "text-[#0da353]",
                  summary.verdict.tone === "yellow" && "text-[#9a7c21]",
                  summary.verdict.tone === "red" && "text-[#d93424]",
                )}
              >
                {summary.verdict.label} - {summary.verdict.body}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <AddressForm address={address} loading={loading} onAddressChange={setAddress} onSubmit={handleAnalyze} />

      <div className="mt-3">
        <ResultsCard analysis={analysis} onSummaryChange={setSummary} />
      </div>
    </main>
  );
}

function TopMetricCard({
  label,
  value,
  tooltip,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tooltip?: string;
  tone?: "neutral" | "green" | "yellow" | "red";
}) {
  return (
    <div
      className={clsx(
        "rounded-[1.15rem] border p-3",
        tone === "neutral" && "border-ink/10 bg-white/72",
        tone === "green" && "border-[#10a44f]/22 bg-[#dff8e9]",
        tone === "yellow" && "border-[#d8b354]/35 bg-[#f3e4b4]",
        tone === "red" && "border-[#db3b2b]/22 bg-[#ffe0dc]",
      )}
    >
      <HeaderLabelWithTooltip label={label} tooltip={tooltip} />
      <div className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}

function HeaderLabelWithTooltip({ label, tooltip }: { label: string; tooltip?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 text-sm text-ink/70">
      <span>{label}</span>
      {tooltip ? (
        <div className="group relative inline-flex items-center">
          <button
            type="button"
            aria-label={tooltip}
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
            {tooltip}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getRentToPriceTone(rentToPrice: number | null) {
  if (rentToPrice === null) {
    return "neutral" as const;
  }

  if (rentToPrice < 0.0075) {
    return "red" as const;
  }

  if (rentToPrice < 0.0085) {
    return "yellow" as const;
  }

  return "green" as const;
}

function getGrmTone(grm: number | null) {
  if (grm === null) {
    return "neutral" as const;
  }

  if (grm <= 10) {
    return "green" as const;
  }

  if (grm <= 13) {
    return "yellow" as const;
  }

  return "red" as const;
}