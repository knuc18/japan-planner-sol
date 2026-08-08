# Japan, By Days

A static, editorial Japan trip planner for first-time independent travelers from Manila. Choose 3–30 days, travel pace, month, budget, interests, and willingness to drive; the site returns a connected route, daily morning/afternoon/evening plan, transport guidance, and JPY/PHP cost range.

Live site: [knuc18.github.io/japan-planner-sol](https://knuc18.github.io/japan-planner-sol/)

## Local development

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The production preview is served under `/japan-planner-sol/` to match GitHub Pages.

## How planning works

- React + TypeScript + Vite; no backend, accounts, cookies, analytics, or runtime APIs.
- A pure rules engine scores curated route corridors, regions, seasons, and activities, then allocates up to seven distinct days per base.
- Costs are per person for a traveler using a private room and include indicative Manila airfare, lodging, food, activities, and domestic transport.
- Shopping, insurance, visas, and disruption costs are excluded. All fares are planning ranges and must be verified before booking.

## Data notes

- Transport guidance: [Japan National Tourism Organization](https://www.japan.travel/en/plan/getting-around/)
- Rail pass pricing and conditions: [official Japan Rail Pass site](https://japanrailpass.net/en/purchase/price/)
- JPY/PHP reference: [Bangko Sentral ng Pilipinas](https://www.bsp.gov.ph/SitePages/Statistics/exchangerate.aspx), ¥1 = ₱0.3839, dated 2026-06-08

Destination content and costs are curated planning data stored locally in `src/data.ts`. The four editorial images are original generated assets bundled under `public/images/`.

This public repository does not include an open-source license.
