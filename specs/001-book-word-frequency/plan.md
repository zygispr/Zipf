# Implementation Plan: Book Word Frequency Counter

**Branch**: `001-book-word-frequency` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-book-word-frequency/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A client-only React single-page app where users drop a `.txt` or `.epub` book and get word
frequencies with three animated, colorful visualizations: bar chart, word cloud, and a Zipf's law
chart. Parsing and counting run in a Web Worker on the user's device. There is no backend, and a
production Content-Security-Policy blocks all network requests after load, so the book is never
transmitted or stored. Components follow atomic design. The app is built with Vite and tested with
Vitest (unit, component, contract) plus Playwright (end-to-end privacy, speed, and accessibility
checks). See [research.md](./research.md) for every decision.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (strict), React 19.3.1; Node 24 LTS for tooling

**Primary Dependencies**: Vite 8.3.5 + `@vitejs/plugin-react` 6.1.2; runtime: `motion` 14.7.1
(animations), `d3-scale` 4.0.2 (chart scales), `d3-cloud` 1.2.9 (word-cloud layout), `fflate`
0.8.3 (EPUB unzip)

**State Management**: React built-ins only: `useReducer` for the analysis state machine
(`useAnalysis`) and view settings, `useMemo` for derived views, local `useState` for UI state,
and props via template slots. No Context, no store library. Zustand is the upgrade path if the
triggers in research R14 occur

**Storage**: N/A. In-memory for the page session only; no storage APIs, cookies, or server (FR-004)

**Testing**: Vitest 5.0.5 + jsdom 30.1.3 + Testing Library (React 16.3.3, user-event 14.6.8,
jest-dom 7.0.1) + `@vitest/coverage-v8` 5.0.5; Playwright 1.64.1 for end-to-end; `vitest bench` for
performance

**Target Platform**: Current evergreen browsers (Chrome, Edge, Firefox, Safari incl. iOS), the
last two major versions; static hosting (GitHub Pages)

**Project Type**: Single-page web application (frontend only)

**Performance Goals**: Results for a 100k-word novel in ≤ 3 s desktop / ≤ 6 s mid-range phone
(SC-001); analysis of 1M words ≤ 400 ms in the benchmark; 60 fps animations; LCP < 2.5 s,
INP < 200 ms, CLS < 0.1; initial JS ≤ 150 KB gzipped

**Constraints**: Zero network requests after page load (SC-006); files ≤ 50 MB; UI stays
responsive during processing; WCAG 2.2 AA; respects `prefers-reduced-motion`; works from 320 px

**Scale/Scope**: One screen flow, ~30 components, 1 worker; vocabularies up to ~50k distinct words
and ~10M tokens per book; any number of visitors (static CDN, all computing on their own devices)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Code Quality | Formatter, linter, type checker with zero errors; explicit error handling; review | PASS: Prettier + ESLint (type-checked, a11y, hooks) + `tsc --noEmit` in `npm run check` (R11) | PASS: all worker failures map to typed `AnalysisError` codes; worker never throws silently ([worker-messages](./contracts/worker-messages.md) guarantee 5) |
| II. Simplicity | YAGNI; abstractions need 2 uses; dependencies justified | PASS: no backend, no state library, no RPC library, no CSS framework | PASS: 4 small runtime dependencies, each justified in R4/R7. State management uses React built-ins after evaluating Context, Zustand, Redux Toolkit, and Jotai (R14). Atomic design is user-mandated and covered under Complexity Tracking |
| III. Testing (NON-NEGOTIABLE) | Automated tests for every behavior; failing test first for bugs; contract tests; suite green before merge | PASS: unit + component + contract + e2e + bench layers defined (R10) | PASS: contract tests for worker protocol and CSV; fixtures with hand-verified counts; coverage 80% / 90% for `src/lib` |
| IV. UX First | User journeys in spec; feedback for every operation; WCAG 2.2 AA; plain-language errors | PASS: spec has 4 prioritized stories with acceptance scenarios | PASS: progress + cancel, error table with plain messages, keyboard/ARIA requirements per component ([ui-components](./contracts/ui-components.md)), reduced motion, axe check in e2e |
| V. Performance | Measurable targets; no unbounded work; benchmarks block regressions | PASS: targets above | PASS: single-pass O(n) counting in a worker; table paginated; Zipf points capped at 1,000; word cloud capped at 100; benchmark with 400 ms budget |
| VI. Scalability | Stateless; pagination; work off the request path; load assumptions + 10x bottleneck; observability | PASS: static site, no server state | PASS: heavy work runs in a worker. Load assumption: 100k-word books, 10x = 1M words → first bottleneck is the sort of distinct words (O(d log d)) and the main-thread transfer, both fine at ≤ 50k distinct. Book-size bottleneck: 50 MB EPUB unzip memory, capped by FR-003. Observability: no server to monitor; client errors are shown to the user, and analytics are deliberately excluded for privacy (see Complexity Tracking) |

