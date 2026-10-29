---

description: "Task list for converting the app's stylesheets to SCSS"
---

# Tasks: SCSS Styling

**Input**: Design documents from `/specs/002-scss-styling/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/stylesheet-authoring.md](./contracts/stylesheet-authoring.md),
[quickstart.md](./quickstart.md)

**Tests**: Included. The constitution (Principle III) requires automated tests for every
requirement, and the plan adds two: the contract test `tests/contract/stylesheets.test.ts`
(research R8) and the local pixel-comparison suite `tests/e2e/visual.spec.ts` (research R7). Both
exist before any stylesheet changes.

**Organization**: Tasks are grouped by user story. US1 converts every file to nested SCSS, using
plain `@media` queries nested in place. US2 then adds the shared partials and swaps the queries and
repeated declarations for named mixins. That is a small mechanical edit, and it is what lets US1
ship on its own, as the spec requires. The plan's Implementation Approach lists the partials before
the conversion; this order deliberately differs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Rules that apply to every conversion task

Every "restructure" task below follows [the authoring contract](./contracts/stylesheet-authoring.md#writing-a-rule)
and research R6:

1. Each top-level rule is one element (one class). Inside it, in this order: declarations; the
   element's own states and pseudo-elements (`&:hover`, `&:focus-visible`, `&[data-…]`,
   `&::before`); context rules that style it from an ancestor, written
   `.ancestor[state] & { … }`; descendants it owns, only where the CSS already used a descendant
   selector; then media overrides nested in place. For a selector like `A B`, the contract's
   "Which block a selector like `A B` goes in" decides the block. If `B` is a class with its own
   rule, nest inside `B` as `A &`. If `B` is a bare tag or pseudo-class, nest inside `A`.
2. No declarations after a nested rule.
3. At most three selector levels; a nested `@media` does not count as a level.
4. Never build a class name with `&` (`&-title`, `&Title`); write every class name in full.
5. **Override placement**: Sass writes a nested `@media` out right after its parent rule. Before
   moving an override (such as a reduced-motion rule from the end of the file) into a rule, check
   whether any later rule with equal specificity sets the same property on the same element. If
   one does, nest the override in that later rule instead.
6. Keep every value, comment, class name, and `@keyframes` name unchanged. Comments stay next to
   the rule they explain. `@keyframes` stay at the top level, after the rule that uses them.
7. Do not fix style bugs. Note them for the PR description instead (research R10).

"Checkpoint" tasks run `npm run test:visual` (zero changed pixels), `npm test`, and
`npm run format:check`, then commit the batch.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the compiler and wire up scripts and config. No stylesheet changes yet.

- [X] T001 Add `sass` as an exact-pinned development dependency with `npm install --save-dev --save-exact sass@1.105.1`, updating `package.json` and `package-lock.json`. Do not add `sass-embedded`; Vite would prefer it over `sass` (research R1).
- [X] T002 In `vite.config.ts`, add `css: { preprocessorOptions: { scss: { loadPaths: [<absolute path of src/styles>] } } }`. Build the absolute path from the config file's own location (for example, `fileURLToPath(new URL('./src/styles', import.meta.url))`). Add a one-line comment citing research R2: it lets any stylesheet write `@use 'media';` without a relative path.
- [X] T003 In `package.json` scripts, add `"test:visual": "playwright test --grep @visual --project chromium"`, and change `test:e2e` to `playwright test --grep-invert \"@perf|@visual\"` so CI never runs the visual suite (research R7).
- [X] T004 [P] Add `tests/e2e/*-snapshots/` to `.gitignore` under the "Node / build output" group, with a comment saying the visual baselines are machine-specific and must not be committed (research R7).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two safety nets: pixel baselines from the CSS version, and a stylesheet contract
test that passes on the CSS version. Both must exist before any stylesheet is renamed.

**⚠️ CRITICAL**: No stylesheet may be renamed or edited until T006 and T008 are done.

