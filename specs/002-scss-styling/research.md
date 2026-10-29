# Research: SCSS Styling

Decisions for [plan.md](./plan.md). Each entry gives the decision, why, and what else was
considered. Measurements were taken on 2026-10-29 against `main` at `4c7117d`.

## Starting point

- 32 stylesheets, 1,316 lines: 29 component CSS Modules, the shared `src/styles/chart.module.css`,
  and the global `src/styles/global.css`, which `@import`s `src/styles/tokens.css`.
- Width media queries: `(max-width: 480px)` in SegmentedControl, ResultsToolbar,
  VisualizationPanel, and WordTable; `(min-width: 640px)` in ErrorMessage. No others.
- `@media (prefers-reduced-motion: reduce)` in 9 files: Button, ProgressBar, SegmentedControl,
  Spinner, TextInput, Toggle, FileDropZone, AppLayout, and global.
- `@media (prefers-color-scheme: dark)` once, in tokens.
- No `composes`, `:global`, `@layer`, `@supports`, or `@container`.
- Four components look classes up dynamically: `styles[variant]` (Button, Text), `styles[Tag]`
  (Heading), `styles[slot]` (ResultsLayout).
- Shipped CSS: one file, 20,739 bytes raw, 4,987 bytes gzipped. Initial JS: 149.3 KB gzipped
  against a 150 KB budget, so 0.7 KB of headroom. The CSS Modules class-name map is part of that
  JS.

## R1. Sass compiler

**Decision**: Add `sass` (Dart Sass, pure JavaScript) pinned at exactly `1.105.1` as a
development dependency. Vite 8.3.5 compiles `.scss` with it when it is installed; no Vite plugin
is needed.

**Rationale**: Vite supports Sass out of the box once a compiler package is present (its peer range
is `sass ^1.70.0`). `1.105.1` (2026-09-29) is the newest release at least two weeks old;
`1.105.2` and later are under two weeks old. The pure-JavaScript package has no
platform-specific binary, so macOS development and the Ubuntu CI runner install the same thing. At
32 small files, compile speed is not a concern.

**Alternatives considered**:

- `sass-embedded`: faster on large codebases, but it downloads a native Dart binary per platform.
  That is extra install surface for no measurable gain at this size. If both packages were
  installed, Vite would prefer `sass-embedded`, so only one is added.
- Native CSS nesting (no preprocessor): it nests, but it cannot name a breakpoint for use in a
  media query (`@custom-media` is not supported in browsers) or share a group of declarations.
  It does not meet FR-004 or FR-005, and the user asked for SCSS.

## R2. Module system and load path

**Decision**: Share code between stylesheets with `@use` and namespaces only, for example
`@use 'media';` then `@include media.narrow { … }`. Set Vite's
`css.preprocessorOptions.scss.loadPaths` to the absolute path of `src/styles`, so that any
stylesheet can write `@use 'media';` without a relative path. Do not auto-inject anything through
`additionalData`.

**Rationale**: An explicit `@use` at the top of a file tells the reader where every name comes
from, which is the point of this feature. Namespaces (`media.narrow`, `chart.focus-ring`) say
which shared file a mixin lives in. A load path replaces `../../../styles/media` with `media`.
`@import` is deprecated in Dart Sass and will be removed in 3.0.

**Alternatives considered**:

- `additionalData` injecting `@use 'media' as *;` into every file: the names would appear from
  nowhere, and every stylesheet would pay for the import even when it doesn't use it.
- Relative `@use '../../../styles/media'`: needs no config, but it is noisy, and it breaks when a
  component moves between atomic levels.
- A Vite alias (`@use '@styles/media'`): it works in Vite but not in a plain Sass compile, and it
  adds config for no gain over a load path.

## R3. Design tokens stay runtime custom properties

**Decision**: Rename `tokens.css` to `_tokens.scss`; its content is unchanged, including every
contrast-ratio comment. `global.scss` loads it with `@use 'tokens';`, which replaces the CSS
`@import`. Do not turn any token into a Sass variable. Sass variables are used only for the
breakpoints (R4), because custom properties are not allowed inside media queries.

