# Contract: Stylesheet Authoring

What every stylesheet in `src/` must follow, and what components can rely on. The automated
checks in `tests/contract/stylesheets.test.ts` enforce the rules marked **(tested)**. Code review
enforces the rest. Background for each rule is in [research.md](../research.md) (R2 to R8).

## Files

| Kind                 | Path                                              | Imported by                                        |
| -------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Component stylesheet | `src/components/<level>/<Name>/<Name>.module.scss` | `<Name>.tsx`: `import styles from './<Name>.module.scss';` |
| Shared chart classes | `src/styles/chart.module.scss`                    | BarChart, WordCloud, ZipfChart as `chartStyles`    |
| Global stylesheet    | `src/styles/global.scss`                          | `src/main.tsx` only                                |
| Design tokens        | `src/styles/_tokens.scss`                         | `global.scss` only, via `@use 'tokens';`           |
| Media partial        | `src/styles/_media.scss`                          | Any stylesheet, via `@use 'media';`                |
| Chart partial        | `src/styles/_chart.scss`                          | Chart component stylesheets, via `@use 'chart';`   |

- No `.css` files exist under `src/`. **(tested)**
- Every `.scss` file compiles with the build's own settings. **(tested)**
- Partials (files starting with `_`) emit no CSS on their own. The exception is `_tokens.scss`,
  which is plain CSS custom properties.

## Shared partials

`src/styles` is on the Sass load path, so a stylesheet anywhere in `src/` writes `@use 'media';`,
never a relative path. Always use the default namespace; no `as *`.

### `media`

| Name                          | Emits                                    |
| ----------------------------- | ---------------------------------------- |
| `media.$narrow-max`           | `480px`                                  |
| `media.$wide-min`             | `640px`                                  |
| `@include media.narrow`       | `@media (max-width: 480px) { … }`        |
| `@include media.wide`         | `@media (min-width: 640px) { … }`        |
| `@include media.reduced-motion` | `@media (prefers-reduced-motion: reduce) { … }` |

- A media query that tests a width appears only in `_media.scss`; everywhere else uses
  `media.narrow` or `media.wide`. **(tested)**
- To add a breakpoint, add a variable and a mixin here; never write a width at the call site.

### `chart`

| Mixin                       | Declarations                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `@include chart.mark`       | `cursor: pointer; outline: none;`                                     |
| `@include chart.focus-ring` | `stroke: var(--color-focus); stroke-width: 2px;`                      |
| `@include chart.label-text` | `fill: var(--color-text); font-size: 13px; font-weight: 600;`         |
| `@include chart.value-text` | `fill: var(--color-text-muted); font-size: 12px; font-variant-numeric: tabular-nums;` |

- A new shared mixin needs two or more stylesheets using it for the same purpose. A pattern used
  in one file stays inline.

## Design tokens

- Colors, spacing, radii, shadows, type sizes, and timing are CSS custom properties defined in
  `_tokens.scss`, and stylesheets use them with `var(--…)`. Dark mode redefines them while the
  page runs, so they must never become Sass variables.
- Sass variables exist only for values CSS cannot express at runtime. Today those are the
  breakpoints in `_media.scss`.

## Writing a rule

Each top-level rule is one element (one class). Inside it, in this order:

1. Declarations.
2. States and pseudo-elements of the same element: `&:hover`, `&:focus-visible`,
   `&[data-state='…']`, `&::before`.
3. Context rules that style this element from an ancestor: `.zone[data-dragging='true'] & { … }`.
4. Descendants it owns, only where the old CSS used a descendant selector: `.axis { line { … } }`.
5. Media overrides: `@include media.narrow { … }`, then `@include media.reduced-motion { … }`.

**Which block a selector like `A B` goes in.** It depends on the element being styled, `B`:

- `B` is a class that has its own top-level rule (as `.hit`, `.dot`, and `.icon` do). Nest the
  selector inside `B` as a context rule, `A &`. For example, `.mark:hover .hit` becomes
  `.mark:hover & { … }` inside `.hit`. Everything that styles `.hit` is then in one place.
- `B` is a bare tag, a pseudo-class, or a class with no rule of its own (such as `line`, `text`,
  `> :last-child`, or the `li` in `.legend li`). Nest it inside `A` as a descendant. For example,
  `.axis text` becomes `text { … }` inside `.axis`.
- `B` is in a selector list where both forms apply. Use the first rule, so that `B`'s own block
  stays complete.

Rules:

- No declarations after a nested rule or `@include` that emits a rule.
- At most three selector levels; media mixins don't count as a level.
- Never build a class name with `&` (`&-title`, `&Title`). Write every class name in full.
- An override that used to come later in the file stays nested in the rule it overrides. If a
  later rule with equal specificity sets the same property on the same element, nest the override
  in that later rule instead.
- Comments stay next to the rules they explain, including requirement references (`FR-016`) and
  research references (`research R8`).
- `@keyframes` stay at the top level of the file, after the rule that uses them, with their names
  unchanged.

Example, from `FileDropZone.module.scss` (abridged):

```scss
@use 'media';

.zone {
  position: relative;
  border: 3px dashed var(--color-border);
  transition: border-color var(--duration-base) var(--ease-out);

  &:hover,
  &[data-dragging='true'] {
    border-color: var(--color-primary);
  }

  &[data-dragging='true'] {
    transform: scale(1.02);

    @include media.reduced-motion {
      transform: none;
    }
  }

  @include media.reduced-motion {
    transition: none;
  }
}

.icon {
  /* Idle: the icon bobs gently, inviting a drop (FR-016). */
  animation: icon-float 3.2s var(--ease-in-out) infinite;

  .zone:hover & {
    animation-duration: 1.6s;
  }

  .zone[data-dragging='true'] & {
    animation: icon-hop 0.7s var(--ease-in-out) infinite;

    @include media.reduced-motion {
      animation: none;
    }
  }

  @include media.reduced-motion {
    animation: none;
  }
}
```

## Class names (component ↔ stylesheet)

- Every `styles.name` or `styles['name']` a component uses is a class in the stylesheet it
  imports. **(tested)**
- A dynamic lookup (`styles[variant]`) is allowed only when it is listed in the dynamic-lookup
  table in `tests/contract/stylesheets.test.ts`, typed against the component's own union type, so
  every value of the union is listed. A value marked `true` must be a class; one marked `false`
  deliberately has none. **(tested)**

Current dynamic lookups:

| Component     | Lookup            | Values come from         |
| ------------- | ----------------- | ------------------------ |
| Button        | `styles[variant]` | `ButtonVariant`          |
| Text          | `styles[variant]` | `TextVariant`            |
| Heading       | `styles[Tag]`     | Heading's level/tag prop |
| ResultsLayout | `styles[slot]`    | its slot names; only `heading` has a class |

## Formatting

- Prettier formats `.scss` with the repository's `.prettierrc.json` (single quotes, 100 columns).
  `npm run format:check`, and therefore `npm run check`, fails on unformatted SCSS. **(tested by
  the check command)**
