# FX Journal — Professional Forex Trading Journal

A full-stack forex trading journal built for traders who trade with market structure, liquidity sweeps, Fair Value Gaps, break and retest, and session timing. Log trades, track psychology, review performance, and export your data.

**Two parts:**
- **Web app** (Next.js 14) — full dashboard, analytics, weekly/monthly reviews, export/import
- **Chrome extension** — quick trade entry and pre-trade checklist while your broker is open

No backend. No accounts. All data stored locally in the browser via `localStorage`. Export JSON anytime to back up or move between devices.

---

## Screenshots

| Dashboard | Trade Entry | Analytics |
|---|---|---|
| Equity curve, win rate, P&L by pair/session | 7-step form with auto quality score | 8 charts: pairs, sessions, setups, RR scatter |

---

## Features

- **Pre-trade checklist** — 12-point checklist (liquidity sweep, FVG, rejection candle, news, etc.) with a live score
- **7-step trade entry** — trade info, checklist, entry levels, management, result, psychology, mistake tracker
- **Auto trade quality score** — 0–10 score calculated from 10 criteria, graded Poor / Average / Good / A+
- **Analytics page** — equity curve, P&L by pair, win rate by session, setup performance, RR scatter, mistake frequency
- **Daily / Weekly / Monthly reviews** — auto-populated stats with reflection fields
- **Export / Import** — JSON (full backup) and CSV (for Excel / Google Sheets)
- **Chrome extension** — log trades and run the checklist without leaving your broker tab

---

## Project Structure

```
forex-journal/
├── apps/
│   ├── web/                    # Next.js 14 (App Router)
│   │   ├── app/                # Pages and routes
│   │   ├── components/         # UI components
│   │   └── lib/                # Zustand store, utilities
│   └── extension/              # Chrome extension (Vite + React)
│       ├── src/popup.tsx       # Extension popup (3 tabs)
│       ├── src/storage.ts      # localStorage helpers
│       └── manifest.json       # Manifest V3
└── packages/
    └── shared/                 # TypeScript types + utilities
        └── src/
            ├── types/          # Trade, Review, Checklist types
            └── utils/          # Score calculator, stats, CSV export
```

---

## Prerequisites

- **Node.js** ≥ 18 ([nodejs.org](https://nodejs.org))
- **pnpm** ≥ 8

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-username/forex-journal.git
cd forex-journal
pnpm install
```

### 2. Run the web app

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Build and load the Chrome extension

```bash
pnpm build:ext
```

Then load it in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `apps/extension/dist/` folder

The FX Journal icon will appear in your toolbar. Pin it for quick access while trading.

---

## Available Scripts

Run from the repo root:

| Command | Description |
|---|---|
| `pnpm dev:web` | Start Next.js dev server on port 3000 |
| `pnpm build:web` | Production build of the web app |
| `pnpm dev:ext` | Watch mode for the extension (rebuilds on save) |
| `pnpm build:ext` | Production build of the extension |

---

## Deployment

### Web App → Vercel (recommended, free)

**Option A — Vercel CLI:**

```bash
npm install -g vercel
cd apps/web
vercel
```

Follow the prompts. On first deploy, Vercel auto-detects Next.js.

**Option B — Vercel Dashboard:**

1. Push your repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Set the **Root Directory** to `apps/web`
5. Leave all other settings as default
6. Click **Deploy**

Your app will be live at `https://your-project.vercel.app`.

> **Note:** Because all data lives in `localStorage`, each browser/device has its own journal. Use the Export JSON → Import JSON flow to sync between devices or share data with another trader.

---

### Web App → Netlify

```bash
cd apps/web
pnpm build
```

Then drag and drop the `.next/` folder into [netlify.com/drop](https://app.netlify.com/drop), or connect the GitHub repo and set:

- **Base directory:** `apps/web`
- **Build command:** `pnpm build`
- **Publish directory:** `apps/web/.next`

---

### Chrome Extension → Chrome Web Store

1. Build the extension:
   ```bash
   pnpm build:ext
   ```

2. Zip the dist folder:
   ```bash
   cd apps/extension
   zip -r fx-journal-extension.zip dist/
   ```

3. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Click **New item** and upload the zip
5. Fill in the store listing (name, description, screenshots)
6. Submit for review (typically 1–3 business days)

> For personal use or sharing with a small group, you can skip the Web Store and just share the `dist/` folder — anyone can load it unpacked in Developer mode.

---

## Data Flow

```
Chrome Extension
  └─ Log trade → saves to extension localStorage
  └─ Export JSON ──────────────────────────────┐
                                               ↓
Web App (Settings → Import)
  └─ Merges trades by ID (no duplicates)
  └─ Full analytics + reviews available
  └─ Export JSON/CSV for Excel or Google Sheets
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State / persistence | Zustand + localStorage |
| Charts | Recharts |
| Forms | React state (controlled) |
| Extension bundler | Vite 5 + React |
| Monorepo | pnpm workspaces |
| Shared types | `@forex-journal/shared` (local package) |

---

## Trading Strategy Context

The journal is built around this entry model:

1. Identify HTF bias (4H / Daily)
2. Mark liquidity pools (equal highs / lows)
3. Wait for a liquidity sweep
4. Confirm a Fair Value Gap (FVG) forms after the sweep
5. Wait for price to retest the FVG or key S/R level
6. Look for a rejection candle (pin bar, engulfing)
7. Enter after candle close — never mid-candle
8. SL: below/above the sweep wick + buffer
9. TP1: 1:2 · TP2: 1:3 · TP3: 1:5

The quality scoring system (0–10) grades every trade against these criteria automatically.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run type checks: `cd apps/web && npx tsc --noEmit`
5. Open a pull request

Bug reports and feature requests are welcome via GitHub Issues.

---

## License

MIT — free to use, modify, and distribute.