**Result**: All gates pass. Two deviations are justified below.

## Project Structure

### Documentation (this feature)

```text
specs/001-book-word-frequency/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R14
├── data-model.md        # Phase 1: entities, errors, state machine
├── quickstart.md        # Phase 1: run + validation scenarios
├── contracts/
│   ├── worker-messages.md  # Main thread ↔ worker protocol
│   ├── csv-export.md       # Downloaded file format
│   └── ui-components.md    # Atomic component inventory + UX guarantees
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html
vite.config.ts            # React plugin, Vitest config, build-only CSP injection
eslint.config.js          # incl. atomic-level import restrictions
playwright.config.ts
src/
├── main.tsx
├── App.tsx               # MotionConfig + AppLayout + HomePage
├── components/
│   ├── atoms/            # Button, Icon, Heading, Text, Spinner, ProgressBar, Toggle,
│   │                     # SegmentedControl, TextInput, Tooltip
│   ├── molecules/        # FileDropZone, PrivacyNote, StatCard, SearchBox, ErrorMessage,
│   │                     # ChartTooltip, Pagination
│   ├── organisms/        # UploadPanel, ProcessingPanel, SummaryStats, ResultsToolbar,
│   │                     # BarChart, WordCloud, ZipfChart, VisualizationPanel, WordTable
│   ├── templates/        # AppLayout, ResultsLayout
│   └── pages/            # HomePage
├── hooks/
│   ├── useAnalysis.ts    # analysisReducer (pure) + worker lifecycle (R14)
│   └── useViewSettings.ts  # view-settings reducer (pure) (R14)
├── lib/                  # pure, React-free logic (each with a colocated .test.ts)
│   ├── types.ts
│   ├── tokenize.ts       # regex tokenizer + normalization (R5)
│   ├── countWords.ts     # Map counting + sorting → FrequencyResult
│   ├── decodeText.ts     # UTF-8/UTF-16/windows-1252 decoding (R3)
│   ├── epub.ts           # container/OPF/spine reading + DRM check (R4)
│   ├── xhtmlToText.ts    # tag stripping + entity decoding (R4)
│   ├── stopWords.ts      # English list + isLikelyEnglish (R6)
│   ├── selectView.ts     # filtering, ranks, top-N, Zipf sampling
│   ├── findWord.ts       # search lookup for SearchBox
│   ├── validateFile.ts   # format + size checks
│   └── csv.ts            # CSV serialization (contracts/csv-export.md)
├── worker/
│   ├── messages.ts       # protocol types (contracts/worker-messages.md)
│   └── analysis.worker.ts  # handleAnalyze + onmessage wiring
└── styles/
    ├── tokens.css        # color palette, gradients, spacing, motion durations
    └── global.css

tests/
├── contract/             # worker-messages.test.ts
├── e2e/                  # Playwright: flows, privacy, performance, a11y
├── bench/                # analyze.bench.ts
└── fixtures/             # see quickstart.md

.github/workflows/
├── ci.yml                # check, coverage, bench, e2e on every push/PR
└── deploy.yml            # build + GitHub Pages on main
```

**Structure Decision**: A single frontend project at the repository root (no backend exists).
Components follow the user-mandated atomic hierarchy under `src/components/`. Component tests sit
next to their components; pure logic sits in `src/lib/` with colocated unit tests. Cross-cutting
contract, end-to-end, and benchmark suites live under `tests/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Five-level atomic component hierarchy | Explicit user requirement; keeps ~30 components organized with enforced dependency direction | A flat `components/` folder is simpler but does not meet the stated requirement |
| No production metrics or logging (Principle VI asks for structured logs and key metrics) | Any telemetry would send data off the device, contradicting FR-004/SC-006 and the CSP `connect-src 'none'` guarantee | Privacy-safe analytics still needs a network request; static-host request logs (page loads) are the only metric, and errors are shown to the user directly |
| Web Worker instead of main-thread processing | Required to keep animations smooth and Cancel responsive for files up to 50 MB (FR-024, SC-005) | Chunked main-thread processing still stalls on large EPUB unzip/decoding and cannot be stopped as cleanly as `terminate()` |
