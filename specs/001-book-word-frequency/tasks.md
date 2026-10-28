---

description: "Task list for the Book Word Frequency Counter"
---

# Tasks: Book Word Frequency Counter

**Input**: Design documents from `/specs/001-book-word-frequency/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution Principle III (NON-NEGOTIABLE) requires automated tests for every
user-facing behavior, and plan R10 defines the test layers. In every story, write the test tasks
first and confirm they FAIL before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and
demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1–US4)
- Paths are relative to the repository root (single frontend project, see plan.md)

## Conventions that apply to every task

- Each component lives in `src/components/<level>/<Name>/` with `Name.tsx`, `Name.module.css`,
  `Name.test.tsx`, and `index.ts` ([ui-components.md](./contracts/ui-components.md)). "Create
  component X" means all four files, with the test written first.
- Components below `pages/` receive data only through props. No Context, no global store
  (research R14).
- Pure logic goes in `src/lib/` with a colocated `*.test.ts`.
- Styles use tokens from `src/styles/tokens.css`. Every animated element must respect reduced
  motion (`MotionConfig reducedMotion="user"` for `motion`, and a
  `@media (prefers-reduced-motion: reduce)` block for CSS animations).
- `npm run check` must pass before a task is marked done.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, toolchain, and quality gates

- [X] T001 Create `package.json` (`"type": "module"`, `"private": true`, `"engines": { "node": ">=24" }`) with exact pinned versions from research R1/R4/R7/R10/R11: runtime `react` 19.3.1, `react-dom` 19.3.1, `motion` 14.7.1, `d3-scale` 4.0.2, `d3-cloud` 1.2.9, `fflate` 0.8.3; dev `typescript` 6.0.3, `vite` 8.3.5, `@vitejs/plugin-react` 6.1.2, `vitest` 5.0.5, `@vitest/coverage-v8` 5.0.5, `jsdom` 30.1.3, `@testing-library/react` 16.3.3, `@testing-library/dom` (latest 10.x, exact), `@testing-library/user-event` 14.6.8, `@testing-library/jest-dom` 7.0.1, `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0, `eslint` 10.13.0, `typescript-eslint` 8.72.1, `eslint-plugin-react-hooks` 7.1.1, `eslint-plugin-jsx-a11y` 6.10.2, `prettier` 3.9.10, plus exact `@types/react`, `@types/react-dom`, `@types/d3-scale` 4.0.9, `@types/d3-cloud` 1.2.9, `@types/node`. Add scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `format`, `format:check`, `lint`, `typecheck` (`tsc -b --noEmit`), `test` (`vitest run --project unit --project dom`), `test:watch` (`vitest --project unit --project dom`), `test:coverage` (`vitest run --coverage --project unit --project dom`), `bench` (`vitest run --project perf`), `test:e2e` (`playwright test --grep-invert @perf`), `test:e2e:perf` (`playwright test --grep @perf --project chromium`), `check` (format:check && lint && typecheck && test). Run `npm install` to create `package-lock.json`
- [X] T002 [P] Create `tsconfig.json` (project references), `tsconfig.app.json` (`strict: true`, `noUncheckedIndexedAccess: true`, `jsx: "react-jsx"`, `lib: ["ES2023", "DOM", "DOM.Iterable", "WebWorker"]`, `types: ["vite/client", "@testing-library/jest-dom/vitest"]`, include `src`, `tests`) and `tsconfig.node.json` (config files: `vite.config.ts`, `playwright.config.ts`, `eslint.config.js`)
- [X] T003 [P] Create `vite.config.ts` with `@vitejs/plugin-react`, `worker: { format: 'es' }`, and Vitest config using `test.projects`: project `unit` (environment `node`, includes `src/lib/**/*.test.ts`, `src/worker/**/*.test.ts`, `tests/contract/**/*.test.ts`, excludes `src/lib/download.test.ts`), project `dom` (environment `jsdom`, includes `src/*.test.tsx`, `src/components/**/*.test.tsx`, `src/hooks/**/*.test.ts`, `src/lib/download.test.ts`, setup file `src/test/setup.ts`), and project `perf` (environment `node`, includes `tests/perf/**/*.test.ts`, `testTimeout: 60_000`; run only by `npm run bench`, never by `npm test`); coverage provider `v8` with thresholds `lines: 80` globally and `lines: 90` for `src/lib/**` (Quality Standards, research R10)
- [X] T004 [P] Create `src/test/setup.ts` importing `@testing-library/jest-dom/vitest` and calling `cleanup()` after each test
- [X] T005 [P] Create `eslint.config.js` (flat config): `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with `parserOptions.projectService: true`, `eslint-plugin-react-hooks` recommended, `eslint-plugin-jsx-a11y` recommended, ignores `dist`, `coverage`, `playwright-report`, `test-results`. Add `no-restricted-imports` overrides that enforce the atomic import rule from [ui-components.md](./contracts/ui-components.md): files in `src/components/atoms/**` may not import `**/molecules/**`, `**/organisms/**`, `**/templates/**`, `**/pages/**`; molecules may not import organisms/templates/pages; organisms may not import templates/pages; templates may not import pages. Also ban `createContext`/`useContext` imports from `react` under `src/components/` except `pages/` (research R14). For all of `src/**` (not `tests/**`), add `no-restricted-globals` and `no-restricted-properties` rules that ban `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `navigator.sendBeacon`, and `localStorage`/`sessionStorage`/`indexedDB`, with the message "Book data must never leave the device or be stored (FR-004)". This is the code-level privacy guard; it covers the worker, which the page CSP does not reach (research R2)
- [X] T006 [P] Create `.prettierrc.json` (`singleQuote: true`, `printWidth: 100`, `trailingComma: "all"`) and `.prettierignore` (`dist`, `coverage`, `package-lock.json`, `playwright-report`, `test-results`, `specs`)
- [X] T007 [P] Append to `.gitignore`: `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo`
- [X] T008 [P] Create `playwright.config.ts`: `testDir: 'tests/e2e'`, `webServer` running `npm run build && npm run preview -- --port 4173 --strictPort` at `http://localhost:4173`, projects `chromium` (Desktop Chrome) and `mobile-webkit` (iPhone 13), `use.trace: 'retain-on-failure'`, `retries: process.env.CI ? 2 : 0`, and the `list` + `html` reporters so a test that passes only on retry is reported as **flaky** (constitution III: flaky tests must be fixed or quarantined within one working day)
- [X] T009 [P] Create `.github/workflows/ci.yml` (on push and pull_request, Node 24, `npm ci`) with two required jobs. Job `quality`: `npm run check`, `npm run test:coverage`, `npx playwright install --with-deps chromium webkit`, `npm run test:e2e`, and upload the Playwright report on failure. Job `performance` (separate, so timing noise never hides functional failures): `npm run bench` with `PERF_BUDGET_MS=800`, `npx playwright install --with-deps chromium`, and `npm run test:e2e:perf` with `PERF_BUDGET_SCALE=1.5`. Both jobs block merge (constitution V: budget regressions MUST block merge). CI budgets are looser than local budgets because shared runners are slower and noisier than the reference hardware
- [X] T010 Create `index.html` (lang `en`, viewport meta, `<title>Zipf: Book Word Frequency</title>`, `<div id="root">`, module script `/src/main.tsx`) and `src/main.tsx` (renders `<App />` into `#root` inside `StrictMode`, imports `src/styles/global.css`). Verify `npm run dev`, `npm run build`, and `npm run check` all succeed with a placeholder `src/App.tsx`

**Checkpoint**: Toolchain works, and an empty app builds, lints, type-checks, and runs tests in CI.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, design tokens, base atoms, and the app shell that every story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create `src/lib/types.ts` from [data-model.md](./data-model.md): `BookFormat = 'txt' | 'epub'`; `WordEntry { word: string; count: number; rank: number; percent: number }`; `FrequencyResult { bookName: string; totalWords: number; distinctWords: number; entries: Array<[word: string, count: number]>; isLikelyEnglish: boolean }` (doc comment: "entries sorted count desc, then word asc; rank = index + 1"); `VisualizationType = 'bar' | 'cloud' | 'zipf'`; `TopN = 10 | 25 | 50 | 100`; `ViewSettings { visualization; topN; hideCommonWords }` with exported `DEFAULT_VIEW_SETTINGS = { visualization: 'bar', topN: 25, hideCommonWords: false }`; `AnalysisErrorCode = 'unsupported' | 'too-large' | 'empty' | 'corrupted' | 'protected'`; `MAX_FILE_BYTES = 52_428_800`; `MAX_UNCOMPRESSED_BYTES = 209_715_200` (200 MB total uncompressed EPUB content, research R4)
- [ ] T012 [P] Create `src/lib/errorMessages.ts` mapping each `AnalysisErrorCode` to the exact plain-language messages in the data-model AnalysisError table: `unsupported` → "We can read .txt and .epub books. Please choose one of those."; `too-large` → "This file is larger than 50 MB. Please choose a smaller book."; `empty` → "We couldn't find any readable words in this book."; `corrupted` → "This file couldn't be read. It may be damaged. Try another copy."; `protected` → "This book is copy-protected (DRM), so its text can't be read.". Add `src/lib/errorMessages.test.ts` asserting every code has a message
- [ ] T013 [P] Create `src/worker/messages.ts` with the exact protocol types from [worker-messages.md](./contracts/worker-messages.md): `AnalyzeRequest { type: 'analyze'; file: File; format: BookFormat }`, `ProgressMessage { type: 'progress'; stage: 'reading' | 'extracting' | 'counting'; fraction: number }`, `ResultMessage { type: 'result'; result: FrequencyResult }`, `ErrorMessage { type: 'error'; code: 'empty' | 'corrupted' | 'protected' }`, `WorkerMessage` union, and `Emit = (message: WorkerMessage) => void`
- [ ] T014 [P] Create `src/styles/tokens.css`: CSS custom properties for a vibrant palette (primary/secondary/accent, an 8-color categorical chart palette, background gradient stops), surfaces, text colors, spacing scale, radii, shadows, font stack (system fonts only, research R8), and motion durations/easings. Provide light and dark values via `prefers-color-scheme`. All text tokens must reach ≥ 4.5:1 contrast and chart colors ≥ 3:1 against their surfaces (WCAG 2.2 AA); write the measured ratios in a comment next to each pair
- [ ] T015 [P] Create `src/styles/global.css`: modern reset, `body` background and color from tokens, visible `:focus-visible` ring, `.visually-hidden` utility, and `@media (prefers-reduced-motion: reduce)` that sets `animation-duration`/`transition-duration` to `0.01ms` and `animation-iteration-count: 1` globally
- [ ] T016 [P] Create atom `Button` in `src/components/atoms/Button/` with variants `primary | secondary | ghost`, optional leading `Icon`, a native `<button type="button">` by default, disabled state, and a press animation (`motion.button` `whileTap` scale 0.97). Tests: renders label, fires `onClick`, does not fire when disabled, is reachable with Tab
- [ ] T017 [P] Create atom `Icon` in `src/components/atoms/Icon/` with inline SVGs for `upload`, `book`, `shield`, `alert`, `close`, `chart-bar`, `cloud`, `zipf`, `search`, `download`, `refresh`, `chevron-left`, `chevron-right`. It is `aria-hidden="true"` unless a `label` prop is given (then `role="img"` + `aria-label`). Tests cover both modes
- [ ] T018 [P] Create atom `Heading` in `src/components/atoms/Heading/` (`level: 1 | 2 | 3` renders the matching `<h1>`–`<h3>`, `tabIndex` passthrough for focus management) and atom `Text` in `src/components/atoms/Text/` (variants `body | caption | lead`, `as` prop for `p | span`). Tests check the correct elements and variants
- [ ] T019 Create template `AppLayout` in `src/components/templates/AppLayout/`: animated multi-color gradient background (CSS keyframes, disabled under reduced motion), `<header>` with logo `Icon` + `Heading level={1}` "Zipf", `<main>` slot (`children`), and a `<footer>` with one line of `Text`. Responsive from 320 px with a 16 px gutter and no horizontal scroll. Tests: landmarks `banner`, `main`, `contentinfo` exist and children render in main
- [ ] T020 Replace `src/App.tsx` with `<MotionConfig reducedMotion="user"><AppLayout>{/* HomePage added in US1 */}</AppLayout></MotionConfig>` and add `src/App.test.tsx` (dom project) checking the layout renders

**Checkpoint**: Foundation ready. Types, protocol, tokens, base atoms, and the app shell exist, and user stories can start.

---

## Phase 3: User Story 1 - Upload a book and see its word frequencies (Priority: P1) 🎯 MVP

**Goal**: A user drops or picks a `.txt` or `.epub` book. It's analyzed on their device in a Web
Worker, with progress and cancel, and they see summary stats (total, distinct, top word) and a
paginated ranked table. Invalid files get plain-language errors. Nothing is stored or sent
(FR-001–FR-012, FR-023 for New book, FR-024, FR-025).

**Independent Test**: Upload `tests/fixtures/known-counts.txt`; the table and stats exactly
match `tests/fixtures/known-counts.json`. Upload `known-counts.epub`; same results. Upload each
error fixture and see its message. Zero network requests after page load (quickstart
scenarios 1, 2, 8, 9).

### Fixtures for User Story 1

- [ ] T021 [US1] Create `tests/fixtures/known-counts.txt` (~300 words, UTF-8) covering: "The/the/THE", punctuation-attached words ("end.", "\"Hello,\""), hyphenated ("well-known"), contractions with straight and curly apostrophes ("don't", "it’s"), numbers ("1984", "42") that must not count, accented words ("café", "naïve"), and a few Cyrillic/Greek words. Create `tests/fixtures/known-counts.json` (`{ totalWords, distinctWords, entries: [[word, count], ...] }`) with hand-verified counts sorted by count desc then word asc
- [ ] T022 [US1] Create `tests/fixtures/build-fixtures.ts` (run with `npx tsx` or `node --experimental-strip-types`; documented in a header comment) that uses `fflate.zipSync` to deterministically write: `known-counts.epub` (valid EPUB 3: `mimetype` stored first and uncompressed, `META-INF/container.xml`, `OEBPS/content.opf` with metadata whose words must NOT be counted, a `nav.xhtml` NOT in the spine, a CSS file, and the text of `known-counts.txt` split across two spine XHTML chapters with `<head><title>`, `<style>`, `<script>`, and entities like `&amp;`, `&#8217;`, `&nbsp;`); `drm.epub` (same plus `META-INF/encryption.xml` listing an `EncryptedData` for a chapter with algorithm `http://www.w3.org/2001/04/xmlenc#aes128-cbc`); `font-obfuscated.epub` (encryption.xml with only `http://www.idpf.org/2008/embedding` for a font, which must still be readable); `corrupted.epub` (first 200 bytes of a valid EPUB); `zip-bomb.epub` (a valid EPUB whose single chapter is 210 MB of repeated `<p>a</p>`, DEFLATE level 9, so it compresses to well under 1 MB and is under the 50 MB upload limit). Also write `empty.txt` (0 bytes is rejected by validation, so write a single newline) and `numbers-only.txt` ("1 2 3 1984 42\n"). Commit the generated files
- [ ] T023 [P] [US1] Create `tests/fixtures/generateText.ts` exporting `generateZipfText(wordCount: number, seed = 42): string`, a deterministic seeded generator of English-like prose with Zipf-distributed words from a fixed 5,000-word vocabulary, punctuation, and line breaks. It is used by the benchmark and the speed e2e test in place of a committed 100k-word novel

