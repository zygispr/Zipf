# Feature Specification: SCSS Styling

**Feature Branch**: `002-scss-styling`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Use scss instead of css for styling for easier reading experience"

## User Scenarios & Testing *(mandatory)*

The people this feature serves are the developers and reviewers who read and change the app's
styles. The people who use the app (readers analyzing a book's word frequencies) must notice no
difference at all: this is a change to how styles are written, not to how the app looks or behaves.

### User Story 1 - Read a component's styles as one nested block (Priority: P1)

A developer opens a component's stylesheet to understand or change how one element looks. Today
the rules for that element are scattered: its base rule, its hover and focus states, its
`data-*` state variants, its pseudo-elements, and its reduced-motion and screen-size overrides each
live in a separate top-level rule that repeats the element's selector, often far apart in the file.
After this feature, every stylesheet is written in SCSS, and everything that applies to one element
sits nested under that element's rule, so the developer reads it top to bottom in one place.

**Why this priority**: This is the whole point of the request. Converting the stylesheets with
nesting delivers the readability gain on its own, even without any of the other stories.

**Independent Test**: Open any converted component stylesheet (for example, the file drop zone)
and confirm that each element's states, pseudo-elements, and media-query overrides are nested
under its base rule, while the running app looks and behaves exactly as before.

**Acceptance Scenarios**:

1. **Given** a component stylesheet that styled an element in several separate top-level rules,
   **When** a developer opens its converted version, **Then** the element's base styles, its
   interactive and `data-*` states, its pseudo-elements, and its media-query overrides appear in
   one nested block under the element's rule.
2. **Given** the converted stylesheets, **When** the app is built and opened in light and in dark
   mode, **Then** every screen looks identical to the version before the conversion.
3. **Given** a stylesheet that carried explanatory comments (for example, why an animation uses
   only transform and opacity, or which requirement a rule satisfies), **When** it is converted,
   **Then** those comments are kept next to the rules they explain.
4. **Given** the conversion is finished, **When** a developer searches the source for plain CSS
   stylesheets, **Then** none remain; every stylesheet is SCSS.

---

### User Story 2 - Reuse named breakpoints and shared style patterns (Priority: P2)

A developer writing a responsive rule today must type the raw screen width into each media query
and keep it in sync by hand, because runtime design tokens cannot be used inside media queries.
Patterns repeated across components (such as turning off motion for people who prefer reduced
motion, or the shared chart styles) are copied rather than named. After this feature, breakpoints
and repeated patterns are defined once and referred to by name, so a reader sees intent
("on narrow screens", "when motion is reduced") instead of magic numbers.

**Why this priority**: It builds on the conversion in Story 1 and removes duplication, but the
readability win of Story 1 stands without it.

**Independent Test**: Change the value of one named breakpoint in its single definition, rebuild,
and confirm every component that uses it responds at the new width, with no other file edited.

**Acceptance Scenarios**:

1. **Given** media queries that use the same screen width in more than one stylesheet, **When**
   the developer reads them after conversion, **Then** they refer to one named breakpoint defined
   in a single shared place.
2. **Given** a style pattern repeated across two or more stylesheets, **When** it is converted,
   **Then** it is defined once and used by name where it was previously copied.
3. **Given** a pattern used in only one stylesheet, **When** it is converted, **Then** it stays
   inline and is not extracted into a shared definition.

---

### User Story 3 - Write new styles in SCSS with the same safety checks (Priority: P3)

A developer adds a new component and writes its stylesheet. The project's formatter, linter, and
checks treat SCSS the same way they treated CSS, and the project's contributor documentation tells
them where shared breakpoints and patterns live and how styles are organized, so new styles follow
the same conventions without guesswork.

**Why this priority**: It keeps the codebase consistent after the conversion, but it only matters
once Stories 1 and 2 exist.

**Independent Test**: Add a new SCSS stylesheet with a formatting mistake and a syntax error, run
the project's standard check command, and confirm both are reported; then fix them and confirm the
check passes.

**Acceptance Scenarios**:

1. **Given** a new or changed SCSS stylesheet, **When** the project's standard check runs locally
   or in continuous integration, **Then** formatting and syntax problems in it are reported and
   fail the check.
2. **Given** a developer starting work on styles, **When** they read the contributor
   documentation, **Then** it explains where shared breakpoints and patterns are defined and how
   to import them into a component stylesheet.
3. **Given** a stylesheet whose SCSS cannot be compiled, **When** the app is built or the dev
   server is running, **Then** the developer sees an error that names the file and line, and the
   build fails rather than shipping missing styles.

---

### Edge Cases

- **Theme switching**: Light and dark themes switch at runtime from the visitor's system setting.
  Design tokens (colors, spacing, shadows, timing) must therefore remain runtime values. Replacing
  them with build-time constants would freeze one theme and break dark mode.
- **Contrast notes on tokens**: The token file documents a measured contrast ratio for each
  color. These notes must survive the conversion unchanged and stay next to their colors.
- **Scoped class names**: Component styles are scoped per component, and the app's markup refers
  to them by class name. Every class name a component uses must still resolve after conversion;
  a missing class must surface as a failing check, not as silently unstyled markup.
- **Keyframe animations**: Animations defined inside a component stylesheet (for example, the
  drop-zone icon's float, ring, and hop) must keep their names and behavior, and their
  reduced-motion overrides must still turn them off.
- **Shared chart styles**: Styles shared by several charts must stay shared after conversion, not
  be duplicated into each chart.
- **Over-nesting**: Nesting deeper than needed makes styles harder to read and raises selector
  specificity, which can change which rule wins. Nesting must follow the structure of the markup
  and must not change the cascade.
- **Build-time-only definitions**: Shared breakpoints and patterns must not add any CSS to the
  shipped app on their own; only the rules that use them produce output.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every stylesheet in the app, both component-scoped and global, MUST be authored in
  SCSS; no plain CSS stylesheets may remain in the source.
- **FR-002**: Styles that apply to one element (its states, `data-*` variants, pseudo-elements,
  descendant rules, and media-query overrides, including reduced-motion overrides) MUST be nested
  under that element's rule instead of repeated as separate top-level rules.
- **FR-003**: Nesting MUST NOT go more than three selector levels deep, and MUST NOT raise the
  specificity of any rule beyond what it had before conversion.
- **FR-004**: Screen-width breakpoints used in media queries MUST be defined once, by name, in a
  single shared place, and every media query that uses a breakpoint MUST refer to it by that name.
- **FR-005**: A style pattern repeated in two or more stylesheets MUST be defined once and reused
  by name; a pattern used in only one stylesheet MUST stay inline.
- **FR-006**: Design tokens that vary by theme or are read at runtime MUST remain runtime values,
  so that light and dark themes continue to switch from the visitor's system setting.
- **FR-007**: The rendered appearance and behavior of every screen, in both light and dark themes,
  at both phone and desktop widths, and with reduced motion on and off, MUST be identical before
  and after the conversion.
- **FR-008**: Every class name a component refers to MUST continue to resolve to styles after
  conversion.
- **FR-009**: Explanatory comments in the existing stylesheets, including the contrast-ratio
  notes on color tokens and references to requirements and research notes, MUST be preserved next
  to the rules they describe.
- **FR-010**: The project's formatter and standard check command MUST cover SCSS stylesheets and
  fail on formatting problems in them, both locally and in continuous integration.
- **FR-011**: A stylesheet that cannot be compiled MUST fail the build and the dev server MUST
  report the file and line of the error.
- **FR-012**: The contributor documentation MUST describe how stylesheets are organized, where
  shared breakpoints and patterns are defined, and how a component stylesheet uses them.
- **FR-013**: The shipped app MUST contain only compiled CSS; no SCSS compilation may happen in
  the visitor's browser.

### Key Entities

- **Component stylesheet**: The styles for one component, scoped to it and kept next to the
  component's code. Contains nested rules for each element the component renders.
- **Global stylesheet**: Styles that apply to the whole page (base element styles, page
  background) and the design tokens.
- **Design token**: A named runtime value (color, spacing, radius, shadow, timing) shared across
  components, some of which change between light and dark themes.
- **Shared breakpoint**: A named screen width used in media queries, defined once and used at
  build time only.
- **Shared style pattern**: A named, reusable group of declarations used in two or more
  stylesheets, defined once and used at build time only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the app's stylesheets (currently 32) are SCSS, and zero plain CSS
  stylesheets remain in the source.
- **SC-002**: A pixel comparison of every screen (upload, processing, results with each
  visualization, and error states) in light and dark themes, at phone and desktop widths, shows
  zero differences between the versions before and after conversion.
- **SC-003**: In every converted component stylesheet, a reader finds all the styles for any one
  element in a single contiguous block; no element's selector is repeated as a separate top-level
  rule elsewhere in the same file.
- **SC-004**: Each screen-width breakpoint value appears in exactly one place in the source.
- **SC-005**: The total gzipped size of the shipped styles (the bytes a visitor downloads) grows
  by no more than 2% compared with before the conversion, and the initial JavaScript budget
  (150 KB gzipped) is still met.
- **SC-006**: The app's existing performance budgets (page load, interaction response, layout
  shift, and frame budgets for animations) are all still met.
- **SC-007**: All existing automated tests, including accessibility checks, pass without changes
  to what they assert.
- **SC-008**: A developer new to the project can locate where a given breakpoint or shared
  pattern is defined in under one minute using only the contributor documentation.

## Assumptions

- The "easier reading experience" is for developers and reviewers who read the style source, not
  for visitors to the app; the visible app does not change.
- All existing stylesheets are converted as part of this feature, rather than only new ones, since
  a mix of CSS and SCSS would make the codebase harder, not easier, to read.
- The conversion is a like-for-like rewrite. Fixing or redesigning styles is out of scope; any
  style bug found during conversion is recorded separately rather than fixed silently, so the
  before/after comparison stays exact.
- Design tokens stay as runtime values (see FR-006). Build-time named values are used only for
  things runtime values cannot express, such as breakpoints in media queries.
- Component styles stay scoped per component and co-located with each component, as they are
  today.
- The existing visual end-to-end tooling can capture before/after screenshots for the pixel
  comparison in SC-002.
- One SCSS compiler is added as a development-only dependency; nothing is added to what visitors
  download.