- [X] T005 Create `tests/e2e/visual.spec.ts` (research R7), tagged `@visual` the same way `tests/e2e/performance.spec.ts` tags `@perf`. Start the file with a comment saying what the suite is for and that baselines are local.
  - **Helpers**: reuse `chooseBookButton`, `uploadFile`, and `startLargeAnalysis` from `tests/e2e/helpers.ts`, and `fixturePath` from `tests/fixtures/readFixture.ts`. Reach each state the way `tests/e2e/a11y.spec.ts` does.
  - **Conditions**: loop over colour scheme (`light`, `dark`), viewport (desktop `{ width: 1280, height: 720 }` and phone `{ width: 390, height: 844 }`), and reduced motion (`no-preference`, `reduce`). Set them with `page.emulateMedia` and `test.use({ viewport })`. Name each screenshot `<state>-<scheme>-<viewport>-<motion>.png`.
  - **Screens and states**:
    1. upload;
    2. upload with a file dragged over the drop zone: dispatch `dragenter` and `dragover` (no `drop`) with a `DataTransfer` holding a text file on the drop zone, then wait for `[data-dragging="true"]`;
    3. upload with the "Choose a book" button keyboard-focused (press Tab until it has focus);
    4. processing, via `startLargeAnalysis`, masking `page.getByRole('progressbar')` and every live counter in the processing panel;
    5. error for `drm.epub`;
    6. error for `corrupted.epub`;
    7. results for `known-counts.txt` in the Bar chart view;
    8. the same with the first bar hovered and its tooltip shown (desktop only, as in `tests/e2e/visualizations.spec.ts`);
    9. Word cloud view;
    10. Zipf's law view;
    11. results filtered and searched: the "Hide common words" switch on and `the` typed into "Find a word".
  - **Assertion**: before each screenshot, `await page.evaluate(() => document.fonts.ready)`. Then `await expect(page).toHaveScreenshot(name, { fullPage: true, animations: 'disabled', maxDiffPixels: 0, mask })`.