### Tests for User Story 1 (write first, confirm they FAIL) ⚠️

- [ ] T024 [P] [US1] Write `src/lib/tokenize.test.ts`: lowercases; NFC-normalizes (decomposed "café" equals composed); strips surrounding punctuation; keeps internal apostrophes and hyphens; **unifies variants** so "don't" and "don’t" are the same token (`don't`) and "well-known" and "well‐known" (U+2010) are the same token (`well-known`); `normalizeWord("DON’T")` returns `"don't"`; excludes numbers and digits-only tokens; handles Cyrillic, Greek, and combining marks; returns `[]` for whitespace/punctuation-only input; tokenizes the `known-counts.txt` fixture to exactly the words in `known-counts.json`
- [ ] T025 [P] [US1] Write `src/lib/countWords.test.ts`: `countWords(text, bookName)` returns a `FrequencyResult` whose `entries` are sorted count desc then word asc (ties alphabetical, FR-007); `totalWords === sum(counts)`; `distinctWords === entries.length`; result matches `known-counts.json`; sets `isLikelyEnglish` from `stopWords.ts`
- [ ] T026 [P] [US1] Write `src/lib/stopWords.test.ts`: `ENGLISH_STOP_WORDS` is a `ReadonlySet` with ~180 lowercase entries including "the", "and", "of", "don't"; `isLikelyEnglish(entries, totalWords)` is `true` when stop-word tokens are ≥ 20% of `totalWords`, `false` below (boundary tested at exactly 20%), and `false` for Cyrillic-only text (research R6)
- [ ] T027 [P] [US1] Write `src/lib/decodeText.test.ts`: UTF-8 with and without BOM; UTF-16 LE and BE detected from the BOM; invalid UTF-8 falls back to `windows-1252` (e.g. byte `0xE9` → "é") (research R3)
- [ ] T028 [P] [US1] Write `src/lib/xhtmlToText.test.ts`: removes `<head>…</head>`, `<script>`, `<style>` contents; tags become spaces so `word</p><p>next` stays two words; decodes named (`&amp; &nbsp; &mdash; &rsquo;`), decimal, and hex entities; handles self-closing tags and CDATA
- [ ] T029 [P] [US1] Write `src/lib/epub.test.ts` against T022 fixtures: `extractEpubText(bytes)` returns the spine chapters' text in reading order and excludes OPF metadata, nav, and CSS; throws `EpubError('protected')` for `drm.epub`; succeeds for `font-obfuscated.epub`; throws `EpubError('corrupted')` for `corrupted.epub`, for a zip without `META-INF/container.xml`, for an OPF with a missing spine item, and for `zip-bomb.epub` **before** decompressing it (assert it rejects in < 500 ms, far less than inflating 210 MB takes). Also unit-test the pure guard `assertUncompressedSizeWithin(entries, limit)` directly: totals at the limit pass, and totals one byte over throw `corrupted`; spine items whose manifest `media-type` is not `application/xhtml+xml` or `text/html` are skipped
- [ ] T030 [P] [US1] Write `src/lib/validateFile.test.ts`: `validateFile({ name, size })` returns `{ ok: true, format }` for `.txt`/`.TXT`/`.epub`; `{ ok: false, code: 'unsupported' }` for `.pdf`, `.docx`, no extension; `{ ok: false, code: 'too-large' }` for size `52_428_801`; accepts size exactly `52_428_800`; rule "size MUST be > 0 and ≤ 52,428,800 (50 MB) (FR-003)", so size 0 → `{ ok: false, code: 'empty' }`
- [ ] T031 [P] [US1] Write `src/lib/selectView.test.ts` (US1 scope): `selectView(result, DEFAULT_VIEW_SETTINGS).entries` maps tuples to `WordEntry` with `rank = index + 1` and `percent = count / totalWords × 100`; `formatPercent(percent)` returns a 2-decimal string ("5.12")
- [ ] T032 [P] [US1] Write `tests/contract/worker-messages.test.ts` calling `handleAnalyze(request, emit)` imported from `src/worker/handleAnalyze.ts` (a pure module with no `self` access, so it loads in Node) with `File` objects built from fixtures, and asserting every guarantee in [worker-messages.md](./contracts/worker-messages.md): (1) zero or more `progress` then exactly one `result` or `error`, nothing after; (2) `fraction` never decreases and is within 0..1; (3) entries sorted and `totalWords === sum(counts)`; (5) a forced internal exception (mocked `decodeText` throwing) yields `{ type: 'error', code: 'corrupted' }`; (6) `unsupported`/`too-large` are never emitted. Cases: `known-counts.txt`, `known-counts.epub` (same entries as txt), `empty.txt` and `numbers-only.txt` → `empty`, `corrupted.epub` and `zip-bomb.epub` → `corrupted`, `drm.epub` → `protected`
- [ ] T033 [P] [US1] Write `src/hooks/useAnalysis.test.ts`: (a) pure `analysisReducer` transitions from the data-model state machine (`fileSelected` idle→processing; `fileRejected` → error; `progress` updates fraction only in processing; `succeeded` → results; `failed` → error; `cancelled` → idle; `reset` → idle; `fileSelected` from **any** state (processing, results, error) → a new processing state for the new file, because a book can be dropped anywhere on the page at any time; `fileRejected` while processing or showing results → error, and the previous analysis is discarded); (b) the hook with an injected fake worker factory: creates one worker per file, posts `AnalyzeRequest`, terminates the worker on cancel, on reset, on a replacing `selectFile`, and on unmount; ignores messages from a terminated worker
- [ ] T034 [P] [US1] Write `tests/perf/analyze.perf.test.ts` (Vitest `perf` project, run by `npm run bench`): generate `generateZipfText(1_000_000)` once, run `countWords` once to warm up, then time 5 runs with `performance.now()` and `expect(median).toBeLessThanOrEqual(budget)`, where `budget = Number(process.env.PERF_BUDGET_MS ?? 400)`. Log the median and all 5 timings so trends are visible in CI output (research R10, Principle V)
- [ ] T035 [P] [US1] Write `tests/e2e/upload.spec.ts` (Playwright): drop zone visible with the privacy note; upload `known-counts.txt` via `setInputFiles` → stats and the first table page match `known-counts.json`; upload `known-counts.epub` → same; "New book" returns to the upload screen with the drop zone focused; each of `empty.txt`, `numbers-only.txt`, `corrupted.epub`, `drm.epub`, a generated `.pdf`, and a generated 51 MB `.txt` shows its exact message from `src/lib/errorMessages.ts` plus a "Choose another book" button. Write the 51 MB file to disk with `fs.writeFile(testInfo.outputPath('big.txt'), …)` and pass its **path** to `setInputFiles`, because Playwright rejects in-memory buffers over 50 MB. Replacing a book: while a large generated book is processing, (a) dispatch a `drop` event with `known-counts.txt` on `document.body` (built with `page.evaluateHandle` + `DataTransfer`), and (b) separately use the processing panel's "Choose a different book" button; in both cases only the second file's results appear. Also drop a book onto the results screen and see that book's results replace the old ones (FR-001 "onto the page", quickstart scenarios 1, 8, 9)
- [ ] T036 [P] [US1] Write `tests/e2e/privacy.spec.ts`: record every request with `context.on('request')` after `load` (the browser-context listener also captures requests made by the dedicated Web Worker, which `page.on('request')` may miss), and use `page.on('worker')` to assert the analysis worker was actually created; upload a book, page the table, click New book; assert zero requests were made (SC-006). Assert the production `index.html` contains a CSP meta tag with `connect-src 'none'`. Reload after results and assert the upload screen shows with no previous results (FR-004)

