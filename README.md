# ABL Sales Dashboard

Interactive sales dashboard built from the Troyee ERP sales register export
(Apr 2024 – Mar 2025, ~452,800 invoice lines, aggregated to 40k rows for the browser).

## Filters
- **Year**
- **Depot** (South / North / CTG / Outside Dhaka / etc.)
- **Team** (auto-filters to the selected depot's teams)
- **Customer search** (by name or customer code)

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Vercel (same flow as your other ABL dashboards)
1. Push this folder to a new GitHub repo.
2. Go to vercel.com → New Project → Import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output dir `dist` (Vercel auto-detects these).
4. Deploy. No environment variables needed — the data is bundled as `public/data.json`.

## Updating the data later
`public/data.json` is a static snapshot generated from your Excel export. To refresh it with a
new month's data, send me the updated Troyee export and I'll regenerate `data.json` — or if you
want it live-updating like your Rolling Forecast Dashboard, I can wire it to a published Google
Sheets CSV instead of a static file.

## Structure
```
src/App.jsx      → all dashboard logic (filters, KPIs, charts, customer table)
src/App.css       → styling (Ajinomoto navy/red theme)
public/data.json  → aggregated sales data (customers, monthly trend, product mix)
```
