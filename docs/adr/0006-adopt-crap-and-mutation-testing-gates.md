# ADR 0006: Adopt CRAP and Mutation Testing as Deterministic Quality Gates

## Status

Accepted

## Context

The AI development workflow asks for a structural review of the diff, but the
final judgement about whether code is trustworthy has come from reading it.
That does not scale, and it lets an agent be the sole judge of its own work,
including the tests it writes for its own code.

Two deterministic signals close that gap:

- **CRAP** combines cyclomatic complexity and test coverage into a single
  change-risk score. It locates functions that are complex and under-tested.
- **Mutation testing** seeds small faults into production code and checks
  whether the test suite kills them. It measures test effectiveness rather than
  test presence.

This ADR records the tools, thresholds, scope, and rollout chosen for
AtlasLoom, and the alternatives that were rejected after registry and local
verification.

## Decision

Adopt two gates, run as a repair loop (CRAP first, then mutation), for changed
production code.

### CRAP

- Tool: `ts-anti-patterns`, pinned to `1.0.3` (MIT).
- Input: `coverage/lcov.info` produced by `vitest run --coverage`
  (`@vitest/coverage-v8`, matching Vitest `5.0.1`).
- Threshold: `6`. Any production function whose CRAP score is greater than `6`
  fails the gate (`--threshold 6 --fail-above`).
- Scope: TypeScript production files under `src/`, excluding `*.spec.ts`,
  `src/**/prototypes/**`, and the feature `e2e/` directory.
- Ratchet: the gate analyzes only the production files changed by the pull
  request or push (`git diff` against the base). Every function in a touched
  file must be within threshold, so pre-existing violations are cleaned as their
  file is touched rather than blocking the whole repository. A finer
  per-function baseline (`--baseline`/`--fail-regression`) was evaluated but its
  regression semantics could not be confirmed against this tool version, so it
  is not used.

### Mutation testing

- Tool: `@stryker-mutator/core` `10.0.0` with
  `@stryker-mutator/vitest-runner` `10.0.0`, configured in
  `stryker.config.mjs`.
- Scope: `src/**/*.ts`, excluding tests, prototypes, and `e2e/`. `.vue` files
  are out of scope: Stryker core `10.0.0` instruments them with zero mutants
  (verified locally), so the gate covers `.ts` production files only. The
  historical `@stryker-mutator/vue-mutator` package is deprecated and does not
  change this.
- Changed-code gate: pull requests mutate only the changed production files and
  require a mutation score of `100` (`STRYKER_BREAK=100`), i.e. no unjustified
  surviving mutant on changed code. Equivalent or unreachable mutants are waived
  explicitly with an inline Stryker disable comment.
- Full-run gate: a nightly workflow and pushes to `dev` run the full mutation
  suite from `stryker.config.mjs` with the default `thresholds.break 60`, using
  Stryker's incremental result cache.

### Thresholds are a project choice

The CRAP value `6` is a deliberate choice for an AI-authored codebase. It is
**not** recorded here as an authoritative Uncle Bob rule: the widely repeated
"4 for humans, 6 or 8 for agents" split could not be confirmed against a
primary source during verification. The mutation `60`/`100` split follows
community practice (a score gate for the whole repository, a stricter
zero-unexplained-survivor gate for changed code).

## Rejected Alternatives

| Candidate                      | License          | Reason rejected                                                                                                        |
| ------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `crap4js`                      | CC-BY-NC-4.0     | Threshold hardcoded to 30, beta-only releases, and a non-commercial license unsuitable for adoption                    |
| `crap4ts`                      | GPL-3.0-or-later | Copyleft license and no benefit over the chosen tool                                                                   |
| `fe-scan`                      | ISC              | Version `0.0.15`, no CLI binary                                                                                        |
| `@barney-media/...`            | Apache-2.0       | Cannot spawn pnpm on Windows (`ENOENT`); not usable in this development environment                                    |
| Self-built analyzer            | n/a              | Building and maintaining a CRAP metric engine conflicts with preferring an off-the-shelf tool; kept only as a fallback |
| `@stryker-mutator/vue-mutator` | Apache-2.0       | Deprecated; core `10.0.0` produces zero mutants for `.vue`, so `.vue` stays out of mutation scope                      |

## Known Limitation

CRAP does not analyze `.vue` files, and Stryker instruments `.vue` with zero
mutants. Neither gate therefore covers single-file components. This is
acceptable because the source architecture requires business logic to live in
composables, stores, and server modules; `.vue` scripts are covered by lint,
typecheck, and end-to-end tests instead.

## Baseline

Recorded before the gates were enforced, on the `dev` branch:

| Check                                    | Result                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm test:coverage`                     | 10 files, 69 tests passed; 55.73% line coverage                         |
| `pnpm crap` (threshold 6, CC + coverage) | 46 of 329 production functions exceed 6; worst `mergeTag` at CRAP 126.2 |
| `pnpm exec stryker run --dryRunOnly`     | Initial test run succeeded (31 tests)                                   |
| Full mutation score                      | Not yet measured; the nightly run establishes it                        |

The 46 existing CRAP violations are the ratchet's starting point. They are not
regressions and must not be used to justify widening the scope of an unrelated
change.

## Consequences

- Trustworthiness becomes a reproducible command instead of a reading exercise,
  and the AI workflow can require gate evidence before a change is complete.
- The changed-code gates keep pull requests fast; the full mutation run is
  deferred to nightly and `dev` pushes via the incremental cache.
- The repository now owns two young tools. `ts-anti-patterns` is version `1.0.x`
  and must be pinned; Stryker is stable.
- The zero-survivor changed-code rule makes inline waivers a reviewed artifact:
  a waiver is a claim that a mutant is equivalent, and it must be justified.
- Mutation testing is slow. If the 15-minute pull-request budget is exceeded,
  narrow `--mutate`, lower concurrency, or move the strict rule to the nightly
  full run as a fallback.
- The changed-file ratchet is deliberately strict: editing a file that already
  has a violation requires bringing that file's functions within threshold. A
  small edit to a complex file can therefore be expensive; split the change or
  run the Cleaner step first.

## Fallbacks

- If `ts-anti-patterns` becomes unusable, fall back to a small analyzer built on
  the existing ESLint `complexity` rule plus Vitest LCOV output.
- If mutation testing cannot meet the pull-request time budget, keep it on the
  nightly full run and downgrade the pull-request job to report-only.
