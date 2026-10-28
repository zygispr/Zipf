# Research: Book Word Frequency Counter

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-28

User-mandated stack: React, Vite, Vitest, atomic component structure. Everything below resolves
the remaining unknowns. Versions were checked against the npm registry on 2026-10-28 and will be
pinned exactly in `package.json` (Constitution, Quality Standards: pinned dependencies).

## R1. Language and toolchain

- **Decision**: TypeScript 6.0.3 (`strict: true`), React 19.3.1, Vite 8.3.5 with
  `@vitejs/plugin-react` 6.1.2, Node 24 LTS for tooling.
- **Rationale**: Static types catch tokenizer/data-shape bugs early (Principle I). TypeScript 7.0
  is the npm `latest`, but `typescript-eslint` 8.72 only supports `<6.1.0`; 6.0.3 keeps the lint
  pipeline fully type-aware.
- **Alternatives considered**: TypeScript 7.0.2 (rejected until typescript-eslint supports it);
  plain JavaScript (rejected: loses type checking required by Principle I).

## R2. Where analysis runs (privacy + responsiveness)

- **Decision**: All parsing and counting runs in the browser inside a dedicated Web Worker. The
  app is a static site with no backend. A production-only Content-Security-Policy with
  `connect-src 'none'` is injected into `index.html` so the page cannot make network requests
  after load. Three layers enforce the privacy promise:
  1. **Page CSP** (`<meta>`): blocks network access from the main thread.
  2. **Code-level ban** (ESLint, enforced in CI): `fetch`, `XMLHttpRequest`, `WebSocket`,
     `EventSource`, `importScripts`, `navigator.sendBeacon`, and storage APIs are banned
     throughout `src/`. This is the guard for the **worker**. A dedicated worker loaded from its
     own same-origin URL gets its CSP from its own HTTP response headers, not from the page's
     `<meta>` tag, and static hosts such as GitHub Pages cannot set headers. So the page CSP does
     **not** cover the worker.
  3. **End-to-end check**: Playwright records every request at the browser-context level, which
     includes worker requests, and fails on any request after load (SC-006).
- **Rationale**: Meets FR-004/SC-006 by construction (the book never leaves the device) and
  keeps the UI thread free for animations and the cancel button (FR-024, SC-005). Cancelling is
  `worker.terminate()`, which also discards all book data held by the worker. Together, the three
  layers make the privacy promise enforced, not just intended. No single layer is relied on:
  the CSP alone misses the worker, and the lint rule alone misses third-party code.
- **Future hardening**: if the app moves to a host that can set response headers, also send
  `Content-Security-Policy: connect-src 'none'` as a header, which then covers the worker too.
- **Alternatives considered**: Main-thread processing in chunks (rejected: harder to cancel,
  janks animations on 50 MB inputs); server-side processing (rejected: violates FR-004);
  Comlink for worker RPC (rejected: a single request/response message pair does not need an RPC
  library; see Principle II).

## R3. Reading .txt files

- **Decision**: Read the `File` as an `ArrayBuffer` in the worker and decode with
  `TextDecoder('utf-8', { fatal: true })`, stripping a BOM. If UTF-8 decoding throws, fall back to
  `windows-1252`. UTF-16 is detected from its BOM.
- **Rationale**: Covers Project Gutenberg and most exported text files (UTF-8) plus legacy
  Western files, with zero dependencies.
- **Alternatives considered**: Charset-detection libraries such as `jschardet` (rejected: large,
  heuristic, and not needed for the common cases).

## R4. Reading .epub files

- **Decision**: Unzip with `fflate` 0.8.3 (`unzipSync`) in the worker. Locate the package
  document via `META-INF/container.xml`, read the OPF manifest and spine, and extract text from
  each spine item (XHTML) in reading order. Text extraction uses a small, tested XHTML-to-text
  function: drop `<head>`, `<script>`, `<style>`; replace tags with spaces; decode HTML entities
  (named + numeric). Only spine items count, so metadata, navigation-only files, and markup are
  excluded (FR-002).
