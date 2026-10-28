# Contract: UI Components (Atomic Design)

Inventory of components, their responsibilities, and the user-facing behavior each one must
guarantee. Props are given as intent, not final signatures. Every component folder contains
`Name.tsx`, `Name.module.css`, `Name.test.tsx`, and `index.ts`.

**Import rule** (ESLint-enforced): a level may import only from lower levels and from
`src/lib`, `src/hooks`, and `src/styles`. Atoms import no other components.

## Atoms — `src/components/atoms/`

| Component        | Responsibility                                     | Must guarantee                                       |
|------------------|----------------------------------------------------|------------------------------------------------------|
| `Button`         | Primary, secondary, and ghost variants             | Native `<button>`, visible focus ring, disabled state |
| `Icon`           | Inline SVG icons from a fixed set                  | `aria-hidden` unless given a label                    |
| `Heading`        | h1–h3 with display styles                          | Correct heading level                                 |
| `Text`           | Body and caption text                              | Meets AA contrast in both themes                      |
| `Spinner`        | Animated loading indicator                         | `role="status"`, stops animating with reduced motion  |
| `ProgressBar`    | Determinate progress 0–1                           | `role="progressbar"` with `aria-valuenow`             |
| `Toggle`         | On/off switch                                      | `role="switch"`, `aria-checked`, works with Space/Enter |
| `SegmentedControl` | Choose one of several options (top-N, view type) | Radiogroup semantics, arrow-key navigation            |
| `TextInput`      | Labeled text field                                 | Associated `<label>`                                  |
| `Tooltip`        | Small floating label                               | Shown on hover **and** focus; dismissed with Escape   |

## Molecules — `src/components/molecules/`

| Component        | Composes                    | Must guarantee                                                  |
|------------------|-----------------------------|-----------------------------------------------------------------|
| `FileDropZone`   | Icon, Text, Button          | Accepts drop **and** file picker (FR-001); keyboard-activatable; `accept=".txt,.epub"`; drag-over highlight animation |
| `PrivacyNote`    | Icon, Text                  | States "Your book never leaves your device and is not saved" (FR-005) |
| `StatCard`       | Heading, Text               | Number animates in (count-up), no animation with reduced motion |
| `SearchBox`      | TextInput, Text             | Shows count, rank, percent, or "not found" (FR-021); result announced via `aria-live` |
| `ErrorMessage`   | Icon, Text, Button          | Message from data-model `AnalysisError` table + "Choose another book" (FR-025) |
| `ChartTooltip`   | Tooltip                     | Word, count, rank, percent (FR-015)                              |
| `Pagination`     | Button, Text                | Previous/Next, "Page x of y", disabled at the ends               |

## Organisms — `src/components/organisms/`

| Component            | Composes                              | Must guarantee                                           |
|----------------------|---------------------------------------|----------------------------------------------------------|
| `UploadPanel`        | FileDropZone, PrivacyNote, ErrorMessage | Validates type and size before processing (FR-002, FR-003) |
| `ProcessingPanel`    | Spinner, ProgressBar, Button          | Shows stage + progress; Cancel returns to idle (FR-024)   |
| `SummaryStats`       | StatCard ×3                           | Total, distinct, top word (FR-011)                        |
| `ResultsToolbar`     | SegmentedControl ×2, Toggle, Button   | View type (FR-014), top-N (FR-020), hide common words (FR-019, disabled with explanation if not English), Download (FR-022), New book (FR-023) |
| `BarChart`           | ChartTooltip                          | Top-N bars match counts exactly (FR-013); animated reorder and resize |
| `WordCloud`          | ChartTooltip                          | Font size from √count; layout computed off render; ≤ 100 words |
| `ZipfChart`          | ChartTooltip                          | Log–log axes, actual points + ideal curve in different colors with a legend (US2-5) |
| `VisualizationPanel` | BarChart, WordCloud, ZipfChart        | Animated cross-fade/morph between views (FR-014); each chart has an accessible text alternative (`<title>`/`<desc>` + "View as table" link) |
| `WordTable`          | Pagination                            | Rank, word, count, percent (FR-012); 50 rows/page; semantic `<table>` |

## Templates — `src/components/templates/`

| Component       | Responsibility                                                                  |
|-----------------|---------------------------------------------------------------------------------|
| `AppLayout`     | Animated gradient background, header (logo, title), main slot, footer; responsive from 320 px |
| `ResultsLayout` | Responsive grid with `ReactNode` slots: `stats`, `toolbar`, `visualization`, `search`, `table`; layout only, no data |

## Pages — `src/components/pages/`

| Component  | Responsibility                                                                         |
|------------|----------------------------------------------------------------------------------------|
| `HomePage` | The only component connected to app state (research R14). Uses `useAnalysis` and the view-settings reducer, memoizes `selectView`, and renders by state: idle → UploadPanel, processing → ProcessingPanel, results → ResultsLayout, error → UploadPanel with ErrorMessage. `AnimatePresence` transitions between states |

## State ownership rules (research R14)

- Only `HomePage` reads or writes app state. Templates receive organisms as `ReactNode` slots;
  organisms and below receive data and callbacks as props, and none of them use Context or
  global stores.
- Ephemeral UI state is owned by the one component that uses it: `SearchBox` (query),
  `WordTable` (page), charts (hovered word).
- `BarChart`, `WordCloud`, `ZipfChart`, and `WordTable` are wrapped in `memo`. Typing in
  `SearchBox` MUST NOT re-render any chart (checked with a render-count test).

## Cross-cutting UX guarantees

- Whole flow works with keyboard only; focus moves to the results heading when results appear
  and to the drop zone after reset (FR-018).
- Layout works from 320 px wide to desktop with no horizontal scroll (FR-018).
- `MotionConfig reducedMotion="user"` wraps the app; CSS animations are also disabled under
  `prefers-reduced-motion: reduce` (FR-017).
- Visual feedback within 100 ms of any interaction (constitution Quality Standards).
