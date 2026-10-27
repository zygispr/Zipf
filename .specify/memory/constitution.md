# Zipf Constitution

## Core Principles

### I. Code Quality

Code is written to be read, changed, and trusted by the next person who touches it.

- Code MUST pass the project's formatter, linter, and type checker (where the language has one)
  with zero errors before merge; warnings MUST NOT be suppressed without an inline justification.
- Names MUST describe intent; functions and modules MUST have a single, clear responsibility.
- Errors MUST be handled explicitly at the boundary where they can be acted on; failures MUST
  NOT be silently swallowed.
- Dead code, commented-out code, and unexplained TODOs MUST NOT be merged.
- Every change MUST be reviewed (human or agent-assisted review against this constitution)
  before it lands on the main branch.

**Rationale**: Consistent, readable code keeps the cost of change low and makes defects visible
early instead of in production.

### II. Simplicity Over Complexity

The simplest solution that meets today's requirements wins.

- Features MUST be built for current, specified requirements (YAGNI); speculative extension
  points, configuration, and abstractions MUST NOT be added "just in case".
- A new abstraction, layer, or pattern MUST have at least two concrete uses or a documented,
  specified need before it is introduced.
- A new dependency MUST be justified in the plan (what it replaces, why in-house code is worse)
  and SHOULD be preferred over hand-rolled code only when it is well maintained and small in
  surface area.
- Any deviation from the simplest approach MUST be recorded in the plan's Complexity Tracking
  table with the simpler alternative that was rejected and why.

**Rationale**: Complexity is the main driver of bugs, slow onboarding, and slow delivery; it is
cheap to add later and expensive to remove.

### III. Testing Discipline (NON-NEGOTIABLE)

Untested behavior is unfinished behavior.

- Every user-facing behavior and bug fix MUST be covered by automated tests that run in CI.
- Tests SHOULD be written before or alongside the implementation (test-first); for bug fixes,
  a failing test that reproduces the bug MUST exist before the fix.
- Tests MUST be deterministic, isolated, and fast; flaky tests MUST be fixed or quarantined
  with a tracked issue within one working day.
- Contracts between components (APIs, schemas, inter-service messages) MUST have contract or
  integration tests.
- Tests MUST assert on observable behavior, not implementation details, so refactors do not
  require rewriting tests.
- The full test suite MUST pass before merge; failing tests MUST NOT be skipped to unblock a
  merge.

**Rationale**: A trustworthy test suite is what makes simplicity, refactoring, and fast iteration
safe.

### IV. User Experience First

Features are judged by how they feel to the person using them.

- Every feature spec MUST describe its primary user journeys and acceptance scenarios from the
  user's point of view before implementation begins.
- User-facing interfaces MUST be consistent in terminology, layout, and interaction patterns
  across the product.
- Every user-visible operation MUST provide clear feedback: loading states for waits, actionable
  error messages (what happened and what to do next), and confirmation for destructive actions.
- Interfaces MUST meet WCAG 2.2 AA accessibility guidelines where a visual UI exists, and MUST be
  usable on the device classes the spec targets.
- User-facing text MUST be written in plain language; internal error codes or stack traces MUST
  NOT be shown to end users.

**Rationale**: Correct software that is confusing, inaccessible, or silent about failures still
fails its users.

### V. Performance by Design

Performance is a requirement, specified and verified like any other.

- Every feature spec MUST state measurable performance targets for its critical paths (e.g.
  latency percentiles, throughput, memory, startup or page-load time) or explicitly adopt the
  defaults in Quality Standards & Constraints.
- Algorithms and data access MUST be chosen with known complexity; unbounded work on user input
  (N+1 queries, unpaginated lists, unbounded loops or memory growth) MUST NOT be merged.
- Performance-sensitive paths MUST have a benchmark or performance test, and regressions beyond
  the stated budget MUST block merge.
- Optimization beyond the stated targets MUST be driven by measurement (profiling data), not
  speculation, consistent with Principle II.

**Rationale**: Users experience performance directly; budgets set up front are far cheaper than
retrofitting speed later.

### VI. Scalability in Mind

Design so that growth is a configuration change, not a rewrite, without building for scale that
is not yet needed.

- Components MUST be stateless where practical; state MUST live in explicit, well-defined stores.
- Data models and APIs MUST support pagination, filtering, and versioning from their first
  release where collections or external consumers are involved.
- Long-running or bursty work MUST be designed so it can be moved off the request path (queues,
  background jobs) without changing its public contract.
- Each plan MUST state the expected load and growth assumptions and identify the first
  bottleneck expected at 10x that load.
- Systems MUST emit structured logs and key metrics sufficient to observe load, latency, and
  error rates in production.

**Rationale**: Clear boundaries and observability let the system grow incrementally; this
principle is balanced against Principle II, so scale work beyond stated assumptions requires
justification.

## Quality Standards & Constraints

These defaults apply unless a feature spec states stricter or explicitly justified alternatives:

- **Test coverage**: new and changed code MUST maintain at least 80% line coverage; critical
  business logic SHOULD target 90%+. Coverage is a floor, not a goal; meaningful assertions
  matter more than the number.
- **Interactive latency**: user-facing API responses MUST meet p95 < 200 ms under expected load;
  UI interactions MUST give visual feedback within 100 ms.
- **Web front-end** (if applicable): Largest Contentful Paint < 2.5 s, Interaction to Next Paint
  < 200 ms, Cumulative Layout Shift < 0.1 on the target devices.
- **Dependencies**: MUST be pinned to exact or locked versions and kept free of known critical
  vulnerabilities.
- **Security**: secrets MUST NOT be committed to the repository; all external input MUST be
  validated at system boundaries.

## Development Workflow & Quality Gates

- Work follows the Spec Kit flow: specify → (clarify) → plan → tasks → implement. Plans MUST
  include a Constitution Check that evaluates the design against every Core Principle.
- Changes land through small, focused pull requests or commits with a clear description of what
  and why.
- A change MAY merge only when all gates pass:
  1. Formatter, linter, and type checks pass (Principle I).
  2. Full automated test suite passes and coverage thresholds are met (Principle III).
  3. Performance budgets for affected critical paths are met (Principle V).
  4. Review confirms compliance with this constitution, and any complexity is justified in the
     plan's Complexity Tracking table (Principle II).
  5. User-facing changes have been verified against the spec's acceptance scenarios
     (Principle IV).

## Governance

- This constitution supersedes all other project practices and guidance. Where runtime guidance
  files (e.g. `CLAUDE.md` or other agent guidance files) conflict with it, this constitution wins.
- **Amendments** MUST be proposed as a change to this file that states the motivation, the
  affected principles, and any migration needed for existing code or in-flight plans. An
  amendment takes effect once merged to the main branch.
- **Versioning** follows semantic versioning:
  - MAJOR: a principle is removed or redefined in a backward-incompatible way.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications, wording, or typo fixes with no change in meaning.
- **Compliance review**: every plan's Constitution Check and every code review MUST verify
  compliance with the Core Principles. Violations MUST either be fixed or explicitly justified
  in the plan's Complexity Tracking table; unjustified violations block merge.
- The constitution SHOULD be reviewed for relevance at least once per quarter or whenever a
  recurring exception suggests a principle no longer fits.

**Version**: 1.0.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-10-27