**Rationale**: Dark mode redefines the tokens under `@media (prefers-color-scheme: dark)` while
the page is running. A Sass variable is fixed when the stylesheet is built, so turning tokens into
Sass variables would lock in the light theme (FR-006). A `@use` of a partial that holds only plain
CSS emits that CSS once, in the same place the CSS `@import` put it.

**Alternatives considered**: mirror the tokens as Sass variables as well as custom properties. That
would create two sources of truth for every color and breaks Principle II.

## R4. Named breakpoints and media mixins

**Decision**: Add one partial, `src/styles/_media.scss`, holding:

- `$narrow-max: 480px` and `$wide-min: 640px`.
- `@mixin narrow`, which emits `@media (max-width: $narrow-max)`.
- `@mixin wide`, which emits `@media (min-width: $wide-min)`.
- `@mixin reduced-motion`, which emits `@media (prefers-reduced-motion: reduce)`.

Each wraps `@content`. The values match today's queries exactly, so the compiled output does not
change (FR-007).

**Rationale**: Each breakpoint value then appears once (SC-004), and call sites read as intent
(`@include media.narrow`). `wide` is used only once, but FR-004 requires every width breakpoint to
be named, and keeping both widths in one file shows how they relate. `reduced-motion` is used in
9 files, so it qualifies under FR-005. The dark-scheme query appears only once, so it stays
inline (FR-005).

**Alternatives considered**:

- A generic `@mixin below($width)` / `above($width)`: call sites would carry raw numbers again,
  which defeats SC-004.
- A breakpoint map with lookup functions: an extra layer for two values (Principle II).

## R5. Which repeated patterns become shared mixins

**Decision**: Extract a pattern only when two or more stylesheets repeat the same declarations
for the same purpose. Add one partial, `src/styles/_chart.scss`, used by BarChart, WordCloud, and
ZipfChart:

| Mixin              | Declarations                                                         | Used by                                  |
| ------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| `chart.mark`       | `cursor: pointer; outline: none;`                                    | BarChart `.mark`, WordCloud `.word`, ZipfChart `.point` |
| `chart.focus-ring` | `stroke: var(--color-focus); stroke-width: 2px;`                     | BarChart and ZipfChart `.hit` on focus   |
| `chart.label-text` | `fill: var(--color-text); font-size: 13px; font-weight: 600;`        | BarChart `.label`, ZipfChart `.axisLabel` |
| `chart.value-text` | `fill: var(--color-text-muted); font-size: 12px; font-variant-numeric: tabular-nums;` | BarChart `.value`, ZipfChart `.axis text` |

Plus `media.reduced-motion` from R4. Everything else stays inline.

**Rationale**: A scan of every declaration block with two or more declarations found exactly these
cross-file repeats, plus one coincidence: `display: inline-flex; align-items: center; gap:
var(--space-2)` in ResultsToolbar `.topN` and ZipfChart `.legend li`. Those two are unrelated
(a form row and a chart legend), and tying them together would mean that changing one silently
changes the other, so they stay inline. WordCloud's focus style uses a 3px stroke with
`paint-order`, which is a different pattern, so it stays inline too. Mixins, rather than new shared
classes, keep the markup and the compiled CSS unchanged.

**Alternatives considered**: move the repeats into `chart.module.scss` as classes and add those
classes in the TSX. That changes markup and selectors, which is not like-for-like and risks
FR-007.

## R6. Nesting rules that keep the cascade unchanged

A probe compile with `sass@1.105.1` showed two behaviours that drive these rules:

1. A nested `@media` (or a mixin that emits one) is written out **in place**, right after its
   parent rule, not where the old file kept it (often at the end).
2. Declarations written after a nested rule are split into a **second copy** of the parent rule,
   to keep their order. Sass does not warn about this in this version.

**Decision**: Converted stylesheets follow these rules, and [the authoring
contract](./contracts/stylesheet-authoring.md) restates them for future authors:

- **Declarations first.** In a rule, declarations come before any nested rule or `@include` that
  emits a rule. Otherwise Sass duplicates the selector in the output.
- **Nest by element.** An element's states (`&:hover`, `&:focus-visible`, `&[data-*]`),
  pseudo-elements (`&::before`), and media overrides (`@include media.narrow`,
  `@include media.reduced-motion`) are nested under that element's rule.
