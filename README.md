# First Pass Deal Screen

Simple MVP web app for first-pass screening of small multifamily real estate deals in Charlotte, NC and surrounding markets.

## What It Does

- Takes a single address as input
- Attempts to pull property details and purchase price from Rentcast
- Estimates rent at the unit level by bedroom type
- Calculates:
  - total monthly rent
  - rent-to-price ratio
  - GRM
  - max purchase price at a 0.85% rent-to-price threshold
- Returns a quick verdict:
  - Pass
  - Maybe
  - Analyze Further
- Supports manual overrides for:
  - purchase price
  - number of units
  - bedroom type per unit
  - rent per unit

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS

## Project Structure

- `app/` - app router pages and API routes
- `components/` - UI components
- `services/rentcast.ts` - Rentcast integration layer
- `lib/calculations.ts` - financial formulas
- `lib/verdict.ts` - screening logic

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

3. Add your Rentcast API key to `.env.local`.

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Rentcast Notes

This MVP uses Rentcast only for v1 and keeps the service isolated in `services/rentcast.ts` so other providers can be added later.

The app handles missing upstream data gracefully:

- If purchase price is unavailable, users can enter it manually.
- If unit mix is unavailable, users can pick 2, 3, or 4 units and assign bedroom counts.
- If rent estimates fail, users can enter per-unit rents manually.

## Screening Rules

- `rent_to_price = total_monthly_rent / purchase_price`
- `GRM = purchase_price / (total_monthly_rent * 12)`
- `max_purchase_price = total_monthly_rent / 0.0085`

Verdict thresholds:

- Pass if rent-to-price `< 0.0075` or GRM `> 13`
- Maybe if rent-to-price is `0.0075–0.0085` or GRM is `12–13`
- Analyze Further if rent-to-price `>= 0.0085`
- Strong deal if rent-to-price `>= 0.01` and GRM `<= 10`

## Important Assumptions

- The app is intended as a quick filter, not full underwriting.
- Unit-level rent estimation is the core behavior.
- Charlotte-area focus is reflected in the product positioning, while Rentcast handles the actual property and rent lookup.
