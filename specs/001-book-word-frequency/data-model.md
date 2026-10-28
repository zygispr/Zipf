# Data Model: Book Word Frequency Counter

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-28

All data lives in memory for the current page session only (FR-004). Nothing is persisted:
no storage APIs, no cookies, no network. The types below are the source for
`src/lib/types.ts`.

## BookFile (input)

The `File` the user selects or drops. The app never keeps a reference after it has been handed
to the worker.

| Field    | Type                 | Rules                                                     |
|----------|----------------------|-----------------------------------------------------------|
| `name`   | string               | Display only; extension decides the format                |
| `size`   | number (bytes)       | MUST be > 0 and ≤ 52,428,800 (50 MB) (FR-003)             |
| `format` | `'txt'` \| `'epub'`  | From extension (case-insensitive); any other value is rejected (FR-002) |

Validation happens on the main thread before the worker starts, so the user hears about
oversized or unsupported files right away (spec edge cases).

## WordEntry

One distinct normalized word.

| Field     | Type   | Rules                                                                     |
|-----------|--------|---------------------------------------------------------------------------|
| `word`    | string | NFC-normalized, lowercase, matches the tokenizer pattern (research R5)    |
| `count`   | number | Integer ≥ 1                                                               |
| `rank`    | number | 1-based position in the current (filtered or unfiltered) ordering         |
| `percent` | number | `count / totalWords × 100` of the current view, shown to 2 decimal places |

Ordering: `count` descending, then `word` ascending (FR-007).

## FrequencyResult

What the worker returns for one book. It never changes after creation; filtered views are
derived from it.

| Field             | Type                         | Rules                                                     |
|-------------------|------------------------------|-----------------------------------------------------------|
| `bookName`        | string                       | Copied from BookFile.name                                 |
| `totalWords`      | number                       | Sum of all counts; > 0 (otherwise the result is the `empty` error) |
| `distinctWords`   | number                       | Number of entries                                         |
| `entries`         | `Array<[word, count]>`       | Sorted per WordEntry ordering. Rank is the array index + 1 |
| `isLikelyEnglish` | boolean                      | Stop-word share ≥ 20% of total tokens (research R6)       |

Tuples instead of objects keep the worker → main-thread transfer small for 50k-word
vocabularies; `WordEntry` objects are created only for rows being shown.

## ViewSettings

User-controlled view state (not persisted). Owned by a `useReducer` in `HomePage`
(research R14) and reset to defaults whenever a new result arrives.

| Field             | Type                                  | Default | Rules                                        |
|-------------------|---------------------------------------|---------|----------------------------------------------|
| `visualization`   | `'bar'` \| `'cloud'` \| `'zipf'`      | `'bar'` | FR-014                                       |
| `topN`            | `10` \| `25` \| `50` \| `100`         | `25`    | FR-020                                       |
| `hideCommonWords` | boolean                               | `false` | Can only be `true` when `isLikelyEnglish` (FR-019) |

## Local UI state (owned by single components, research R14)

| State         | Owner        | Type     | Default | Rules                                                     |
|---------------|--------------|----------|---------|-----------------------------------------------------------|
| `query`       | `SearchBox`  | string   | `''`    | Trimmed, normalized like tokens before lookup (FR-021)    |
| `page`        | `WordTable`  | number   | `1`     | 50 rows per page (research R12); the table is remounted with `key={hideCommonWords}`, so the page goes back to 1 when the filter changes |
| `activeWord`  | each chart, via `useWordTooltip` | string \| null | `null` | Set by hover, focus, or tap; cleared by leave, blur, a second tap, tapping outside, or Escape; drives `ChartTooltip` (FR-015) |

## Derived view (selector, not stored)

`selectView(result, settings)` returns:

- `entries`: the result's entries, without stop words if `hideCommonWords` is on, with ranks and
  percentages recomputed over the filtered total. Summary cards keep the unfiltered book totals
  and are labelled that way.
- `top`: the first `topN` entries (bar chart and word cloud).
- `zipfPoints`: sampled `{ rank, count }` points (all ranks ≤ 100, then logarithmically spaced,
  up to 1,000 points) plus `idealAt(rank) = entries[0].count / rank` (research R7).
- `hiddenWords`: the book's words that "Hide common words" removed (empty when it is off), so
  search can say a word is hidden instead of "not found".
The selector is a pure function in `src/lib/`, memoized with `useMemo` in `HomePage`.
`findWord(view.entries, query)` is a separate pure function that `SearchBox` calls with its
local query. It returns `{ word, count, rank, percent }` or `null` (not found), using a
`Map` index built once per view. When `findWord` misses a word that is in `hiddenWords`, `SearchBox`
says it is a hidden common word, not that it doesn't appear in the book.

## AnalysisError

| `code`         | When                                                        | User message (plain language, FR-025) |
|----------------|-------------------------------------------------------------|---------------------------------------|
| `unsupported`  | Extension is not .txt or .epub                              | "We can read .txt and .epub books. Please choose one of those." |
| `too-large`    | size > 50 MB                                                | "This file is larger than 50 MB. Please choose a smaller book." |
| `empty`        | No words found (blank file, image-only book)                | "We couldn't find any readable words in this book." |
| `corrupted`    | Decoding or unzip failed, missing container/OPF, encrypted zip, or declared uncompressed EPUB content > 200 MB (`MAX_UNCOMPRESSED_BYTES`, zip-bomb guard, research R4) | "This file couldn't be read. It may be damaged. Try another copy." |
| `protected`    | EPUB has DRM encryption (research R4)                       | "This book is copy-protected (DRM), so its text can't be read." |

Each message has a "Choose another book" action that resets to `idle`.

## Analysis state machine (`useAnalysis`)

Implemented as a pure reducer (`analysisReducer` in `src/hooks/useAnalysis.ts`, unit-tested on
its own) plus the worker lifecycle in the hook (research R14). Actions: `fileSelected`,
`fileRejected`, `progress`, `succeeded`, `failed`, `cancelled`, `reset`.

```text
            selectFile(valid)                    worker: result
  ┌──────┐ ─────────────────▶ ┌────────────┐ ───────────────────▶ ┌─────────┐
  │ idle │                    │ processing │                      │ results │
  └──────┘ ◀───────────────── └────────────┘ ───────┐             └─────────┘
     ▲  ▲       cancel()         │    ▲ progress    │ worker: error    │
     │  │                        │    └─(self)      ▼                  │
     │  │  selectFile(invalid)   │              ┌───────┐              │
     │  └────────────────────────┼─────────────▶│ error │              │
     │                           │              └───────┘              │
     │         reset() from error or results          │                │
     └─────────────────────────────────────────────────┴────────────────┘

  selectFile(valid) from ANY state (processing, results, error) → terminate any current worker,
  discard the previous analysis, start processing the new file. Files can be dropped anywhere on
  the page at any time, and the processing panel has a "Choose a different book" button (spec
  edge case, FR-001)
  selectFile(invalid) from any state → error (the previous analysis is discarded)
```

| State        | Data held                                   |
|--------------|---------------------------------------------|
| `idle`       | none                                        |
| `processing` | `fileName`, `progress` (0–1), worker handle |
| `results`    | `FrequencyResult`, `ViewSettings`           |
| `error`      | `AnalysisError`                             |

Leaving `processing` or `results` drops every reference to book data, and the worker is
terminated, so book data can be garbage collected (FR-004, FR-023).
