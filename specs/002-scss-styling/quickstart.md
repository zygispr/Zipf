# Quickstart: Validating SCSS Styling

How to prove the feature works end to end. Each scenario names the spec items it covers. The
rules being checked are in [the authoring contract](./contracts/stylesheet-authoring.md) and
[the data model](./data-model.md).

## Prerequisites

- Node 24.15 or later, then `npm ci`.
- Playwright Chromium: `npx playwright install chromium`.
- **Baselines from the CSS version.** Before the first stylesheet is converted, on the same
  machine you will compare on:

  ```sh
  npm run test:visual -- --update-snapshots
  ```

  This writes screenshots to `tests/e2e/visual.spec.ts-snapshots/`, which is git-ignored. Keep
  them until the conversion is merged. If you lose them, check out the commit that added the
  visual suite (before any conversion) and run the command again.
- **Size baseline**, measured from the CSS version: shipped CSS is 20,739 bytes raw and 4,987
  bytes gzipped; initial JS is 149.3 KB gzipped.

## 1. Nothing visible changed (US1, FR-007, SC-002)

```sh
npm run test:visual
```

**Expected**: every screenshot matches its baseline with zero changed pixels. That covers every
screen and interaction state in light and dark, at 1280 px and 390 px, with reduced motion on and
off. Playwright's HTML report shows a diff image for any mismatch.

## 2. Only SCSS, all compiling, all classes resolving (US1, FR-001, FR-004, FR-008, FR-011, SC-001, SC-004)

```sh
npm test -- tests/contract/stylesheets.test.ts
find src -name '*.css'
```

**Expected**: the contract test passes, and `find` prints nothing.

**Negative checks** (undo them afterwards):

- Rename one class in a component stylesheet, for example `.zone` to `.zones` in
  `FileDropZone.module.scss`. The test fails and names `FileDropZone.tsx` and `zone`.
- Add a width to a media query in a component, such as `@media (max-width: 480px)`. The test fails
  and says to use `media.narrow`.
- Add a value to `ButtonVariant` without a class. Typecheck fails on the dynamic-lookup table.

## 3. Readable structure (US1, US2, FR-002, FR-003, FR-005, FR-009, SC-003)

Open `src/components/molecules/FileDropZone/FileDropZone.module.scss` and compare it with the
example in [the authoring contract](./contracts/stylesheet-authoring.md#writing-a-rule).

**Expected**:

- Each element's states, context rules, and reduced-motion overrides are inside its own block.
- No selector appears twice at the top level.
- Nesting is at most three levels deep.
- The comments from the CSS version are still there.
- In the chart stylesheets, the repeated declarations are `@include chart.*`.

## 4. One place per breakpoint (US2, FR-004, SC-004)

```sh
grep -rn '480px\|640px' src --include='*.scss'
```

**Expected**: matches only in `src/styles/_media.scss`. Then change `$narrow-max` to `500px`, run
`npm run dev`, and narrow the window. The segmented control, results toolbar, visualization panel,
and word table all switch at 500 px. Revert the change.

## 5. Checks catch mistakes in new SCSS (US3, FR-010, FR-011)

Create `src/components/atoms/Probe/Probe.module.scss` containing:

```scss
@use 'media';
.probe {
  color:red;
  @include media.tiny { color: blue; }
}
```

Then run:

```sh
npm run check
npm run build
```

**Expected**: `npm run check` fails twice. Prettier reports the file as unformatted, and the
contract test reports `Undefined mixin` with the file and line. `npm run build` also fails with the
same file and line. Running `npm run dev` shows the error in the browser overlay. Delete the probe
afterwards.

## 6. Performance budgets unchanged (SC-005, SC-006)

```sh
npm run build && npm run size
for f in dist/assets/*.css; do gzip -9c "$f" | wc -c; done
npm run test:e2e:perf
npm run bench
```

**Expected**:

- Initial JS is at most 150 KB gzipped (149.3 KB before).
- Gzipped CSS is at most 5,086 bytes, which is 4,987 plus 2%.
- The perf e2e frame budgets and the benchmark pass.

## 7. Everything else still passes (SC-007)

```sh
npm run check && npm run test:coverage && npm run build && npm run test:e2e
```

**Expected**: all green, including the axe accessibility suite in both themes, with no assertion
changes in existing tests.

## 8. Docs are enough to find things (FR-012, SC-008)

Using only `README.md`'s "Styles" section, find where `media.narrow` and `chart.focus-ring` are
defined.

**Expected**: both can be found in under a minute.
