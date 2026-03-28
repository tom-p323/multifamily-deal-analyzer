"use client";

type AddressFormProps = {
  address: string;
  loading: boolean;
  onAddressChange: (value: string) => void;
  onSubmit: () => void;
};

export function AddressForm({ address, loading, onAddressChange, onSubmit }: AddressFormProps) {
  return (
    <div className="glass-panel rounded-[1.6rem] border border-white/50 p-3 shadow-card md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <label htmlFor="address" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
            Address
          </label>
          <input
            id="address"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="123 Main St, Charlotte, NC"
            className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/20"
          />
        </div>
        <button
          type="button"
          disabled={loading || !address.trim()}
          onClick={onSubmit}
          className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-cream transition hover:bg-pine disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          {loading ? "Looking up..." : "Lookup"}
        </button>
      </div>
    </div>
  );
}