- **Context selectors nest under the element they style.** A rule such as
  `.zone[data-dragging='true'] .icon` styles the icon, so it is written inside `.icon` as
  `.zone[data-dragging='true'] & { … }`. That keeps everything that styles one element in that
  element's block (SC-003).
- **Override placement.** Because of behaviour 1, an override that used to sit at the end of the
  file now comes right after the rule it is nested in. Before moving one, check whether a later
  rule with equal specificity sets the same property on the same element. If one does, nest the
  override inside that later rule instead (where it overrides that rule). Today the only such
  overrides are reduced-motion ones, and the global reduced-motion rule in `global.scss` already
  applies `!important` to animation and transition timing. That limits the risk, but the visual
  check (R7) confirms each file.
- **At most three selector levels**, counting each nested rule as a level. Media mixins do not
  count, because they add no selector (FR-003).
- **No `&` suffix concatenation** (`&-title`, `&Title`). Every class name stays written out in full
  so it can be found by search, and so that the class-name check (R8) and FR-008 hold.
- **Keep selectors as written.** Sass drops the quotes in `[data-dragging='true']`. That doesn't
  change matching, and the source keeps the quotes.

**Rationale**: These rules make the readable form also the safe one. Nesting changes neither
specificity (`&` stands for the parent selector exactly) nor which elements match. Only source
order can move, and the override-placement rule handles that.

**Alternatives considered**:

- Keep the reduced-motion blocks at the end of each file, unnested: no cascade risk, but it keeps
  the scattering that US1 exists to remove.
- Rely on Lightning CSS minification to merge the repeated `@media` blocks: Vite 8 minifies with
  Lightning CSS by default, but merging is a size optimization, not something to depend on for
  correctness.

## R7. Proving nothing visible changed

**Decision**: Before converting anything, add a Playwright suite, `tests/e2e/visual.spec.ts`,
with every test tagged `@visual`. Run it with a new `npm run test:visual` script (Chromium only).
It takes full-page screenshots with `toHaveScreenshot({ animations: 'disabled', maxDiffPixels: 0 })`
across this matrix:

- **Screens**: upload; processing (the progress bar and live counters masked); each error message;
  results in each visualization (bar chart, word cloud, Zipf chart, table); results filtered and
  searched.
- **Interaction states**: a dragged file over the drop zone (`data-dragging`), a hovered bar with
  its tooltip, a keyboard-focused control, a toggled toggle.
- **Conditions**: light and dark colour scheme, a 1280 px desktop viewport and a 390 px phone
  viewport, and reduced motion on and off.

Baselines are written from the CSS version (`npm run test:visual -- --update-snapshots`) on the
developer's machine. They are git-ignored, because screenshots differ between macOS and Linux.
After each batch of conversions, `npm run test:visual` must report zero changed pixels.
`npm run test:e2e` excludes `@visual` (as it does `@perf`), so CI behaves as before.

Also compare the shipped CSS once, before and after: gzipped size against SC-005, and a skim of
the rules in the compiled output.

**Rationale**: Pixel comparison is exactly what SC-002 asks for. Using one machine and one browser
removes font and platform noise, and the word cloud is already deterministic (`placeWords` uses a
seeded random). The a11y suite already reaches every one of these screens in both themes, so the
visual suite reuses its helpers. Once this feature is done, the suite stays as the safety net for
any later change that should not change how the app looks; nothing else covers that.

**Alternatives considered**:

- Commit baselines and run the suite in CI: the baselines would have to be generated inside the
  Linux CI image and kept in sync. That is a lot of upkeep for a check that only matters during
  style-only refactors.
- Compare `getComputedStyle` for every element: it also catches non-visual properties, but
  layout-dependent values vary with fonts, and SC-002 is about what people see.
- Compare compiled CSS byte for byte: R6's in-place media output changes rule order by design, so
  the output cannot be identical even when it renders the same.

## R8. A permanent stylesheet check in `npm test`

**Decision**: Add a contract test, `tests/contract/stylesheets.test.ts`, which runs in the
existing `unit` Vitest project, and so in `npm run check` and CI. It runs four checks:

