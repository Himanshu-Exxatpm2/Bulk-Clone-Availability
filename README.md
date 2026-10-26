# Exxat One — New UI Shell + Bulk Clone Availabilities

The design team's new UI shell (login → choose products → Site Portal) with the Bulk Clone
Availabilities feature rebuilt inside it. This is a separate project from `exxat-one-base`
(localhost:5173), which is untouched.

## Run

```bash
cd design-system/exxat-one-shell-bulk-clone
npm install
npm run dev
```

Opens on http://localhost:5176 (fixed port, so it can run alongside `exxat-one-base` on 5173).

## Walkthrough

1. Log in with any username or email, then pick a product and a site.
2. Sidebar: **Availability Management → Availability**.
3. Tick 2 or more rows (cap: 25; an advisory appears from 15) and click **Clone N Availabilities**.
   A single row uses the **Clone** icon on its row.
4. Wizard: Naming → Dates → Review → Publish → progress → summary.

## What is in it

- Availability list in the shell's page pattern: tabs (All / Upcoming / Current / Completed), multi-select
  filters, search, selection toolbar, single-row clone.
- Selection cap of 25 with a dismissible advisory at 15 or more.
- Step 1: single-input `@` mention template (`@location`, `@discipline`,
  `@program_type`, `@experience_type`), live preview, `#2`/`#3` suffixes for duplicates, Duplicate Check column.
- Step 2: **Roll Forward** by 3 months, 6 months or 1 year, or **Custom Date** (one start and end date applied to every availability), with per-row edits either way.
- Step 3: review table with a sticky remove column and horizontal scroll.
- Step 4: publish preference — same for all, or default plus per-availability overrides with rotation dates shown.
- Progress screen with field-level draft reasons, then a summary.
- Pre-validation interstitial for flagged availabilities.

## Where things live

- `src/app/components/availability/` — list page, table, publish preference card, wizard (`BulkCloneWizard/`)
- `src/app/data/mockAvailabilities.ts` — mock data
- `src/app/routes.tsx` — the `availability/*` route replaces the shell's placeholder page
- Everything else is the design team's shell, unchanged except one added icon (`circleCheck`).

Styling uses the shell's tokens (Inter, `exxat-tokens.css`, neutral/blue ramps, `bg-card` cards) and its `ui/` components.

## Live version (GitHub Pages)

Built with `VITE_HASH_ROUTER=1 npx vite build --base=/Bulk-Clone-Availability/` and published to the `gh-pages` branch. The hosted build uses hash URLs (`#/site/…`) because Pages can't serve deep links; local dev (`npm run dev`) keeps normal URLs.
