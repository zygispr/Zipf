# Implementation Plan: SCSS Styling

**Branch**: `002-scss-styling` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-scss-styling/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Rewrite all 32 stylesheets as SCSS so that each element's states, pseudo-elements, and media
overrides are nested in one block. The rendered app must stay pixel-identical. Vite 8 compiles
SCSS once the `sass` package is installed, so the build needs only one new development dependency
and a load path. Two small partials hold the build-time shared pieces: `_media.scss` (two named
breakpoints and a reduced-motion mixin) and `_chart.scss` (four chart mark mixins). Design tokens
stay runtime CSS custom properties, so dark mode keeps working.

Three things prove the change is safe. A local-only Playwright `@visual` suite compares
screenshots against baselines taken from the CSS version, with zero pixel tolerance. A permanent
contract test checks four things: there are no `.css` files left, every stylesheet compiles
through Vite's own pipeline, every class a component uses exists (including the dynamic lookups),
and widths in media queries appear only in the media partial. The existing check, end-to-end,
accessibility, and performance suites guard the rest. See [research.md](./research.md) for every
decision.

## Technical Context

**Language/Version**: SCSS (Dart Sass 1.105.1), compiled at build time to CSS; TypeScript 6.0.3
and React 19.3.1 are unchanged; Node 24 LTS for tooling

**Primary Dependencies**: Vite 8.3.5's built-in Sass support plus `sass` 1.105.1 (new,
development-only, exact pin, research R1). Lightning CSS stays as Vite's default CSS minifier. No
runtime dependency changes

**Storage**: N/A

**Testing**: Vitest 5.0.5. A new contract test, `tests/contract/stylesheets.test.ts`, runs in the
existing `unit` project (research R8). Playwright 1.64.1 gets a new `@visual` suite,
`tests/e2e/visual.spec.ts`, run with `npm run test:visual` and kept out of CI (research R7). The
existing unit, DOM, contract, e2e, axe, and perf suites are unchanged

**Target Platform**: Unchanged. Current evergreen browsers, last two major versions, served
statically from GitHub Pages. Browsers receive only compiled CSS (FR-013)

**Project Type**: Client-only single-page web app (existing). This feature changes how styles are
written and built, not runtime behaviour

**Performance Goals**: No runtime change. Shipped CSS grows by at most 2% gzipped (4,987 bytes
now, ceiling 5,086). Initial JS stays within its 150 KB gzipped budget (149.3 KB now). The existing
LCP, INP, CLS, and frame budgets in the perf e2e suite still pass (SC-005, SC-006)

**Constraints**:

- Pixel-identical rendering across theme, viewport, motion preference, and interaction state
  (FR-007).
- Design tokens remain runtime custom properties (FR-006).
- The CSS Modules class-name map in the JS bundle must not grow; only 0.7 KB of JS headroom is
  left.
- Exact dependency pins (constitution).

