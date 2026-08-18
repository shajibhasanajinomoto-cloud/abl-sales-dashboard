# ABL Sales Performance Dashboard

Interactive sales dashboard for Ajinomoto Bangladesh Ltd. (ABL) — depot, team, customer type, and product-level performance with filters and Excel export.

## Files

- `index.html` — the dashboard (self-contained, no build step)
- `data_embed.js` — starter dataset (March 2025), loaded automatically if no Google Sheet is connected
- `vercel.json` — tells Vercel this is a plain static site (no framework, no build command)
- `.nojekyll` — disables Jekyll processing if hosted on GitHub Pages

## Deploy

**Vercel**
1. Push all files in this folder to the repo root (same folder, not a subfolder).
2. In Vercel project settings → General → Framework Preset, confirm it's set to **Other**.
3. Redeploy.

**GitHub Pages**
1. Push all files to the repo root.
2. Settings → Pages → Deploy from branch → `main` → `/ (root)`.

## Connect live data

Open the deployed site → **Data source** (top right) → paste a Google Sheet CSV publish link (File → Share → Publish to web → CSV). Keep these 9 columns: `Date, Month, Depot, Team, CustomerType, Product, KG, QTY, Amount`. New months added to the sheet automatically appear in the Product comparison tab.