### Implementation for User Story 1

- [ ] T037 [P] [US1] Implement `src/lib/tokenize.ts`: `tokenize(text: string): string[]` using `/\p{L}[\p{L}\p{M}]*(?:['’\-‐][\p{L}\p{M}]+)*/gu`, then `normalizeWord(token)` per token. Export `normalizeWord(word: string): string` = `normalize('NFC')`, `toLowerCase()`, replace `’` (U+2019) with `'` and `‐` (U+2010) with `-` (research R5). It is the single normalization used by tokenizing, stop words, and search. Also export a streaming-friendly `forEachToken(text, callback)` that the counter uses to avoid allocating a large token array
- [ ] T038 [P] [US1] Implement `src/lib/stopWords.ts`: `ENGLISH_STOP_WORDS: ReadonlySet<string>` (~180 common English function words, lowercase, including contractions like "don't", "it's", "i'm", written with the straight apostrophe `'` only, since `normalizeWord` maps curly apostrophes to it) and `isLikelyEnglish(entries: ReadonlyArray<[string, number]>, totalWords: number): boolean` with the "stop-word share ≥ 20% of total tokens" rule (research R6)
- [ ] T039 [US1] Implement `src/lib/countWords.ts`: `countWords(text: string, bookName: string): FrequencyResult`, counting with `Map<string, number>` via `forEachToken`; sort with count desc then `Intl.Collator('en').compare` on word; compute `totalWords`, `distinctWords`, and `isLikelyEnglish` (depends on T037, T038)
- [ ] T040 [P] [US1] Implement `src/lib/decodeText.ts`: `decodeText(bytes: Uint8Array): string` that detects UTF-16 LE/BE and UTF-8 BOMs, tries `new TextDecoder('utf-8', { fatal: true })`, falls back to `windows-1252` (research R3)
- [ ] T041 [P] [US1] Implement `src/lib/xhtmlToText.ts`: `xhtmlToText(xhtml: string): string` that drops `<head>`, `<script>`, `<style>` blocks and comments, replaces every tag with a space, unwraps CDATA, and decodes entities (a named-entity table covering HTML5 text entities common in books, plus decimal/hex numeric) (research R4)
- [ ] T042 [US1] Implement `src/lib/epub.ts`: `class EpubError extends Error { code: 'corrupted' | 'protected' }` and `extractEpubText(bytes: Uint8Array): string`. Unzip with `fflate.unzipSync(bytes, { filter })` (wrap failures as `corrupted`). The `filter` callback runs **before** each entry is inflated: it adds up each entry's declared `originalSize` through the pure, exported `assertUncompressedSizeWithin(entries, MAX_UNCOMPRESSED_BYTES)` and throws `corrupted` once the total exceeds 200 MB (zip-bomb guard, research R4). It also returns `false` for entries that are not needed (images, fonts, audio) so they are never decompressed; read `META-INF/container.xml` → OPF `full-path`; resolve manifest hrefs relative to the OPF folder (URL-decode them); iterate the `<spine>` `itemref idref`s in order, skip items whose manifest `media-type` is not `application/xhtml+xml` or `text/html`, and join `xhtmlToText` of each item with `\n`; if `META-INF/encryption.xml` lists any `EncryptionMethod Algorithm` other than `http://www.idpf.org/2008/embedding` or `http://ns.adobe.com/pdf/enc#RC`, throw `protected` (research R4). Parse container/OPF with small, tested regex helpers, because `DOMParser` is not available in workers (depends on T040, T041)
- [ ] T043 [P] [US1] Implement `src/lib/validateFile.ts`: `validateFile({ name, size }): { ok: true; format: BookFormat } | { ok: false; code: 'unsupported' | 'too-large' | 'empty' }` with a case-insensitive extension check and the rule "size MUST be > 0 and ≤ 52,428,800 (50 MB) (FR-003)", checked before the worker starts (data model BookFile)
- [ ] T044 [P] [US1] Implement `src/lib/selectView.ts` (US1 scope): `selectView(result, settings): { entries: WordEntry[] }` mapping tuples to `WordEntry`, plus `formatPercent(percent: number): string` (2 decimals) and `formatCount(n: number): string` (`Intl.NumberFormat`). Memoization-friendly: pure, no mutation of `result`
- [ ] T045 [US1] Implement the worker as two files. (1) `src/worker/handleAnalyze.ts`, a pure module that never references `self` and so is importable in Node tests: export `async function handleAnalyze(request: AnalyzeRequest, emit: Emit)` that reads `file.arrayBuffer()` (stage `reading`), extracts text with `decodeText` (txt) or `extractEpubText` (epub) (stage `extracting`), counts (stage `counting`), and emits a `result`, or `error` `empty` when `totalWords === 0`, `protected`/`corrupted` from `EpubError`, and `corrupted` for any other exception. Throttle progress to at most one message per 50 ms, keep `fraction` non-decreasing, and send nothing after the final message. (2) `src/worker/analysis.worker.ts`, the entry point only: `self.onmessage = (event: MessageEvent<AnalyzeRequest>) => void handleAnalyze(event.data, (m) => self.postMessage(m))`, with no other logic (depends on T013, T039, T040, T042)
- [ ] T046 [US1] Implement `src/hooks/useAnalysis.ts`: export pure `analysisReducer` and state type (`idle` | `processing { fileName, progress, stage }` | `results { result }` | `error { code }`) per the data-model state machine (actions `fileSelected`, `fileRejected`, `progress`, `succeeded`, `failed`, `cancelled`, `reset`). Hook `useAnalysis({ createWorker = () => new Worker(new URL('../worker/analysis.worker.ts', import.meta.url), { type: 'module' }) } = {})` returns `{ state, selectFile(file), cancel(), reset() }`: `selectFile` works in **every** state. It calls `validateFile` and dispatches `fileRejected` on failure; otherwise it terminates any current worker, creates a new one, and posts the `AnalyzeRequest`. In both cases the previous analysis is discarded. Terminate the worker after the final message, on cancel, on reset, and on unmount; drop all references to book data on leaving `processing`/`results` (FR-004) (depends on T043, T045)
- [ ] T047 [P] [US1] Create atom `Spinner` in `src/components/atoms/Spinner/` (colorful rotating gradient ring, `role="status"` with a visually hidden label, static under reduced motion) and atom `ProgressBar` in `src/components/atoms/ProgressBar/` (`value` 0–1, `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow`, animated width transition). Tests check the ARIA attributes and value clamping
- [ ] T048 [P] [US1] Create molecule `FileDropZone` in `src/components/molecules/FileDropZone/`: a large dashed drop area with an upload `Icon`, instruction `Text`, and "Choose a book" `Button` that opens a hidden `<input type="file" accept=".txt,.epub">`; handles `dragenter`/`dragover`/`dragleave`/`drop` with an animated highlight; the whole zone is keyboard-activatable (Enter/Space); calls `onFile(file)` with the first file; exposes a `ref` for focus (FR-001). Its `drop` handler calls `stopPropagation()` so the page-wide drop handler (T059) doesn't process the same file twice. In the same task, create molecule `DropOverlay` in `src/components/molecules/DropOverlay/`: a full-screen, colorful translucent overlay with an upload `Icon` and "Drop your book to analyze it" text, fading in and out, `aria-hidden="true"` (purely visual; keyboard users use the buttons), `pointer-events: none`. Tests: picker selection, drop event (and that it does not propagate), keyboard activation, highlight class on dragover; the DropOverlay text renders when `visible`
- [ ] T049 [P] [US1] Create molecule `PrivacyNote` in `src/components/molecules/PrivacyNote/` with a shield `Icon` and the text "Your book never leaves your device and is not saved" (FR-005). Test checks the exact text
- [ ] T050 [P] [US1] Create molecule `ErrorMessage` in `src/components/molecules/ErrorMessage/`: alert `Icon`, the message for `code` from `src/lib/errorMessages.ts`, and a "Choose another book" `Button` calling `onRetry`; `role="alert"`; shake-in animation (FR-025). Tests for each code
- [ ] T051 [P] [US1] Create molecule `StatCard` in `src/components/molecules/StatCard/`: label `Text`, big value with a count-up animation (`motion` `animate` from 0, instant under reduced motion), optional sub-label (used for the top word's count), colorful accent border from a `tone` prop. Tests: final value text, label, reduced-motion renders the final value immediately
- [ ] T052 [P] [US1] Create molecule `Pagination` in `src/components/molecules/Pagination/`: Previous/Next `Button`s with chevron icons, "Page x of y" `Text`, disabled at the ends, wrapped in `<nav aria-label="Table pages">`. Tests for boundaries and callbacks
- [ ] T053 [US1] Create organism `UploadPanel` in `src/components/organisms/UploadPanel/` composing `FileDropZone`, `PrivacyNote`, and (when `errorCode` is set) `ErrorMessage`; props `onFile`, `errorCode?`, `onRetry`; focuses the drop zone on mount and after retry. Tests: privacy note shown, error shown, `onFile` called (depends on T048–T050)
- [ ] T054 [P] [US1] Create organism `ProcessingPanel` in `src/components/organisms/ProcessingPanel/` composing `Spinner`, `ProgressBar`, the file name, and a stage label ("Reading file…", "Extracting text…", "Counting words…"), a "Cancel" `Button` calling `onCancel` (FR-024), and a "Choose a different book" secondary `Button` that opens a hidden `<input type="file" accept=".txt,.epub">` and calls `onFile(file)` (spec edge case: replace a book while processing). Tests: stage label per stage, progress value, cancel callback, `onFile` called with the chosen file
- [ ] T055 [P] [US1] Create organism `SummaryStats` in `src/components/organisms/SummaryStats/` composing three `StatCard`s: "Total words", "Distinct words", "Most frequent word" (value = word, sub-label = "N times") in a responsive row (FR-011). Tests with a fixture result
- [ ] T056 [P] [US1] Create organism `WordTable` in `src/components/organisms/WordTable/`: a semantic `<table>` with `<caption>`, columns Rank, Word, Count, % (FR-012); local `page` state (`useState(1)`, 50 rows per page, research R12); `Pagination` below; rows fade in on page change; wrapped in `memo`. Tests: 50 rows on page 1, last page partial, values formatted with `formatPercent`/`formatCount`
- [ ] T057 [US1] Create organism `ResultsToolbar` in `src/components/organisms/ResultsToolbar/` (US1 scope: only the "New book" `Button` with the refresh icon calling `onNewBook`, FR-023); later stories add controls to this same component. Test checks the callback
- [ ] T058 [US1] Create template `ResultsLayout` in `src/components/templates/ResultsLayout/` with `ReactNode` slots `heading`, `stats`, `toolbar`, `visualization`, `search`, `table`, in a responsive CSS grid (single column under 768 px). Layout only, no data (research R14); empty slots render nothing. Tests: each slot renders in its region
- [ ] T059 [US1] Create page `HomePage` in `src/components/pages/HomePage/`: uses `useAnalysis`; memoizes `selectView(result, DEFAULT_VIEW_SETTINGS)` with `useMemo`; renders inside `AnimatePresence mode="wait"` with fade/slide transitions: `idle` → `UploadPanel`; `processing` → `ProcessingPanel`; `results` → `ResultsLayout` with a `Heading level={2} tabIndex={-1}` showing the book name (focused when results appear, FR-018), `SummaryStats`, `ResultsToolbar`, and `WordTable`; `error` → `UploadPanel` with `errorCode`. "New book" and "Choose another book" call `reset()`, and focus goes back to the drop zone. **Page-wide drop (FR-001 "onto the page")**: create `src/hooks/usePageFileDrop.ts` (with `usePageFileDrop.test.ts`) that attaches `dragenter`/`dragover`/`dragleave`/`drop` listeners to `window`, using an enter/leave counter so nested elements don't flicker, calls `preventDefault` only for drags that contain files, and returns `isDraggingFile`. It calls `onFile(firstFile)` on drop and removes its listeners on unmount. `HomePage` uses it in **all** states (idle, processing, results, error), passes dropped files to `selectFile`, and shows `DropOverlay` (T048) while `isDraggingFile`. Pass `onFile={selectFile}` to `ProcessingPanel`. Mount it in `src/App.tsx`. Integration test `HomePage.test.tsx` with a fake worker factory covers idle → processing → results → reset, the error flow, and a file dropped on the window while processing and while showing results replacing the analysis (depends on T046, T053–T058)
- [ ] T060 [US1] Add a build-only Vite plugin in `vite.config.ts` (`apply: 'build'`, `transformIndexHtml`) that injects `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'">` (research R2). Verify with `npm run build && npm run preview` that analysis still works and the console has no CSP violations
- [ ] T061 [US1] Run the US1 tests (T024–T036) and make them pass; confirm the `src/lib` coverage is ≥ 90% (`npm run test:coverage`) and `npm run bench` is within budget

**Checkpoint**: MVP complete. Users can analyze `.txt`/`.epub` books privately and see exact counts. It can be demoed and deployed on its own.

---

## Phase 4: User Story 2 - Explore frequencies visually (Priority: P2)

**Goal**: Three colorful, animated visualizations (bar chart, word cloud, Zipf's law chart) with
smooth switching, hover/focus tooltips, and reduced-motion support (FR-013–FR-017, US2
scenarios 1–5).

**Independent Test**: With `known-counts.txt` loaded, the bar chart shows the top 25 matching
the table; switching to the word cloud and Zipf chart animates; the Zipf chart shows points, the
ideal curve, and a legend; hover/focus shows word, count, rank, percent; with emulated
reduced motion, views change instantly (quickstart scenarios 4, 5).

### Tests for User Story 2 (write first, confirm they FAIL) ⚠️

- [ ] T062 [P] [US2] Extend `src/lib/selectView.test.ts`: `top` is the first `topN` entries (fewer when the book has fewer distinct words, no placeholders); `zipfPoints` includes every rank ≤ 100, then logarithmically spaced ranks, `length ≤ 1000`, always includes the last rank, strictly increasing ranks; `idealAt(rank) === entries[0].count / rank` (research R7, data model)
- [ ] T063 [P] [US2] Write `src/hooks/useViewSettings.test.ts`: pure `viewSettingsReducer` starts at `DEFAULT_VIEW_SETTINGS` (`visualization: 'bar'`, `topN: 25`, `hideCommonWords: false`); actions `setVisualization`, `setTopN`, `setHideCommonWords`, `reset`; `setHideCommonWords(true)` is ignored when the passed `isLikelyEnglish` is `false` (rule "Can only be `true` when `isLikelyEnglish` (FR-019)")
- [ ] T064 [P] [US2] Write `src/lib/wordCloudLayout.test.ts`: `fontSizeScale(entries)` is a square-root scale mapping min..max count to 14..72 px; `computeWordCloudLayout(entries, { width, height }, measure?)` limits input to 100 words and resolves with positioned words, with `d3-cloud`'s canvas measuring injected/mocked so it runs in Node
- [ ] T065 [P] [US2] Write component tests for `BarChart`, `WordCloud`, `ZipfChart` (in their folders) using fixture data: BarChart renders exactly `top.length` bars whose `aria-label`s contain word and count and whose widths are proportional to count (FR-013); WordCloud renders one `<text>` per laid-out word (layout mocked); ZipfChart renders log-scaled axes with tick labels, one point per `zipfPoint`, an ideal-curve `<path>`, and a legend with "Your book" and "Ideal Zipf curve" (US2-5); each chart has an SVG `<title>`/`<desc>` and a "View as table" link that targets the `WordTable` id; hovering, focusing, **or tapping** a word element shows `ChartTooltip` with word, count, rank, percent (FR-015). For tap, fire `pointerdown`/`click` with `pointerType: 'touch'`: the first tap opens the tooltip, tapping the same element again or tapping outside the chart closes it, and Escape closes it
- [ ] T066 [P] [US2] Write `src/components/organisms/VisualizationPanel/VisualizationPanel.test.tsx`: renders the chart for `visualization`; changing the prop swaps charts (inside `AnimatePresence`); with `matchMedia('(prefers-reduced-motion: reduce)')` mocked to `true`, no transition delay is applied
- [ ] T067 [P] [US2] Write `tests/e2e/visualizations.spec.ts`: after uploading `known-counts.txt`, 25 bars match the first 25 table rows; switching to Word cloud and Zipf chart via the view control works with mouse and keyboard (arrow keys); hovering a bar shows the tooltip (chromium), and **tapping** a bar, a cloud word, and a Zipf point with `locator.tap()` shows the tooltip in the `mobile-webkit` project (`hasTouch: true`), while tapping outside hides it; with `page.emulateMedia({ reducedMotion: 'reduce' })`, switching views has no running animations (`document.getAnimations()` is empty after 50 ms)

### Implementation for User Story 2

- [ ] T068 [P] [US2] Extend `src/lib/selectView.ts`: add `top: WordEntry[]` (first `settings.topN`), `zipfPoints: Array<{ rank: number; count: number }>` (all ranks ≤ 100, then about 900 logarithmically spaced ranks up to the last, deduplicated, last rank always included, ≤ 1,000 points), and `idealAt(rank)` = `entries[0].count / rank` (research R7)
- [ ] T069 [P] [US2] Implement `src/hooks/useViewSettings.ts`: pure `viewSettingsReducer(state, action)` and `useViewSettings(isLikelyEnglish)` returning `[settings, actions]`, reset to `DEFAULT_VIEW_SETTINGS` whenever a new result arrives (data model ViewSettings, research R14)
- [ ] T070 [P] [US2] Implement `src/lib/wordCloudLayout.ts` wrapping `d3-cloud`: `fontSizeScale` (`scaleSqrt` from `d3-scale`, 14–72 px), `computeWordCloudLayout(entries, size, measure?)` returning a `Promise` of `{ word, count, rank, percent, x, y, size, rotate }` (rotate 0 or 90, seeded random for stable layouts), and a cancel function for when inputs change
- [ ] T071 [P] [US2] Create atom `Tooltip` in `src/components/atoms/Tooltip/`: absolutely positioned bubble with `role="tooltip"` and an `id` for `aria-describedby`, shown on hover **and** focus of its anchor, dismissed with Escape, fade/scale animation. Tests for show on focus, hide on Escape
- [ ] T072 [P] [US2] Create atom `SegmentedControl` in `src/components/atoms/SegmentedControl/`: `role="radiogroup"` with `role="radio"` options, roving `tabIndex`, Left/Right/Home/End keyboard navigation, an animated sliding selection pill (`motion` `layoutId`), generic over option value; props `label`, `options: { value, label, icon? }[]`, `value`, `onChange`. Tests for keyboard navigation and `aria-checked`
- [ ] T073 [US2] Create molecule `ChartTooltip` in `src/components/molecules/ChartTooltip/` built on `Tooltip`, showing word (bold), "Count: N", "Rank: #N", "N.NN% of words" (FR-015). In the same task, create `src/hooks/useWordTooltip.ts` (with `useWordTooltip.test.ts`), shared by all three charts (3 uses, Principle II). It owns `activeWord` local state and returns props for each word element (`onPointerEnter`/`onPointerLeave` for mouse, `onFocus`/`onBlur`, and `onClick` that toggles when `pointerType === 'touch'`) plus a chart-level outside-tap/Escape handler that clears `activeWord` (depends on T071)
- [ ] T074 [US2] Create organism `BarChart` in `src/components/organisms/BarChart/`: responsive SVG (`ResizeObserver` for width) of horizontal bars for `top`, with `scaleLinear` from `d3-scale`; each bar uses a color from the categorical palette, animates width from 0 with a staggered spring, and animates reordering with `layout`; bars are focusable (`tabIndex=0`) with `aria-label="word: N times"`; `useWordTooltip` (T073) drives `ChartTooltip` for hover, focus, and tap; `<title>`/`<desc>` plus a "View as table" link; wrapped in `memo` (FR-013, FR-015) (depends on T068, T073)
- [ ] T075 [US2] Create organism `WordCloud` in `src/components/organisms/WordCloud/`: computes the layout with `computeWordCloudLayout` in an effect (cancelled on change/unmount), shows `Spinner` while computing, renders `<text>` per word colored from the palette with a staggered fade/scale-in, focusable words with `ChartTooltip` via `useWordTooltip` (hover, focus, tap), `<title>`/`<desc>` + "View as table" link, `memo` (depends on T070, T073)
- [ ] T076 [US2] Create organism `ZipfChart` in `src/components/organisms/ZipfChart/`: SVG log–log chart (`scaleLog` x = rank, y = count) with axis ticks at powers of 10 and axis labels "Rank" and "Frequency"; `zipfPoints` as colored circles; the ideal curve as a smooth `<path>` in a contrasting color that draws in with a path-length animation; a legend ("Your book", "Ideal Zipf curve"); hover, focus, or tap on points shows `ChartTooltip` via `useWordTooltip`, and points have a transparent hit area of at least 24×24 px so they can be tapped (WCAG 2.2 target size); `<title>`/`<desc>` + "View as table" link; `memo` (US2-5) (depends on T068, T073)
- [ ] T077 [US2] Create organism `VisualizationPanel` in `src/components/organisms/VisualizationPanel/`: a colorful card that renders `BarChart` | `WordCloud` | `ZipfChart` for `visualization`, inside `AnimatePresence mode="wait"` with a cross-fade + slight scale transition (FR-014); fixed min-height to avoid layout shift (CLS < 0.1) (depends on T074–T076)
- [ ] T078 [US2] Extend organism `ResultsToolbar` with a `SegmentedControl` labelled "Visualization" (options Bar chart / Word cloud / Zipf's law with `chart-bar`/`cloud`/`zipf` icons) calling `onVisualizationChange`; update its tests (depends on T072)
- [ ] T079 [US2] Wire US2 into `HomePage`: use `useViewSettings(result.isLikelyEnglish)`, pass the settings into the memoized `selectView`, render `VisualizationPanel` in the `visualization` slot, connect the toolbar's visualization control, and give `WordTable` a stable `id` for the "View as table" links. Update `HomePage.test.tsx` (depends on T069, T077, T078)
- [ ] T080 [US2] Run the US2 tests (T062–T067) and make them pass. The automated frame-budget check for these animations is T103 (constitution V); also look at the DevTools performance panel once to confirm nothing looks wrong

**Checkpoint**: US1 and US2 both work. Results are visualized three ways with smooth, accessible animation.

---

## Phase 5: User Story 3 - Refine and search the results (Priority: P3)

**Goal**: Hide common words (English), choose top-N (10/25/50/100), search for a word, and start
over (FR-019–FR-021, FR-023, US3 scenarios 1–4).

**Independent Test**: With `known-counts.txt` loaded, turning on "Hide common words" removes "the"
and re-ranks the list; changing top-N updates the charts; searching "don't" shows its count and
rank; "zzz" shows "not found"; with a Cyrillic book the toggle is disabled with an explanation
(quickstart scenario 6).

### Tests for User Story 3 (write first, confirm they FAIL) ⚠️

- [ ] T081 [P] [US3] Create `tests/fixtures/cyrillic.txt` (~200 words of Russian prose, UTF-8), and extend `src/lib/stopWords.test.ts` to assert `isLikelyEnglish` is `false` for it
- [ ] T082 [P] [US3] Extend `src/lib/selectView.test.ts`: with `hideCommonWords: true`, stop words are removed and `rank` and `percent` are recomputed over the filtered total; `top` and `zipfPoints` use the filtered entries; with `hideCommonWords: false` the output equals the unfiltered view
- [ ] T083 [P] [US3] Write `src/lib/findWord.test.ts`: `createWordIndex(entries)` builds a `Map`; `findWord(index, query)` trims and normalizes the query like tokens (NFC, lowercase, curly/straight apostrophe), returns `{ word, count, rank, percent }` for a hit, `null` for a miss, and `null` for an empty query (FR-021)
- [ ] T084 [P] [US3] Write component tests for atoms `Toggle` and `TextInput` and molecule `SearchBox`: Toggle has `role="switch"`, `aria-checked`, toggles with click/Space/Enter, and has a disabled state with a description; TextInput has an associated `<label>`; SearchBox shows "<word>: N times · rank #R · P%" for a hit and "“zzz” doesn't appear in this book" for a miss, in an `aria-live="polite"` region
- [ ] T085 [P] [US3] Extend `ResultsToolbar.test.tsx`: the "Top words" `SegmentedControl` offers 10/25/50/100 and calls `onTopNChange`; the "Hide common words" `Toggle` calls `onHideCommonWordsChange`; when `canHideCommonWords` is false the toggle is disabled with the description "Common-word filtering is available for English books" (research R6)
- [ ] T086 [P] [US3] Add a render-count test to `HomePage.test.tsx` (React `Profiler` around `VisualizationPanel`, with a fake worker giving a result): typing 5 characters into `SearchBox` causes 0 additional chart renders (ui-components state ownership rules); toggling "Hide common words" resets `WordTable` to page 1
- [ ] T087 [P] [US3] Write `tests/e2e/refine.spec.ts`: toggle hide-common-words on/off with re-ranked results; top-N 10/50/100 changes the number of bars; search hit and miss; upload `cyrillic.txt` → toggle disabled with the explanation; "New book" clears results (quickstart scenario 6)

### Implementation for User Story 3

- [ ] T088 [P] [US3] Extend `src/lib/selectView.ts`: when `settings.hideCommonWords` is true, filter out `ENGLISH_STOP_WORDS` before ranking, and recompute `rank` and `percent` over the filtered total (data model derived view). Summary stats keep the unfiltered totals
- [ ] T089 [P] [US3] Implement `src/lib/findWord.ts`: `createWordIndex(entries: WordEntry[]): Map<string, WordEntry>` and `findWord(index, query): WordEntry | null`, trimming the query and normalizing it with `normalizeWord` from `src/lib/tokenize.ts` (T037), the same function used to count words, so "don’t" finds "don't"
- [ ] T090 [P] [US3] Create atom `Toggle` in `src/components/atoms/Toggle/` (a `<button role="switch" aria-checked>` with an animated colorful knob, `label`, `description` linked by `aria-describedby`, `disabled`) and atom `TextInput` in `src/components/atoms/TextInput/` (labelled `<input>`, optional leading `Icon`, `type="search"` support)
- [ ] T091 [US3] Create molecule `SearchBox` in `src/components/molecules/SearchBox/` with local `query` state (research R14), a `TextInput` with a search icon labelled "Find a word", and a result line in `aria-live="polite"`. It receives a word index built with `useMemo(() => createWordIndex(entries))` from props and calls `findWord`; result text formats as in T084 (depends on T089, T090)
- [ ] T092 [US3] Extend organism `ResultsToolbar` with a "Top words" `SegmentedControl` (10/25/50/100) and the "Hide common words" `Toggle` (disabled with "Common-word filtering is available for English books" when `canHideCommonWords` is false) (depends on T090)
- [ ] T093 [US3] Wire US3 into `HomePage`: connect top-N and hide-common-words to `useViewSettings`, pass `canHideCommonWords={result.isLikelyEnglish}`, render `SearchBox` in the `search` slot with `view.entries`, and mount `WordTable` with `key={String(settings.hideCommonWords)}` so it resets to page 1 (research R14); label summary stats as book totals when filtering is on (depends on T088, T091, T092)
- [ ] T094 [US3] Run the US3 tests (T081–T087) and make them pass

**Checkpoint**: US1–US3 work independently. Results can be filtered, resized, and searched.

---

## Phase 6: User Story 4 - Export the results (Priority: P4)

**Goal**: Download the full frequency table as a spreadsheet-compatible CSV that reflects the
current common-word setting (FR-022).

**Independent Test**: Export `known-counts.txt` results and verify the file follows
[csv-export.md](./contracts/csv-export.md) and matches the on-screen table (quickstart
scenario 7).

### Tests for User Story 4 (write first, confirm they FAIL) ⚠️

- [ ] T095 [P] [US4] Write `src/lib/csv.test.ts` per [csv-export.md](./contracts/csv-export.md): output starts with BOM `﻿`; header row `rank,word,count,percent`; CRLF line endings; a word containing `"`, `,`, CR, or LF is quoted with `"` doubled; percent has 4 decimals with `.` (e.g. `5.1234`); row count = filtered entries + 1; parsing the output back yields the same entries. `csvFilename('My: Book?.epub')` → `My- Book--word-frequencies.csv` (strip the extension, replace `\ / : * ? " < > |` with `-`, append `-word-frequencies.csv`)
- [ ] T096 [P] [US4] Write `tests/e2e/export.spec.ts`: with `known-counts.txt` loaded, click "Download results", capture `page.waitForEvent('download')`, and assert the filename is `known-counts-word-frequencies.csv` and the content matches `known-counts.json`; repeat with "Hide common words" on and assert the stop words are absent (quickstart scenario 7)

### Implementation for User Story 4

- [ ] T097 [P] [US4] Implement `src/lib/csv.ts`: `toCsv(entries: WordEntry[]): string` and `csvFilename(bookName: string): string` exactly per [csv-export.md](./contracts/csv-export.md), with the full ranked list for the current filter, not limited to top-N or search
- [ ] T098 [P] [US4] Implement `src/lib/download.ts`: `downloadTextFile(content: string, filename: string, mime = 'text/csv;charset=utf-8')` that creates a `Blob`, an object URL, and a temporary `<a download>`, clicks it, and revokes the URL on the next tick (no network, compatible with the CSP in T060); add a jsdom test in `src/lib/download.test.ts` (T003 routes this one `src/lib` file to the `dom` project and excludes it from `unit`)
- [ ] T099 [US4] Extend `ResultsToolbar` with a "Download results" `Button` (download icon) calling `onDownload`, and wire it in `HomePage` to `downloadTextFile(toCsv(view.entries), csvFilename(result.bookName))`; update the tests (depends on T097, T098)
- [ ] T100 [US4] Run the US4 tests (T095–T096) and make them pass

**Checkpoint**: All four user stories work independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Design polish, accessibility, performance verification, deployment, documentation

- [ ] T101 [P] Visual design pass across `src/styles/tokens.css` and component CSS modules: vibrant gradients, categorical chart palette applied consistently, hover/press micro-interactions, page-state transitions in `HomePage`, and a playful drop-zone idle animation (FR-016). Re-verify the AA contrast ratios recorded in T014 in light and dark themes
- [ ] T102 [P] Write `tests/e2e/a11y.spec.ts` with `@axe-core/playwright`: scan the upload, processing (slow it with a large generated file), results (each visualization), and error states, asserting zero `serious`/`critical` violations; complete the upload → results → switch view → filter → search → export flow with the keyboard only; at a 320 px viewport assert `document.documentElement.scrollWidth <= 320` (FR-018, quickstart scenario 10)
- [ ] T103 [P] Write `tests/e2e/performance.spec.ts`. Tag every test `@perf` so it runs only in CI's `performance` job via `npm run test:e2e:perf` (chromium only). Multiply every budget by `scale = Number(process.env.PERF_BUDGET_SCALE ?? 1)`. These checks enforce the plan's Performance Goals and the constitution's Quality Standards, so going over budget fails CI (constitution V):
  - **Time to results (SC-001)**: upload a `generateZipfText(100_000)` buffer and assert results are visible within `3000 × scale` ms; repeat with CDP `Emulation.setCPUThrottlingRate({ rate: 4 })` and assert ≤ `6000 × scale` ms.
  - **Responsiveness (SC-005)**: during processing, the Cancel button gives visual feedback within `100 × scale` ms of a click.
  - **Core Web Vitals (constitution Quality Standards)**: before navigating, add an init script with `PerformanceObserver`s for `largest-contentful-paint`, `layout-shift` (summing values without `hadRecentInput`), and `event` entries (`durationThreshold: 16`). Load the page, analyze `known-counts.txt`, then switch views, change top-N, and type in search. Assert LCP < `2500 × scale` ms, CLS < 0.1 (not scaled), and the longest interaction duration (INP proxy) < `200 × scale` ms.
  - **Animation frame budget (plan: 60 fps)**: with results shown for `generateZipfText(100_000)` and `topN = 100`, record `requestAnimationFrame` timestamps and `long-animation-frame` entries (fall back to `longtask`) while switching bar → cloud → Zipf → bar. Assert that no frame takes longer than `50 × scale` ms and that the median frame interval is ≤ `20 × scale` ms (about 50+ fps, allowing for rAF jitter). Repeat with 4× CPU throttling and assert no frame over `100 × scale` ms
- [ ] T104 [P] Create `scripts/check-bundle-size.mjs` that gzips each `dist/assets/*.js` file loaded by `index.html` (not the worker chunk) and fails if the total is over 150 KB (plan Performance Goals); add `"size": "node scripts/check-bundle-size.mjs"` to `package.json` and a step after `npm run build` in `.github/workflows/ci.yml`. If the budget is exceeded, lazy-load `WordCloud`/`ZipfChart` with `React.lazy`
- [ ] T105 [P] Create `.github/workflows/deploy.yml`: on push to `main`, build and deploy `dist/` to GitHub Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`); set `base` in `vite.config.ts` from a `BASE_PATH` env var (default `/`) so the site works at `/Zipf/` (research R13)
- [ ] T106 [P] Create `README.md`: what the app does, the privacy guarantee, supported formats, the commands from [quickstart.md](./quickstart.md), the project structure (atomic levels), and a link to `specs/001-book-word-frequency/`
- [ ] T107 Review the code against the constitution: no dead code, commented-out code, or unexplained TODOs; every error path is handled explicitly; dependency versions are exact; `npm audit --omit=dev` shows no critical vulnerabilities
- [ ] T108 Run every quickstart validation scenario (1–10) in [quickstart.md](./quickstart.md) against `npm run preview`, and confirm `npm run check`, `npm run test:coverage`, `npm run bench`, `npm run size`, `npm run test:e2e`, and `npm run test:e2e:perf` all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. T001 first (other tasks need `node_modules`), then T002–T009 in parallel, then T010
- **Foundational (Phase 2)**: depends on Setup. T011 first, then T012–T018 in parallel, then T019 → T020. BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational. This is the MVP
- **US2 (Phase 4)**: depends on Foundational. Its logic and component tasks (T062–T077) don't need US1, but wiring (T079) extends `HomePage`/`ResultsToolbar` from US1 (T057, T059)
- **US3 (Phase 5)**: depends on Foundational. Wiring (T092, T093) extends `ResultsToolbar`/`HomePage` and uses `useViewSettings` from US2 (T069). If US3 is built before US2, move T063 and T069 into US3
- **US4 (Phase 6)**: depends on Foundational. Wiring (T099) extends `ResultsToolbar`/`HomePage` from US1
- **Polish (Phase 7)**: depends on all the stories you want shipped

### User Story Dependencies

```text
Setup → Foundational ─┬─▶ US1 (P1, MVP) ─┬─▶ US2 (P2) ──▶ US3 (P3)
                      │                  └─▶ US4 (P4)
                      └─ (US2/US3/US4 lib + component tasks can start right after Foundational)
```

- Shared files edited by several stories (do them in story order to avoid conflicts):
  `src/lib/selectView.ts` (T044 → T068 → T088), `src/components/organisms/ResultsToolbar/`
  (T057 → T078 → T092 → T099), `src/components/pages/HomePage/` (T059 → T079 → T093 → T099)

### Within Each User Story

- Fixtures → tests (must FAIL) → `src/lib` logic → hooks/worker → atoms → molecules → organisms →
  templates → page wiring → run the story's tests
- A component's test file is written before its implementation (Principle III)

---

## Parallel Examples

### User Story 1

```bash
# After fixtures T021–T023, write all US1 tests together:
Task: "T024 tokenize tests in src/lib/tokenize.test.ts"
Task: "T027 decodeText tests in src/lib/decodeText.test.ts"
Task: "T029 EPUB extraction tests in src/lib/epub.test.ts"
Task: "T032 worker contract tests in tests/contract/worker-messages.test.ts"
Task: "T035 upload e2e in tests/e2e/upload.spec.ts"

# Independent lib modules together:
Task: "T037 src/lib/tokenize.ts"
Task: "T040 src/lib/decodeText.ts"
Task: "T041 src/lib/xhtmlToText.ts"
Task: "T043 src/lib/validateFile.ts"

# Atoms/molecules together:
Task: "T047 Spinner + ProgressBar"
Task: "T048 FileDropZone"  Task: "T049 PrivacyNote"  Task: "T050 ErrorMessage"
Task: "T051 StatCard"      Task: "T052 Pagination"
```

### User Story 2

```bash
Task: "T068 selectView zipfPoints/top"   Task: "T069 useViewSettings"
Task: "T070 wordCloudLayout"             Task: "T071 Tooltip"   Task: "T072 SegmentedControl"
# then the three charts (each depends only on T068/T070 + T073):
Task: "T074 BarChart"   Task: "T075 WordCloud"   Task: "T076 ZipfChart"
```

### User Story 3

```bash
Task: "T088 selectView filtering"   Task: "T089 findWord"   Task: "T090 Toggle + TextInput"
```

### User Story 4

```bash
Task: "T097 src/lib/csv.ts"   Task: "T098 src/lib/download.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE** with quickstart scenarios 1, 2, 8, 9
3. Deploy (T105 can be pulled forward) and demo: private, accurate word counts for books

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate → deploy (MVP)
3. US2 → validate scenarios 4, 5 → deploy (the colorful, visual experience)
4. US3 → validate scenario 6 → deploy
5. US4 → validate scenario 7 → deploy
6. Polish → full quickstart validation (scenarios 1–10) → release

### Parallel Team Strategy

After Foundational: Developer A takes US1. Developer B builds US2's lib and components
(T062–T077). Developer C builds US4's lib (T095–T098). Each integrates into `HomePage` once US1's
T059 lands, following the shared-file order above.

---

## Notes

- [P] = different files and no dependency on an incomplete task
- The story label maps each task to spec.md user stories for traceability
- Commit after each task or logical group, using conventional commit messages
- Stop at any checkpoint to validate a story on its own
- Data-model constraints are quoted in the tasks (T011, T030, T043, T063). Don't loosen them
  during implementation