- **DRM detection**: If `META-INF/encryption.xml` lists encrypted resources other than the IDPF
  or Adobe font-obfuscation algorithms, report `protected` (spec edge case).
- **Zip-bomb guard** (constitution Security: validate external input): the 50 MB limit (FR-003)
  only bounds the *compressed* file. `unzipSync` is called with a `filter` callback, which
  `fflate` runs for each entry **before** inflating it. The callback adds up each entry's
  declared `originalSize` and rejects the book as `corrupted` once the total exceeds
  `MAX_UNCOMPRESSED_BYTES` = 200 MB, which is about 30 times the uncompressed text of a very
  long novel. It also skips entries that are never read (images, fonts, audio), which saves
  memory on illustrated books. A falsely small `originalSize` can't get around the limit:
  `unzipSync` in `fflate` 0.8 inflates each entry into a buffer allocated at its declared size,
  so memory use is limited by the declared sizes the guard already checked. A lying entry just
  produces cut-off (garbled) text, never unbounded memory. Add a fixture with a false
  `originalSize` to T029 if implementation shows otherwise.
- **Spine filtering**: only spine items with media type `application/xhtml+xml` or `text/html`
  are read, so SVG or image spine items never become counted text.
- **Rationale**: `fflate` is ~8 KB gzipped, fast, has no dependencies, and works in workers.
  `DOMParser` is not available inside Web Workers, and EPUB content is well-formed XHTML, so a
  focused text extractor is simpler than shipping an XML parser.
- **Alternatives considered**: `epub.js` (rejected: rendering-oriented, large, main-thread DOM
  dependency); `JSZip` (rejected: larger and async-only with no benefit here); sending XHTML back
  to the main thread for `DOMParser` (rejected: blocks the UI and doubles memory transfer).

## R5. Tokenization and counting rules

- **Decision**: One Unicode-aware regular expression,
  `/\p{L}[\p{L}\p{M}]*(?:['’\-‐][\p{L}\p{M}]+)*/gu`, followed by one shared
  `normalizeWord()`: `normalize('NFC')`, `toLowerCase()`, then **unify punctuation variants**
  inside words, so the curly apostrophe `’` (U+2019) becomes `'` and the Unicode hyphen `‐`
  (U+2010) becomes `-`. Books often mix typographic and plain apostrophes, and without this
  "don’t" and "don't" would be counted as two different words (SC-002). The same
  `normalizeWord` is used for stop-word lookup and search, so all three agree. Counts go in a
  `Map<string, number>`. Sorted by count
  descending, then word ascending using `localeCompare` with a fixed `'en'` collator (FR-007).
- **Rationale**: Implements FR-008 (case-insensitive, punctuation ignored), FR-009 (hyphens and
  apostrophes kept inside words, numbers excluded because digits are not `\p{L}`), and FR-010
  (any alphabet, combining marks kept). A single pass over a 100k-word novel takes milliseconds;
  a 5M-word file stays well under a second.
- **Alternatives considered**: `Intl.Segmenter` word granularity (rejected: splits contractions
  inconsistently across engines and is several times slower); stemming or lemmatization
  (rejected: out of scope per spec assumptions).

## R6. Common words (stop words) and language

- **Decision**: Bundle one English stop-word list (~180 words) as a TypeScript constant. The
  "Hide common words" toggle is enabled when the text looks English: at least 20% of total
  tokens are in the list. Otherwise the toggle is disabled with the explanation "Common-word
  filtering is available for English books". Off by default (FR-019).
