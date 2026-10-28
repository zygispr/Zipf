# Zipf

Drop in a book and see which words it uses most. Zipf counts every word in a `.txt` or `.epub`
file and shows the results as a bar chart, a word cloud, and a
[Zipf's law](https://en.wikipedia.org/wiki/Zipf%27s_law) chart, along with a searchable
table you can download as CSV.

## Your book stays on your device

Zipf has no server. The book is read and counted in a Web Worker in your browser, and nothing
about it is uploaded, stored, or sent anywhere. Reloading the page or choosing another book
discards it.

This is enforced, not just promised:

- The production build sets a Content-Security-Policy with `connect-src 'none'`, so the page
  can't make network requests after it loads.
- ESLint bans network and storage APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`,
  `indexedDB`, …) everywhere in `src/`, including the worker.
- An end-to-end test uses every feature and fails if any network request is made after page
  load.

## Features

- **Formats**: plain text (`.txt`, UTF-8, UTF-16, or Windows-1252) and DRM-free EPUB, up to 50 MB.
  For EPUBs, only the book's body text is counted, not its markup or metadata.
- **Counting**: case-insensitive; contractions (`don't`) and hyphenated words (`well-known`) count
  as one word; numbers are ignored; accented and non-Latin words are supported.
- **Visualizations**: animated bar chart, word cloud, and log–log Zipf chart with the ideal curve.
  Hover, focus, or tap any word for its count, rank, and percentage.
- **Refine**: show the top 10, 25, 50, or 100 words; hide common English words; search for any
  word.
- **Export**: download the full ranked list as a spreadsheet-ready CSV
  ([format](specs/001-book-word-frequency/contracts/csv-export.md)).
- **Accessible**: built to WCAG 2.2 AA and checked with axe; works with the keyboard alone,
  follows your reduced-motion setting, and fits screens from 320 px wide.

## Getting started

Requires Node.js 24 LTS and npm 11.

```bash
npm ci               # install the exact pinned dependencies
npm run dev          # dev server at http://localhost:5173
npm run build        # production build to dist/ (adds the CSP)
npm run preview      # serve dist/ at http://localhost:4173
```

## Quality gates

All of these run in CI and must pass before merge.

```bash
npm run check          # format check, lint, type check, unit/component/contract tests
npm run test:coverage  # fails below 80% line coverage overall, or 90% in src/lib
npm run bench          # fails if analyzing 1M words takes over 400 ms (median of 5)
npm run size           # after a build: fails if initial JS is over 150 KB gzipped
npm run test:e2e       # Playwright: flows, privacy, accessibility (Chromium + iPhone WebKit)
npm run test:e2e:perf  # Playwright @perf: time to results, Core Web Vitals, frame budget
```

The end-to-end suites need the Playwright browsers once: `npx playwright install chromium webkit`.
`PERF_BUDGET_MS` and `PERF_BUDGET_SCALE` loosen the timing budgets on slower machines; CI uses
800 ms and 1.5×.

## Project structure

```text
src/
├── components/     # atomic design; a level imports only from the levels below it (ESLint-enforced)
│   ├── atoms/      # Button, Icon, Toggle, TextInput, SegmentedControl, Tooltip, …
│   ├── molecules/  # FileDropZone, SearchBox, StatCard, ErrorMessage, Pagination, …
│   ├── organisms/  # UploadPanel, ResultsToolbar, BarChart, WordCloud, ZipfChart, WordTable, …
│   ├── templates/  # AppLayout, ResultsLayout (layout only, no data)
│   └── pages/      # HomePage, the only component connected to app state
├── hooks/          # useAnalysis (worker + state machine), useViewSettings, …
├── lib/            # pure logic: tokenizing, counting, EPUB reading, CSV, search
├── worker/         # the analysis Web Worker and its message protocol
└── styles/         # design tokens and global CSS
tests/
├── contract/       # worker message protocol
├── e2e/            # Playwright suites
├── perf/           # benchmark
└── fixtures/       # books with hand-verified counts, broken and DRM EPUBs, …
```

Components below `pages/` get data only through props, with no Context or global store. Pure
logic lives in `src/lib/`, with a test next to each module.

## Deployment

Pushing to `main` builds the site and deploys it to GitHub Pages
([deploy.yml](.github/workflows/deploy.yml)). The build is served from `/<repo>/`, set through
the `BASE_PATH` environment variable (`/` by default). In the repository settings, set
**Pages → Source** to **GitHub Actions**.

## Design documents

The specification, plan, research decisions, data model, contracts, and task list are in
[specs/001-book-word-frequency/](specs/001-book-word-frequency/).