**Scale/Scope**: 32 stylesheets (1,316 lines): 29 component modules, 1 shared chart module, the
global stylesheet, and the tokens. Plus 2 new partials, 1 new contract test, 1 new e2e suite, and
changes to the Vite config, `package.json` scripts, `.gitignore`, and `README.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle                  | Gate                                                                                         | Status |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| I. Code Quality            | Prettier already formats and checks `.scss` (`npm run check`); ESLint and typecheck are unaffected (`vite/client` types `*.module.scss`). Nesting, ordering, and comment rules are written down in [the authoring contract](./contracts/stylesheet-authoring.md) and checked in review. No dead code: every old `.css` file is removed in the same change that adds its `.scss` (`git mv`). | PASS |
| II. Simplicity             | One new dev dependency (`sass`), justified in R1: it is the compiler the request needs, and Vite needs no plugin. The two partials each have 2 or more real uses (R4, R5); coincidental duplicates stay inline. Rejected as extra layers: Stylelint (R9), typed CSS Module generation (R8), auto-injected imports (R2), mirroring tokens as Sass variables (R3). | PASS |
| III. Testing Discipline    | Test-first: the contract test and the visual baselines exist before the first file is converted (R7, R8). FR-001, FR-004, FR-008, and FR-011 get a permanent automated test that runs in CI; FR-007 is checked locally against pixel baselines. Existing tests are not changed (SC-007). | PASS |
| IV. User Experience First  | No user-facing change by design. The axe suite runs again in both themes, and the visual suite covers focus, hover, drag, and reduced-motion states. | PASS |
| V. Performance by Design   | Budgets stated above. SCSS is compiled at build time, so nothing new runs in the browser. CSS size, the JS budget, and the perf e2e suite are measured before and after (quickstart §6). | PASS |
| VI. Scalability in Mind    | No runtime state or load change. Growth assumption: stylesheets grow with components, about 32 today and 10x would be about 320. The first bottleneck at 10x is the contract test, which compiles every stylesheet in turn; Sass compiles a file this size in milliseconds, so that is still a few seconds. If it isn't, compile in parallel. No new logging or metrics; nothing runs at runtime. | PASS |

**Post-design re-check (after Phase 1)**: PASS. The design adds no further dependencies or
layers. The partials, the contract test, and the visual suite are exactly as gated above. The
visual suite stays local, as the safety net for future style-only changes (R7), and stays out of
CI because its baselines are machine-specific. That is a scope choice, not a violation, so nothing
goes in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-scss-styling/
├── plan.md                         # This file
├── research.md                     # Phase 0: decisions R1–R11
├── data-model.md                   # Phase 1: style source entities and validation rules
├── quickstart.md                   # Phase 1: validation scenarios
├── contracts/
│   └── stylesheet-authoring.md     # Phase 1: rules every stylesheet follows
├── checklists/
│   └── requirements.md             # Spec quality checklist
└── tasks.md                        # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── main.tsx                                   # import './styles/global.scss'
├── styles/
│   ├── _tokens.scss                           # was tokens.css; content unchanged
│   ├── _media.scss                            # NEW: $narrow-max, $wide-min, narrow, wide, reduced-motion
│   ├── _chart.scss                            # NEW: mark, focus-ring, label-text, value-text
│   ├── global.scss                            # was global.css; @use 'tokens', 'media'
│   └── chart.module.scss                      # was chart.module.css
└── components/
    ├── atoms/<Name>/<Name>.module.scss        # 10 files, was .module.css
    ├── molecules/<Name>/<Name>.module.scss    # 8 files
    ├── organisms/<Name>/<Name>.module.scss    # 9 files (BarChart, WordCloud, ZipfChart @use 'chart')
    └── templates/<Name>/<Name>.module.scss    # 2 files
    # each <Name>.tsx: import path changes from .module.css to .module.scss

tests/
├── contract/
│   └── stylesheets.test.ts                    # NEW: only-SCSS, compiles, classes resolve, named breakpoints
└── e2e/
    └── visual.spec.ts                         # NEW: @visual pixel comparison (local only)

vite.config.ts      # css.preprocessorOptions.scss.loadPaths = [<abs>/src/styles]
package.json        # devDependency sass 1.105.1; scripts: test:visual; test:e2e excludes @visual
.gitignore          # tests/e2e/*-snapshots/
README.md           # new "Styles" section; styles/ line in the structure tree
```

**Structure Decision**: Keep the existing single-project layout. Component stylesheets stay next
to their components as CSS Modules, only with the `.module.scss` extension. The build-time shared
code goes in `src/styles/`, next to the tokens and global styles it belongs with. It is held in
Sass partials (leading `_`), which emit no CSS until they are used.

## Implementation Approach

The order below makes the safety nets exist before any style moves (research R10). Details are in
the research entries cited.

1. **Tooling first**: add `sass`, the Vite load path, the `test:visual` script and the `@visual`
   exclusion from `test:e2e`, the git-ignore entry, and `tests/e2e/visual.spec.ts`. Capture
   baselines from the CSS version (R7).
2. **Contract test**: add `tests/contract/stylesheets.test.ts` with the compile and class-name
   checks, both of which pass on the CSS version. Write the only-SCSS check later, just before
   the last batch is renamed. It fails only until that rename, so no committed test is ever red
   or skipped (R8).
3. **Shared partials**: add `_media.scss` and `_chart.scss` (R4, R5).
4. **Convert in batches**: global and tokens, then atoms, molecules, organisms (with
   `chart.module.scss`), and templates. Each file is `git mv`'d, then restructured following the
   authoring contract, and the `.tsx` import is updated. After each batch, run `npm run
   test:visual` (zero diff) and `npm test` (R6, R10).
5. **Docs**: add the README "Styles" section (R11).
6. **Verify**: run every scenario in [quickstart.md](./quickstart.md), including the size budgets.

## Complexity Tracking

No constitution violations; nothing to justify.
