# Data Model: SCSS Styling

This feature has no runtime data: nothing is stored, sent, or computed at runtime. The "entities"
are the source files that make up the styles, and how they relate. The validation rules map each
spec requirement to the place it is checked.

## Entities

### Component stylesheet

A CSS Module scoped to one component, kept next to it.

| Field         | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| Path          | `src/components/<level>/<Name>/<Name>.module.scss` (29 files)                |
| Classes       | The local class names it defines; the component reads them through `styles`  |
| Uses          | The partials it loads with `@use` (`media`, and `chart` for chart components) |
| Keyframes     | `@keyframes` it defines, if any (FileDropZone, Spinner, …); names unchanged  |

**Relationships**: imported by exactly one component `.tsx`. Loads zero or more shared partials.

### Shared chart stylesheet

`src/styles/chart.module.scss`: a CSS Module with the classes BarChart, WordCloud, and ZipfChart
share (`figure`, `canvas`, `svg`, `tableLink`, `loading`). Same fields as a component
stylesheet. It is imported by three components as `chartStyles`.

### Global stylesheet

`src/styles/global.scss`: the reset, base element styles, page background, utility classes such
as `visually-hidden`, and the global reduced-motion rule. It is not a CSS Module. It is imported
once, by `src/main.tsx`, and loads `tokens` and `media`.

### Design token

A CSS custom property (`--color-primary`, `--space-3`, `--duration-base`, …) defined in
`src/styles/_tokens.scss`. Color tokens are redefined for dark mode. Each color token carries a
comment with its measured contrast ratio.

**Rule**: it stays a runtime custom property; there is no Sass variable mirror (FR-006).

### Shared breakpoint

A Sass variable in `src/styles/_media.scss` (`$narrow-max: 480px`, `$wide-min: 640px`) with a
mixin that wraps `@content` in the matching media query. It exists only at build time.

### Shared style pattern

A Sass mixin with no arguments in `src/styles/_media.scss` (`reduced-motion`) or
`src/styles/_chart.scss` (`mark`, `focus-ring`, `label-text`, `value-text`). It exists only at
build time.

```text
main.tsx ──imports──▶ global.scss ──@use──▶ _tokens.scss
                                  └─@use──▶ _media.scss
<Name>.tsx ──imports──▶ <Name>.module.scss ──@use──▶ _media.scss
                                           └─@use──▶ _chart.scss   (chart components only)
BarChart / WordCloud / ZipfChart.tsx ──imports──▶ chart.module.scss
```

## Validation rules

| Rule                                                                       | Requirement      | Checked by                         |
| -------------------------------------------------------------------------- | ---------------- | ---------------------------------- |
| No `.css` files under `src/`                                               | FR-001, SC-001   | `stylesheets.test.ts`              |
| Every `.scss` compiles with the build's settings; errors name file and line | FR-011           | `stylesheets.test.ts`, `npm run build` |
| Every class a component uses exists in its stylesheet, including dynamic lookups | FR-008     | `stylesheets.test.ts`              |
| Width media queries only in `_media.scss`                                  | FR-004, SC-004   | `stylesheets.test.ts`              |
| Element states, pseudo-elements, and overrides are nested under the element | FR-002, SC-003  | Review against the authoring contract |
| At most three selector levels; no added specificity                        | FR-003           | Review; `test:visual`              |
| Repeated patterns use shared mixins; one-off patterns stay inline          | FR-005           | Review                             |
| Tokens are custom properties; dark mode still switches                     | FR-006           | `test:visual` (dark), a11y e2e     |
| Identical rendering in every state                                         | FR-007, SC-002   | `test:visual`                      |
| Comments preserved                                                         | FR-009           | Review (diff against the CSS)      |
| Prettier formats and checks `.scss`                                        | FR-010           | `npm run check`                    |
| Contributor docs describe the layout                                       | FR-012, SC-008   | Review of `README.md`              |
| Only compiled CSS is shipped                                               | FR-013           | `npm run build` output in `dist/`  |
