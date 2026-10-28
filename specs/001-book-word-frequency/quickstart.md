# Quickstart & Validation: Book Word Frequency Counter

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to run the app and check, end to end, that the feature works. It references the
[data model](./data-model.md) and [contracts](./contracts/) rather than repeating them.

## Prerequisites

- Node.js 24 LTS and npm 11
- Playwright browsers for the end-to-end suite: `npx playwright install chromium webkit`

## Setup and run

```bash
npm ci               # install exact pinned dependencies
npm run dev          # start the dev server at http://localhost:5173
npm run build        # production build to dist/ (adds the CSP meta tag)
npm run preview      # serve dist/ at http://localhost:4173
```

## Quality gates (all must pass before merge)

```bash
npm run check        # format check + lint + type check + unit/component/contract tests
npm run test:coverage  # fails below 80% lines overall or 90% in src/lib
npm run bench        # fails if the median of 5 runs analyzing 1M words exceeds 400 ms
                     # (PERF_BUDGET_MS overrides it; CI uses 800)
npm run test:e2e     # Playwright functional, privacy and a11y suites against the preview build
npm run test:e2e:perf  # @perf suite: time to results, Core Web Vitals, frame budget
                       # (PERF_BUDGET_SCALE multiplies budgets; CI uses 1.5)
```

## Test fixtures (`tests/fixtures/`)

| Fixture                 | Purpose                                                        |
|-------------------------|----------------------------------------------------------------|
| `known-counts.txt`      | Short text with hand-verified counts (case, punctuation, hyphens, contractions, numbers, accents) plus `known-counts.json` |
| `known-counts.epub`     | Same text as an EPUB with metadata, nav, and CSS that must not be counted |
| `generateZipfText(100_000)` | Generated in tests (`tests/fixtures/generateText.ts`): ~100k words of deterministic Zipf-distributed prose for timing (SC-001) |
| `cyrillic.txt`          | Non-Latin text; common-word toggle must be disabled            |
| `empty.txt`, `numbers-only.txt` | `empty` error                                          |
| `corrupted.epub`        | Truncated zip → `corrupted` error                              |
| `zip-bomb.epub`         | Under 1 MB compressed, 210 MB declared uncompressed → `corrupted`, rejected before inflating |
| `drm.epub`              | Has `META-INF/encryption.xml` with encrypted content → `protected` |
| `big.txt` (written to a temp file in the test, 51 MB) | `too-large` error. Passed to Playwright by path, since buffers over 50 MB are rejected |

## Validation scenarios

Each one maps to spec acceptance scenarios. The e2e suite automates them; they can also be run
by hand against `npm run preview`.

1. **Counts are correct (US1, SC-002)**: upload `known-counts.txt`. The table and summary
   exactly match `known-counts.json`. "The/the/THE" make one entry, "don't" and "well-known" are
   single words, and "1984" is missing. Repeat with `known-counts.epub` for identical results.
2. **Privacy (FR-004, SC-006)**: with network logging on, load the page, then upload a book and
   use every feature. **Zero requests** after the initial page load. Reload, and the upload
   screen appears with no previous results.
3. **Speed and responsiveness (SC-001, SC-005)**: upload a 100k-word generated text. Results appear in
   ≤ 3 s on desktop (and ≤ 6 s with 4× CPU throttling as the phone proxy). The Cancel button
   responds while processing.
4. **Visualizations (US2)**: the bar chart animates in with 25 bars matching the table. Switch
   to word cloud and Zipf chart: the transitions are animated, the Zipf chart shows points, the
   ideal curve, and a legend. Hovering or focusing a word shows word, count, rank, and percent.
5. **Reduced motion (FR-017)**: with the OS or emulated `prefers-reduced-motion: reduce`,
   repeat scenario 4. Views change instantly and nothing keeps animating.
6. **Refine (US3)**: turn on "Hide common words", and "the" disappears and ranks are
   recalculated. Set top-N to 10/50/100. Search "don't" → count and rank; search "zzz" → "not
   found". With `cyrillic.txt`, the toggle is disabled with an explanation.
7. **Export (US4)**: download the CSV. It follows [csv-export.md](./contracts/csv-export.md) and
   matches the table for the current filter.
8. **Errors (FR-025)**: upload each error fixture plus a `.pdf`. Each shows the message from
   the data-model error table and a "Choose another book" action.
9. **Replace a book (edge case, FR-001)**: while a large book is processing, drop a second book
   anywhere on the page. A "Drop your book" overlay appears, and only the second book's results
   appear. Repeat with the processing panel's "Choose a different book" button, and by dropping a
   book onto the results screen.
10. **Accessibility and layout (FR-018)**: do scenarios 1, 4, and 6 using only the keyboard.
    At 320 px width there's no horizontal scroll. Automated axe check: no serious or critical
    violations.