1. **Only SCSS**: no `.css` file exists under `src/` (FR-001, SC-001).
2. **Every stylesheet compiles**: each `.scss` file goes through Vite's own pipeline, via
   `preprocessCSS` with the config from `resolveConfig`, so it uses exactly the build's load paths
   and options. A Sass error fails the test with Sass's message, which names the file and line
   (FR-011, locally as well as at build time).
3. **Every class a component uses exists**: `preprocessCSS` returns each CSS Module's local class
   names (`modules`). For each `.tsx` file that imports a `.module.scss`, every `binding.name` and
   `binding['name']` must be one of those names. Dynamic lookups (`binding[expr]`) must be listed
   in a table in the test, and each entry is typed
   `satisfies Record<ButtonVariant, true>` (and the same for Text variants, Heading tags, and
   ResultsLayout slots). The compiler then rejects the table if a variant is added or removed, and
   the test checks that every key in it is a class. A dynamic lookup that isn't in the table fails
   with a message saying to add it (FR-008).
4. **Breakpoints are named**: no `@media` that mentions `width` appears outside `_media.scss`
   (FR-004, SC-004).

**Rationale**: Today a missing class renders silently as unstyled markup: `vite/client` types a CSS
Module as `{ readonly [key: string]: string }`, and Vitest replaces CSS Modules with a proxy that
returns every key. This test is the only automated guard for FR-008. Going through Vite's API
rather than calling `sass` directly means the test and the build can never disagree about load
paths.

**Alternatives considered**:

- Generate typed `.d.ts` files for CSS Modules (`typed-scss-modules`, `vite-plugin-sass-dts`):
  typecheck would catch misses, including dynamic ones, but that adds a dependency and generated
  files to keep in sync, which is more than the four dynamic call sites justify.
- Process CSS Modules in the `dom` test project (`test.css.include`) and assert classes in
  component tests: that adds a Sass compile to every component test run, and it would only catch
  classes that tests happen to assert.

## R9. Formatting and linting

**Decision**: Rely on Prettier, which already formats `.scss` with the project's `.prettierrc.json`
and is already part of `npm run format:check` and `npm run check`, plus R8's compile check. Do not
add Stylelint. The nesting-depth limit (FR-003) and the authoring rules in R6 are checked in code
review against [the authoring contract](./contracts/stylesheet-authoring.md).

**Rationale**: FR-010 asks that formatting problems fail the check. Prettier does that, and it also
rejects SCSS it cannot parse. Compile errors such as an unknown mixin or variable are caught by
R8. Stylelint with `stylelint-config-standard-scss` would also enforce nesting depth, but it is a
new dependency tree that would mainly enforce rules review already covers on a 32-file codebase
(Principle II).

**Alternatives considered**: Stylelint plus `max-nesting-depth`. It is the upgrade path if
reviewers keep finding over-nested or misordered rules.

## R10. Conversion approach

**Decision**:

1. Rename each file with `git mv` (`X.module.css` → `X.module.scss`) in its own commit, so that
   `git log --follow` and blame keep the history.
2. Convert in batches by atomic level: global and tokens, atoms, molecules, organisms with the
   chart styles, then templates. Run `npm run test:visual` and `npm test` after each batch.
3. Rewrite each file's structure only. Values, comments, and class names are unchanged.
4. Record any style bug found on the way in the PR description, without fixing it.

**Rationale**: Small batches keep any pixel difference traceable to a handful of files. Renaming
separately from rewriting lets Git track each file across the conversion.

**Class names**: In the build, Vite generates CSS Modules names with a fixed-length hash, so the
names in the JS class-name map stay the same length across the rename. The 0.7 KB of JS headroom
is still checked with `npm run size` after the conversion.

## R11. Contributor documentation

**Decision**: Add a "Styles" section to `README.md`. It covers where stylesheets live; the SCSS
Modules convention; the `media` and `chart` partials and how to `@use` them; the rule that tokens
stay custom properties; and a link to [the authoring
contract](./contracts/stylesheet-authoring.md) for the nesting rules. Update the `styles/` line in
the project-structure tree.

**Rationale**: FR-012 and SC-008. The README is where contributors already look for project
conventions such as the atomic-design import rule.