- [X] T006 With the stylesheets still CSS, capture baselines with `npm run test:visual -- --update-snapshots`. Then run `npm run test:visual` twice more; both runs must pass with zero changed pixels, which proves the suite is deterministic. If a state flickers, fix its wait or mask in `tests/e2e/visual.spec.ts` and recapture. Commit T001–T006. The snapshots stay untracked.
- [X] T007 Create `tests/contract/stylesheets.test.ts` in the existing `unit` Vitest project (it already includes `tests/contract/**/*.test.ts`). Open with a comment pointing to `specs/002-scss-styling/contracts/stylesheet-authoring.md`, like `tests/contract/worker-messages.test.ts` does. It must pass on today's CSS, so match both `.module.css` and `.module.scss` until the conversion is done. Implement:
  - **Setup**: in `beforeAll`, `const config = await resolveConfig({}, 'build')` from `vite`. Find every stylesheet under `src/` with `globSync('src/**/*.{css,scss}')` from `node:fs`.
  - **"every stylesheet compiles"**: for each file, `await preprocessCSS(source, absolutePath, config)` must resolve. On failure, rethrow with the file path prepended, keeping Sass's message, which carries the line (FR-011).
  - **"every class a component uses exists"**: for each `src/**/*.tsx` that isn't a `*.test.tsx`, find `import (\w+) from '(\.{1,2}/[^']+\.module\.s?css)'`. Take that module's class names from the `modules` keys of its `preprocessCSS` result. Every `<binding>.<name>` and `<binding>['<name>']` must be one of them. The failure message names the `.tsx`, the class, and the stylesheet, for example: `FileDropZone.tsx uses styles.zones, but FileDropZone.module.scss has no .zones class` (FR-008).
  - **Dynamic lookups**: any `<binding>[` not followed by a string literal must have an entry in a `DYNAMIC_LOOKUPS` table keyed by the `.tsx` path relative to the repo root. Otherwise the test fails with "add it to DYNAMIC_LOOKUPS". Every key in an entry must be a class in the module. The four entries are each written `satisfies Record<…, true>`, so typecheck rejects the table when a union changes:
    - `src/components/atoms/Button/Button.tsx` → `{ primary: true, secondary: true, ghost: true } satisfies Record<ButtonVariant, true>`
    - `src/components/atoms/Text/Text.tsx` → `{ body: true, caption: true, lead: true } satisfies Record<TextVariant, true>`
    - `src/components/atoms/Heading/Heading.tsx` → `{ h1: true, h2: true, h3: true } satisfies Record<\`h${HeadingProps['level']}\`, true>`
    - `src/components/templates/ResultsLayout/ResultsLayout.tsx` → `{ heading: true, toolbar: true, stats: true, visualization: true, search: true, table: true } satisfies Record<keyof ResultsLayoutProps, true>`
  - **As built**: `ResultsLayout.module.css` defines only `.heading`; its other five slots have no class and render `className={undefined}` on purpose. The table is therefore `Record<…, boolean>`: `true` means the value must be a class, `false` that it deliberately has none. ResultsLayout's entry is `heading: true` and the rest `false`. The contract's "Class names" section says the same.
- [X] T008 Prove T007 catches mistakes, then undo each change:
  - (a) Rename `.zone` to `.zones` in `src/components/molecules/FileDropZone/FileDropZone.module.css`. `npm test -- tests/contract/stylesheets.test.ts` fails and names `FileDropZone.tsx` and `zone`.
  - (b) Add `'danger'` to `ButtonVariant` in `src/components/atoms/Button/Button.tsx`. `npm run typecheck` fails on the table.
  - (c) Add `styles[name]` with a new variable to any component. The test asks for a `DYNAMIC_LOOKUPS` entry.

  Then run `npm run check`, which must be green, and commit T007.

**Checkpoint**: Baselines are captured and the contract test is green on CSS. The conversion can
start.

---

## Phase 3: User Story 1 - Read a component's styles as one nested block (Priority: P1) 🎯 MVP

**Goal**: All 32 stylesheets are SCSS, each element's rules are nested in one block, and the app
renders pixel-identically.

**Independent Test**: Open `src/components/molecules/FileDropZone/FileDropZone.module.scss`. Each
element's states, context rules, and reduced-motion overrides sit inside its own block.
`npm run test:visual` shows zero changed pixels, and `find src -name '*.css'` prints nothing
(quickstart §1, §3).

The automated test for this story, the "only SCSS" check (T034), is written just before the last
batch. Its failure then lasts only until T035's rename, and every checkpoint before it can pass.
The pixel baselines (T006) and the class-name check (T007) are this story's test-first guards
from the start.

### Batch A: global styles, tokens, shared chart module

- [X] T009 [US1] Rename with `git mv`, without editing styles:
  - `src/styles/tokens.css` → `src/styles/_tokens.scss`
  - `src/styles/global.css` → `src/styles/global.scss`
  - `src/styles/chart.module.css` → `src/styles/chart.module.scss`

  Then:
  - In `src/styles/global.scss`, replace `@import './tokens.css';` with `@use 'tokens';` (research R3).
  - Update the imports in `src/main.tsx` (`./styles/global.scss`) and in `src/components/organisms/BarChart/BarChart.tsx`, `src/components/organisms/WordCloud/WordCloud.tsx`, and `src/components/organisms/ZipfChart/ZipfChart.tsx` (`../../../styles/chart.module.scss`).

  Run `npm run build`, `npm test`, and `npm run test:visual`, which must show zero diffs. Commit as a rename-only commit so `git log --follow` keeps history. `chart.module.scss` is flat and needs no restructuring.
- [X] T010 [P] [US1] Restructure `src/styles/global.scss`:
  - Nest the reduced-motion block (`@media (prefers-reduced-motion: reduce)` on `*, *::before, *::after`) inside the reset rule with the same selector, keeping its FR-017 comment above it.
  - Nest any other same-selector repeats per the rules above.
  - Keep `@use 'tokens';` first.
- [X] T011 [P] [US1] Restructure `src/styles/_tokens.scss`: move the `@media (prefers-color-scheme: dark)` block inside the `:root` rule as a nested `@media`. Every custom property and every contrast-ratio comment stays exactly as written. Tokens remain CSS custom properties, quoting the data model: "it stays a runtime custom property; there is no Sass variable mirror (FR-006)".

### Batch B: atoms

- [X] T012 [US1] Rename with `git mv` and update each component's `import styles from './<Name>.module.scss'`, without editing styles: `Button`, `Heading`, `Icon`, `ProgressBar`, `SegmentedControl`, `Spinner`, `Text`, `TextInput`, `Toggle`, and `Tooltip`, each in `src/components/atoms/<Name>/<Name>.module.css` → `.module.scss` with `<Name>.tsx` updated. Run `npm run build`, `npm test`, and `npm run test:visual` (zero diffs), then commit as rename-only. `Icon`, `Text`, and `Tooltip` are flat and need no restructuring.
- [X] T013 [P] [US1] Restructure `src/components/atoms/Button/Button.module.scss`: nest the variant and state selectors under `.button`, and the reduced-motion block's rules under the elements they override.
- [X] T014 [P] [US1] Restructure `src/components/atoms/Heading/Heading.module.scss`: nest its one compound or descendant selector under the element it styles.
- [X] T015 [P] [US1] Restructure `src/components/atoms/ProgressBar/ProgressBar.module.scss`: move the reduced-motion overrides into the rules they override.
- [X] T016 [P] [US1] Restructure `src/components/atoms/SegmentedControl/SegmentedControl.module.scss`. Nest:
  - the state selectors under their elements;
  - the `@media (max-width: 480px)` overrides for `.group` and `.option` inside those rules, written as plain nested `@media (max-width: 480px)`, since US2 swaps them for the mixin;
  - the reduced-motion overrides inside their rules.
- [X] T017 [P] [US1] Restructure `src/components/atoms/Spinner/Spinner.module.scss`: nest the reduced-motion override inside the rule it overrides, and keep the `@keyframes` at the top level with its name unchanged.
- [X] T018 [P] [US1] Restructure `src/components/atoms/TextInput/TextInput.module.scss`: nest the focus, placeholder, and other state selectors and the reduced-motion overrides under their elements.
- [X] T019 [P] [US1] Restructure `src/components/atoms/Toggle/Toggle.module.scss`: nest its five compound or context selectors (checked and focus states of the track and thumb) and the reduced-motion overrides under the elements they style.
- [X] T020 [US1] Checkpoint for batch B (and T010–T011): `npm run test:visual` shows zero changed pixels, and `npm test` and `npm run format:check` pass (run `npm run format` first if needed). Commit.

### Batch C: molecules

- [X] T021 [US1] Rename with `git mv` and update each `<Name>.tsx` import, without editing styles: `ChartTooltip`, `DropOverlay`, `ErrorMessage`, `FileDropZone`, `Pagination`, `PrivacyNote`, `SearchBox`, and `StatCard`, each in `src/components/molecules/<Name>/`. Build, test, and run the visual suite (zero diffs), then commit as rename-only. `ChartTooltip`, `DropOverlay`, `Pagination`, `PrivacyNote`, and `SearchBox` are flat.
- [X] T022 [P] [US1] Restructure `src/components/molecules/ErrorMessage/ErrorMessage.module.scss`: nest the `@media (min-width: 640px)` overrides of `.error` and `.error > :last-child` inside `.error`. Write them as plain nested `@media (min-width: 640px)`, with `> :last-child` nested as a child rule.
- [X] T023 [P] [US1] Restructure `src/components/molecules/FileDropZone/FileDropZone.module.scss` to match the example in `specs/002-scss-styling/contracts/stylesheet-authoring.md`, using plain nested `@media (prefers-reduced-motion: reduce)` instead of the mixin:
  - Under `.zone`: `&:hover, &[data-dragging='true']`, `&[data-dragging='true']` (with its `transform: none` reduced-motion override), and the `transition: none` override.
  - Under `.icon`: `&::before`, `.zone:hover &`, and `.zone[data-dragging='true'] &` (with its `animation: none` override), plus the `.icon` and `.icon::before` `animation: none` overrides.
  - Under `.choose`: `&::after`.

  Keep all three `@keyframes` at the top level and every comment (FR-016 and the stacking-context note) in place.
- [X] T024 [P] [US1] Restructure `src/components/molecules/StatCard/StatCard.module.scss`: nest its three compound or descendant selectors under the elements they style.
- [X] T025 [US1] Checkpoint for batch C: zero visual diffs, `npm test`, `npm run format:check`. Commit.

### Batch D: organisms

- [X] T026 [US1] Rename with `git mv` and update each `<Name>.tsx` import, without editing styles: `BarChart`, `ProcessingPanel`, `ResultsToolbar`, `SummaryStats`, `UploadPanel`, `VisualizationPanel`, `WordCloud`, `WordTable`, and `ZipfChart`, each in `src/components/organisms/<Name>/`. Build, test, and run the visual suite (zero diffs), then commit as rename-only. `ProcessingPanel`, `SummaryStats`, and `UploadPanel` are flat.
- [X] T027 [P] [US1] Restructure `src/components/organisms/BarChart/BarChart.module.scss`: nest `.mark:hover .hit` and `.mark:focus-visible .hit` under `.hit` as `.mark:hover &` and `.mark:focus-visible &`.
- [X] T028 [P] [US1] Restructure `src/components/organisms/ResultsToolbar/ResultsToolbar.module.scss`: nest the `@media (max-width: 480px)` override inside `.topN` as a plain nested `@media (max-width: 480px)`.
- [X] T029 [P] [US1] Restructure `src/components/organisms/VisualizationPanel/VisualizationPanel.module.scss`: nest its `@media (max-width: 480px)` override inside the rule it overrides.
- [X] T030 [P] [US1] Restructure `src/components/organisms/WordCloud/WordCloud.module.scss`: nest `.word:focus-visible` and the other state selector under `.word`.
- [X] T031 [P] [US1] Restructure `src/components/organisms/WordTable/WordTable.module.scss`. Nest:
  - `.wrapper:focus-visible` under `.wrapper`;
  - the table's descendant and state selectors (seven compound selectors) under the elements they style, keeping at most three levels;
  - the `@media (max-width: 480px)` overrides inside their rules.
- [X] T032 [P] [US1] Restructure `src/components/organisms/ZipfChart/ZipfChart.module.scss`. Nest:
  - `.axis line`, `.axis .grid`, and `.axis text` under `.axis` as `line`, `.grid`, and `text`;
  - `.point:hover .dot, .point:focus-visible .dot` under `.dot` as `.point:hover &, .point:focus-visible &`;
  - `.point:focus-visible .hit` under `.hit`;
  - the legend's descendant rules under the legend.
- [X] T033 [US1] Checkpoint for batch D: zero visual diffs, `npm test`, `npm run format:check`. Commit.

### Batch E: templates and finish

- [X] T034 [US1] Test first: add the "only SCSS" check to `tests/contract/stylesheets.test.ts`. `globSync('src/**/*.css')` must be empty, and the failure message lists the remaining files (FR-001, SC-001). Run `npm test -- tests/contract/stylesheets.test.ts` and confirm it fails, listing exactly `src/components/templates/AppLayout/AppLayout.module.css` and `src/components/templates/ResultsLayout/ResultsLayout.module.css`. Leave it uncommitted. T035's rename makes it pass, and it is committed in T037.
- [X] T035 [US1] Rename with `git mv` and update each `<Name>.tsx` import, without editing styles: `AppLayout` and `ResultsLayout` in `src/components/templates/<Name>/`. Build, test, and run the visual suite (zero diffs), then commit as rename-only. `ResultsLayout` is flat.
- [X] T036 [US1] Restructure `src/components/templates/AppLayout/AppLayout.module.scss`: nest its two compound selectors and the reduced-motion overrides under their elements, and keep its `@keyframes` at the top level with the name unchanged.
- [X] T037 [US1] Finish US1:
  - In `tests/contract/stylesheets.test.ts`, change the T007 import pattern to match only `.module.scss`.
  - Confirm `find src -name '*.css'` prints nothing and the T034 "only SCSS" check passes.
  - Run `npm run check`, `npm run test:visual` (zero diffs), `npm run build`, and `npm run test:e2e`.
  - Commit together with T034's test.

**Checkpoint**: US1 is complete and shippable. Every stylesheet is nested SCSS, and the app is
pixel-identical.

---

## Phase 4: User Story 2 - Reuse named breakpoints and shared style patterns (Priority: P2)

**Goal**: Each breakpoint value is defined once by name, and the same-purpose repeats use shared
mixins (research R4, R5).

**Independent Test**: Change `$narrow-max` in `src/styles/_media.scss` to `500px`. The segmented
control, results toolbar, visualization panel, and word table all switch at 500 px with no other
file edited, and `grep -rn '480px\|640px' src --include='*.scss'` matches only `_media.scss`
(quickstart §4).

### Test for User Story 2

- [X] T038 [US2] Add the "breakpoints are named" check to `tests/contract/stylesheets.test.ts`: in every `src/**/*.scss` except `src/styles/_media.scss`, no line that starts an `@media` may contain `width`. The failure message says to use `media.narrow` or `media.wide` (FR-004, SC-004). Run it and confirm it fails, naming `SegmentedControl.module.scss`, `ErrorMessage.module.scss`, `ResultsToolbar.module.scss`, `VisualizationPanel.module.scss`, and `WordTable.module.scss`.

### Implementation for User Story 2

- [X] T039 [US2] Create `src/styles/_media.scss` with exactly these members (data model "Shared breakpoint"), each with a one-line comment:
  - `$narrow-max: 480px;`
  - `$wide-min: 640px;`
  - `@mixin narrow { @media (max-width: $narrow-max) { @content; } }`
  - `@mixin wide { @media (min-width: $wide-min) { @content; } }`
  - `@mixin reduced-motion { @media (prefers-reduced-motion: reduce) { @content; } }`

  Open the file with a comment saying these are build-time only, because CSS custom properties can't be used in media queries, and that tokens stay in `_tokens.scss` (research R3, R4).
- [X] T040 [P] [US2] Create `src/styles/_chart.scss` with exactly these argument-free mixins (research R5), and open the file with a comment naming BarChart, WordCloud, and ZipfChart as its users:
  - `@mixin mark { cursor: pointer; outline: none; }`
  - `@mixin focus-ring { stroke: var(--color-focus); stroke-width: 2px; }`
  - `@mixin label-text { fill: var(--color-text); font-size: 13px; font-weight: 600; }`
  - `@mixin value-text { fill: var(--color-text-muted); font-size: 12px; font-variant-numeric: tabular-nums; }`
- [X] T041 [P] [US2] In the atoms, add `@use 'media';` at the top and replace each nested `@media (prefers-reduced-motion: reduce)` with `@include media.reduced-motion` and each `@media (max-width: 480px)` with `@include media.narrow`. Files: `src/components/atoms/Button/Button.module.scss`, `ProgressBar/ProgressBar.module.scss`, `SegmentedControl/SegmentedControl.module.scss`, `Spinner/Spinner.module.scss`, `TextInput/TextInput.module.scss`, and `Toggle/Toggle.module.scss`, all under `src/components/atoms/`. Depends on T039.
- [X] T042 [P] [US2] Do the same in `src/components/molecules/ErrorMessage/ErrorMessage.module.scss` (`@media (min-width: 640px)` → `@include media.wide`) and `src/components/molecules/FileDropZone/FileDropZone.module.scss` (reduced-motion), adding `@use 'media';`. Depends on T039.
- [X] T043 [P] [US2] Do the same (`@media (max-width: 480px)` → `@include media.narrow`, adding `@use 'media';`) in `src/components/organisms/ResultsToolbar/ResultsToolbar.module.scss`, `src/components/organisms/VisualizationPanel/VisualizationPanel.module.scss`, and `src/components/organisms/WordTable/WordTable.module.scss`. Depends on T039.
- [X] T044 [P] [US2] Do the same (reduced-motion) in `src/components/templates/AppLayout/AppLayout.module.scss` and `src/styles/global.scss`. In `global.scss`, put `@use 'media';` after `@use 'tokens';`. Depends on T039.
- [X] T045 [P] [US2] Add `@use 'chart';` and replace the repeated declarations with mixins:
  - `src/components/organisms/BarChart/BarChart.module.scss`: `.mark` → `@include chart.mark;`, the focused `.hit` → `@include chart.focus-ring;`, `.label` → `@include chart.label-text;`, `.value` → `@include chart.value-text;`
  - `src/components/organisms/WordCloud/WordCloud.module.scss`: `.word` → `@include chart.mark;` only. Its 3px `paint-order` focus style stays inline.
  - `src/components/organisms/ZipfChart/ZipfChart.module.scss`: `.point` → `chart.mark`, the focused `.hit` → `chart.focus-ring`, `.axisLabel` → `chart.label-text`, `.axis text` → `chart.value-text`.

  Leave `ResultsToolbar .topN` and `ZipfChart .legend li` inline; they match by coincidence, not purpose (research R5). Each `@include` goes where the declarations were, before any nested rule. Depends on T040.
- [X] T046 [US2] Checkpoint:
  - The T038 check passes.
  - `grep -rn '480px\|640px' src --include='*.scss'` matches only `src/styles/_media.scss`.
  - Do the quickstart §4 breakpoint exercise, then revert it.
  - `npm run test:visual` shows zero diffs, and `npm run check` passes.
  - Commit T038–T045.

**Checkpoint**: US1 and US2 are complete. Breakpoints and shared patterns are named and defined
once.

---

## Phase 5: User Story 3 - Write new styles in SCSS with the same safety checks (Priority: P3)

**Goal**: The check command and the build catch formatting and compile mistakes in new SCSS, and
the README explains the conventions.

**Independent Test**: Quickstart §5. A deliberately broken `Probe.module.scss` makes
`npm run check` fail for formatting and for an undefined mixin with its file and line. It also
makes `npm run build` fail and shows an error overlay in `npm run dev`.

### Test for User Story 3

- [X] T047 [US3] In `tests/contract/stylesheets.test.ts`, add a test that calls `preprocessCSS` with the resolved config, an in-memory source of `@use 'media';\n.probe {\n  @include media.tiny {\n    color: blue;\n  }\n}\n`, and the filename `src/components/atoms/Probe/Probe.module.scss` (it doesn't need to exist). Assert that it rejects with a message containing `Undefined mixin` and line `3` (FR-011).

### Implementation for User Story 3

- [X] T048 [US3] Run quickstart §5 by hand:
  - Create `src/components/atoms/Probe/Probe.module.scss` with the snippet given there.
  - Confirm that `npm run format:check` flags it, that the contract test reports `Undefined mixin` with file and line, and that `npm run build` fails naming the file and line.
  - Import it from a component under `npm run dev` and confirm the browser error overlay names the file.
  - Delete the probe and its import. No commit; this task is verification only.
- [X] T049 [P] [US3] In `README.md`:
  - Add a "Styles" section after "Project structure" covering:
    - (a) component stylesheets are SCSS Modules next to each component (`<Name>.module.scss`);
    - (b) `src/styles/` holds `global.scss`, `_tokens.scss`, and `chart.module.scss`, plus the build-time partials `_media.scss` (`media.narrow`, `media.wide`, `media.reduced-motion`) and `_chart.scss` (`chart.mark`, `chart.focus-ring`, `chart.label-text`, `chart.value-text`);
    - (c) `@use 'media';` works from any stylesheet because `src/styles` is on the Sass load path;
    - (d) design tokens stay CSS custom properties because dark mode switches them at runtime, so never turn them into Sass variables;
    - (e) a link to `specs/002-scss-styling/contracts/stylesheet-authoring.md` for the nesting rules;
    - (f) `npm run test:visual` takes before and after screenshots for any style-only change (capture baselines first with `-- --update-snapshots`).
  - Change the `styles/` line of the structure tree to `# design tokens, global styles, shared SCSS partials`.
  - Add `specs/002-scss-styling/` to the "Design documents" section.

**Checkpoint**: All three user stories are complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final checks against the spec's success criteria and the authoring contract.

- [ ] T050 Check comment preservation (FR-009). For each of the 32 converted files, compare the multiset of `/* … */` comments in `git show main:<old .css path>` with the new `.scss` file, ignoring whitespace. They must be identical. Use a throwaway script in the scratchpad; don't commit it.
- [ ] T051 [P] Check FR-003 by measurement, then review against the authoring contract. Use throwaway scripts in the scratchpad; don't commit them.
  - **Same selectors, so same specificity (FR-003)**: compile each converted file with `npx sass --no-source-map --load-path=src/styles <file>`. Read the CSS it replaced with `git show main:<old .css path>`. For `global.scss`, add `main`'s `tokens.css` to its `global.css`, since `@use 'tokens'` inlines it.
    - From both outputs, build the multiset of `(enclosing @media query, single selector, property: value)` triples. Split selector lists on top-level commas, collapse whitespace, and drop quotes around attribute values (Sass writes `[data-dragging='true']` as `[data-dragging=true]`).
    - The two multisets must be identical. Then no selector was added, dropped, or changed, so no specificity changed. Rule order is not compared here; that is what `test:visual` is for.
  - **Nesting depth (FR-003)**: in each `src/**/*.scss`, ignoring comments, count how deeply selector blocks nest. Don't count blocks opened by `@include`, `@media`, `@keyframes`, or keyframe steps. The maximum must be at most 3, top-level rule included.
  - Then review every `src/**/*.scss` against `specs/002-scss-styling/contracts/stylesheet-authoring.md` and fix any misses:
  - no selector repeated at the top level of a file (SC-003);
  - every `A B` selector is in the block the contract's "Which block a selector like `A B` goes in" picks;
  - no declaration after a nested rule;
  - `grep -rnE '&[-_a-zA-Z]' src --include='*.scss'` finds no class-name concatenation;
  - every `@keyframes` is at the top level;
  - every `@use` uses the default namespace (no `as *`).

  After any fix, rerun `npm run test:visual` (zero diffs).
- [ ] T052 Measure budgets (quickstart §6, SC-005, SC-006):
  - `npm run build && npm run size`: initial JS at most 150 KB gzipped (was 149.3 KB).
  - `for f in dist/assets/*.css; do gzip -9c "$f" | wc -c; done`: at most 5,086 bytes (was 4,987).
  - `npm run test:e2e:perf` and `npm run bench` pass.

  Record the before and after numbers for the PR description.
- [ ] T053 Run the full gate (quickstart §7, SC-007): `npm run check && npm run test:coverage && npm run build && npm run test:e2e`. Confirm with `git diff main --stat -- tests/e2e src/**/*.test.tsx` that no existing test's assertions changed. The only expected test changes are the new `tests/e2e/visual.spec.ts` and `tests/contract/stylesheets.test.ts`.
- [ ] T054 Run all of `specs/002-scss-styling/quickstart.md`, including §8: find `media.narrow` and `chart.focus-ring` using only the README. Collect any style bugs noted during conversion (rule 7 above) and the T052 numbers for the PR description.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none. T001 must come before T003, since both edit `package.json`; T004 can
  run alongside.
- **Foundational (Phase 2)**: depends on Setup. T005 → T006. T007 → T008. The T005–T006 and
  T007–T008 tracks can run in parallel. Together they block every stylesheet change.
- **US1 (Phase 3)**: depends on Foundational. Batches A to E run in order. Within a batch, the
  rename task comes first, then the restructure tasks, which are [P] because each touches one
  file, then the checkpoint. In batch E, T034 (the test) comes right before T035 (the rename
  that makes it pass).
- **US2 (Phase 4)**: depends on US1, because the files must be SCSS. T038 → T039 and T040 →
  T041–T045 → T046.
- **US3 (Phase 5)**: T047 and T048 depend only on Foundational and T039, since the probe uses the
  `media` partial. T049 depends on US2, because it documents the partials.
- **Polish (Phase 6)**: depends on all stories.

### User story dependencies

- **US1 (P1)**: independent; it is the MVP.
- **US2 (P2)**: builds on US1's SCSS files, but US1 stands without it.
- **US3 (P3)**: the checks need only Foundational; the docs need US2.

### Parallel opportunities

- T004 alongside T001–T003.
- The visual-suite track (T005–T006) alongside the contract-test track (T007–T008).
- T010 and T011; T013–T019; T022–T024; T027–T032; each group runs after its batch's rename task.
- T040 alongside T039. Once T039 is done, T041–T044 run together; once T040 is done, T045.
- T049 and T051 alongside other polish work.

---

## Parallel Example: User Story 1, batch B

```text
# After T012 (atoms renamed and committed), run all atom restructures together:
Task: "T013 Restructure src/components/atoms/Button/Button.module.scss"
Task: "T014 Restructure src/components/atoms/Heading/Heading.module.scss"
Task: "T015 Restructure src/components/atoms/ProgressBar/ProgressBar.module.scss"
Task: "T016 Restructure src/components/atoms/SegmentedControl/SegmentedControl.module.scss"
Task: "T017 Restructure src/components/atoms/Spinner/Spinner.module.scss"
Task: "T018 Restructure src/components/atoms/TextInput/TextInput.module.scss"
Task: "T019 Restructure src/components/atoms/Toggle/Toggle.module.scss"
# Then T020 checkpoint (visual + tests) before batch C.
```

## Parallel Example: User Story 2

```text
# After T039 and T040:
Task: "T041 media mixins in the six atom stylesheets"
Task: "T042 media mixins in ErrorMessage and FileDropZone"
Task: "T043 media.narrow in ResultsToolbar, VisualizationPanel, WordTable"
Task: "T044 media.reduced-motion in AppLayout and global.scss"
Task: "T045 chart mixins in BarChart, WordCloud, ZipfChart"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1: Setup.
2. Phase 2: Foundational. Baselines and the contract test must be green on CSS.
3. Phase 3: US1, batch by batch, with a zero-diff checkpoint after each.
4. **Stop and validate**: quickstart §1–§3. This is shippable: every stylesheet is nested SCSS.

### Incremental delivery

1. Setup + Foundational → safety nets in place.
2. US1 → all SCSS, pixel-identical (MVP).
3. US2 → named breakpoints and shared mixins.
4. US3 → error-path test, verified checks, README.
5. Polish → budgets, comment audit, full gate.

### Commit rhythm

- One rename-only commit per batch (T009, T012, T021, T026, T035), so Git follows each file.
- One commit per batch checkpoint for the restructuring.
- The T034 "only SCSS" test is written just before the last rename and committed with T037, so
  every commit on the branch passes CI.

---

## Notes

- [P] tasks touch different files and don't depend on incomplete tasks.
- Every restructure task is judged by `npm run test:visual` reporting zero changed pixels. A
  non-zero diff means the cascade moved; check rule 5 (override placement) first.
- The visual baselines in `tests/e2e/visual.spec.ts-snapshots/` are local and untracked. Don't
  regenerate them after T006, or you lose the CSS reference. If they are lost, check out the T006
  commit and recapture.