- **Rationale**: Satisfies the spec assumption ("at least English; other languages may be
  unavailable") with a cheap, testable heuristic. Typical English prose has 40–55% stop-word
  tokens; other languages fall well below 20%.
- **Alternatives considered**: Language-detection libraries such as `franc` (rejected: extra
  dependency for one boolean); multilingual stop-word packages (rejected: not required in v1).

## R7. Visualizations

- **Decision**: Hand-built SVG components in React, using `d3-scale` 4.0.2 for linear/log
  scales and `d3-cloud` 1.2.9 for word-cloud layout. Animations use `motion` 14.7.1
  (`motion/react`): `AnimatePresence` for switching views, layout animations for bars when
  top-N or filters change, and `MotionConfig reducedMotion="user"` for FR-017.
  - **Bar chart**: horizontal bars for the top N words, animated width and reorder.
  - **Word cloud**: `d3-cloud` layout computed for the top N (max 100) words; font size from a
    square-root scale of count; words fade and scale in with staggered delays.
  - **Zipf chart**: log–log scatter of rank vs. count plus the ideal curve
    `count(r) = count(1) / r` (spec assumption). To keep SVG fast for 20k–50k distinct words,
    plot all of the first 100 ranks, then logarithmically spaced ranks, up to 1,000 points. On a
    log axis this is visually the same as plotting every point.
- **Rationale**: Three visualizations with custom colorful styling and coordinated animation are
  easier to control with direct SVG than to bend a chart library's defaults. The dependencies
  are small and single-purpose (Principle II). `motion` provides spring animations, exit
  animations, and reduced-motion support that CSS alone cannot do for view switches.
- **Alternatives considered**: Recharts or visx (rejected: still needs `d3-cloud`, styling and
  animation are harder to unify, larger bundle); Canvas rendering (rejected: worse
  accessibility; SVG is fast enough after downsampling); pure CSS transitions (rejected: no
  exit animations or shared layout transitions).

## R8. Styling and colorful design

- **Decision**: CSS Modules plus global design tokens (CSS custom properties) for a vibrant
  palette: gradient background, categorical colors for chart elements, light and dark themes
  via `prefers-color-scheme`. System font stack; no web fonts loaded from the network. All text
  and chart colors must reach WCAG 2.2 AA contrast (4.5:1 text, 3:1 graphics).
- **Rationale**: Vite supports CSS Modules natively, so no extra dependency. Loading no external
  fonts or assets is consistent with the `connect-src 'none'` privacy posture.
- **Alternatives considered**: Tailwind CSS (rejected: adds a build dependency and conventions
  the atomic design layer already provides); CSS-in-JS (rejected: runtime cost).

## R9. Component architecture (atomic design)

- **Decision**: `src/components/{atoms,molecules,organisms,templates,pages}`. Each component
  lives in its own folder with `Component.tsx`, `Component.module.css`, `Component.test.tsx`, and
  an `index.ts`. Pure logic stays out of components in `src/lib/`. Worker code is in
  `src/worker/`. State management is decided in R14. Levels may only import from lower levels
  (atoms ← molecules ← organisms ← templates ← pages), enforced by an ESLint
  `no-restricted-imports` rule per folder.
- **Rationale**: User-mandated pattern. Import rules keep it honest. Separating `lib/` keeps the
  most important logic testable without React.

## R10. Testing strategy

- **Decision**:
  - **Unit (Vitest 5.0.5, Node environment)**: tokenizer, counter, sorting/ties, stop-word
    heuristic, text decoding, EPUB extraction (fixture EPUBs, including a DRM one), XHTML-to-text,
    Zipf sampling, CSV serialization.
  - **Component (Vitest + jsdom 30.1.3 + Testing Library 16.3.3 + user-event 14.6.8 +
    jest-dom 7.0.1)**: every atom, molecule, and organism; keyboard and ARIA behavior.
  - **Contract/integration (Vitest)**: the worker message protocol (`contracts/worker-messages.md`)
    tested by calling `handleAnalyze` directly. It lives in `src/worker/handleAnalyze.ts`, a
    pure module with no `self` access, so Node can import it, while `analysis.worker.ts` is a
    two-line `onmessage` entry point. The `useAnalysis` hook is also tested with a fake worker.
  - **End-to-end (Playwright 1.64.1, Chromium + WebKit mobile viewport)**: upload `.txt` and
    `.epub` fixtures, switch views, filter, search, export; assert **zero network requests
    after page load** (SC-006); run `@axe-core/playwright` 4.14.0 accessibility scans on each
    screen state (Principle IV); tap tooltips in the mobile WebKit project (FR-015). A 51 MB
    upload is written to a temporary file and passed by path, because Playwright rejects
    in-memory files over 50 MB.
  - **Performance (blocks merge, Principle V)**: (a) `tests/perf/analyze.perf.test.ts`, a plain
    Vitest test (`vitest bench` cannot fail on a budget) that takes the median of 5 timed runs of
    analyzing 1M generated words, budget 400 ms locally and 800 ms on CI (`PERF_BUDGET_MS`).
    (b) Playwright `@perf` tests: time to results for 100k words (SC-001), Cancel
    responsiveness (SC-005), Core Web Vitals (LCP, CLS, interaction duration as an INP proxy),
    and an animation frame budget (no frame > 50 ms, median ≤ 20 ms) while switching views.
    Budgets are multiplied by `PERF_BUDGET_SCALE` (1.5 on CI).
  - **Flakiness control** (Principle III): performance tests run in a **separate CI job**, so
    timing noise never hides functional results. CI retries failed Playwright tests twice, and
    tests that pass only on retry are reported as flaky so they can be fixed or quarantined within
    a day.
  - **Coverage**: `@vitest/coverage-v8` 5.0.5 with thresholds of 80% lines (90% for `src/lib/`)
    enforced in CI.
- **Rationale**: Covers Principle III, including contract tests for the only inter-component
  boundary (main thread ↔ worker), and gives Principle V a performance test that blocks merges.
- **Alternatives considered**: Vitest browser mode instead of Playwright (rejected: the network
  assertion and real file uploads are simpler with Playwright's page APIs); happy-dom (rejected:
  jsdom is more complete for SVG and accessibility queries).

## R11. Code quality tooling

- **Decision**: ESLint 10.13.0 flat config with `typescript-eslint` 8.72.1 (type-checked
  rules), `eslint-plugin-react-hooks` 7.1.1, and `eslint-plugin-jsx-a11y` 6.10.2. Prettier 3.9.10.
  `tsc --noEmit` type checking. One `npm run check` script runs format check, lint, type check,
  and tests; CI runs it on every push.
- **Rationale**: Principle I quality gate; jsx-a11y supports Principle IV.

## R12. Results list size and export

- **Decision**: The ranked word table shows 50 rows per page with Previous/Next pagination and
  search. CSV export follows RFC 4180 with a UTF-8 BOM (so Excel shows non-Latin text correctly),
  is generated as a `Blob`, and is downloaded via an object URL. The filename is
  `<book-name>-word-frequencies.csv`.
- **Rationale**: Pagination keeps the DOM small for 50k-word vocabularies without a
  virtualization dependency (Principles II, V, VI). The BOM avoids broken characters in common
  spreadsheet apps.
- **Alternatives considered**: Virtualized list (`react-window`) (rejected: pagination is simpler
  and meets the need); XLSX export (rejected: CSV is "spreadsheet-compatible" per FR-022 and needs
  no library).

## R13. Hosting and deployment

- **Decision**: Static build (`vite build`) that can be deployed to any static host. GitHub
  Pages through a GitHub Actions workflow is the default. No server code.
- **Rationale**: No backend is needed, and a static CDN covers the scalability principle by
  default because every visitor's device does its own computing.
- **Alternatives considered**: A Node server (rejected: no server-side responsibilities).

## R14. State management

**What state exists** (inventory from the spec and data model):

| State | Size / change rate | Who reads it | Who writes it |
|-------|--------------------|--------------|---------------|
| Analysis status (`idle` / `processing` / `results` / `error`) | Tiny; changes a few times per book | `HomePage` | Worker lifecycle |
| Progress fraction | Tiny; ≤ 20 updates/s while processing | `ProcessingPanel` | Worker |
| `FrequencyResult` | Up to ~50k tuples; written once per book, then immutable | Stats, charts, table, search, export | Worker |
| View settings: `visualization`, `topN`, `hideCommonWords` | Tiny; changes on a click | Toolbar, charts, table, export | Toolbar |
| Search query, table page, hovered word | Tiny; changes per keystroke / hover | Only the component that owns it | Same component |

No state is persisted, shared between pages (there is one page), synchronized with a server, or
undoable. The only async source is one worker per analysis.

- **Decision**: **No state library and no Context.** Use React's built-in `useReducer`:
  - `useAnalysis()` in `src/hooks/` holds the analysis state machine (data-model.md) as a pure
    reducer plus the worker lifecycle (create, listen, `terminate()` on cancel, reset, and
    unmount). It returns `{ state, selectFile, cancel, reset }`.
  - View settings (`visualization`, `topN`, `hideCommonWords`) are a second small reducer owned
    by `HomePage`. `selectView(result, settings)` is memoized with `useMemo`, so the
    expensive derivation (filtering/re-ranking up to 50k entries) only re-runs when the result
    or a setting changes.
  - **Ephemeral UI state stays local**: `SearchBox` owns its query, `WordTable` owns its page and
    is remounted with `key={hideCommonWords}` so it goes back to page 1 when the filter changes,
    and each chart owns its hovered word. Typing in search or paging the table re-renders only
    that component, never the charts.
  - **Data flow**: `HomePage` passes props to organisms through template **slots**
    (`ResultsLayout` takes `stats`, `toolbar`, `visualization`, `table`, `search` as `ReactNode`
    props). Data therefore crosses at most two component levels (page → organism → molecule),
    and organisms stay pure and testable with plain props.
  - Heavy organisms (`BarChart`, `WordCloud`, `ZipfChart`, `WordTable`) are wrapped in `memo`.
- **Rationale**:
  - The state is one linear flow on one page with one writer per piece. A reducer models the
    state machine exactly, and its transitions are unit-testable as a pure function
    (Principle III).
  - Template slots remove prop drilling, which is the usual reason to reach for Context or a
    store, so a library would add a dependency and a second way of doing things without solving
    a problem the app has (Principle II).
  - Performance is handled by keeping fast-changing state local and memoizing the one expensive
    derivation. Context would make this worse (every consumer re-renders when the value changes)
    unless split and memoized carefully (Principle V).
  - Explicit props match atomic design, where lower levels are presentational and only pages
    connect to data.
- **Alternatives considered**:
  - **React Context + `useReducer`**: rejected. No drilling problem to solve given slots. It
    hides data dependencies from organisms, makes them harder to test in isolation, and
    re-renders all consumers on each change unless state is split across several contexts.
  - **Zustand 5.0.16** (~1 KB gzipped): the best library option, with selector-based
    subscriptions, a store outside React that is easy to test, and a natural home for worker
    actions. Rejected for v1 because nothing here needs cross-tree subscriptions. It is the
    chosen upgrade path (see trigger below).
  - **Redux Toolkit 2.x**: rejected. Built for large, multi-team apps with many slices,
    middleware, and devtools-driven debugging. Here that would mean slices, a store provider, and
    action boilerplate for about five fields. The large immutable result also gains nothing from
    Redux serialization checks.
  - **Jotai 2.13 / signals**: rejected. Fine-grained atoms solve frequent-update fan-out, which
    this app avoids by keeping fast state local.
- **Revisit trigger**: switch to Zustand (not Context) if any of these become true: a second page
  or route needs shared state; data has to cross more than two component levels; or profiling
  shows avoidable re-renders that memoization can't fix. Because the reducers are pure
  functions, moving them into a Zustand store is mechanical.

## Considered and deferred

- Stripping Project Gutenberg license headers/footers: not required by the spec; may be a
  future enhancement.
- PDF and other formats: out of scope per spec.
