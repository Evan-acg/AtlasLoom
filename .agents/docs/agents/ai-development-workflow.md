# AtlasLoom AI Development Supplement

Invoke the global `ai-development-workflow` skill before product code changes, then use this document for AtlasLoom-specific constraints. The global skill owns the reusable workflow, SOLID checks, code-smell review, and scope-based verification.

## Repository sources of truth

- Read `ARCHITECTURE.md` for source placement, ownership, dependency direction, public feature APIs, naming, and aliases.
- Read `DESIGN.md` for UI implementation and visual changes.
- Read `CONTEXT.md` and relevant `docs/adr/` records when domain terms or recorded decisions are involved.
- Search the existing feature before creating a file, directory, API, type, composable, store, or shared abstraction.

## AtlasLoom boundaries

- Put product capabilities under `src/features/<feature>/`; keep app shell code under its documented locations.
- A feature may import its own files, `shared/`, and another feature's public `index.ts`, but not another feature's internals.
- Create `shared/` code only when there is no single feature owner and at least two features use it.
- Expose feature internals through `index.ts` only when the app shell or another feature needs them.
- Use `@/` across app, feature, and shared boundaries; relative imports are fine within one area.

## Project exceptions and verification

- `src/**/prototypes/` is the default location for throwaway experiments. Reorganize prototype code before production use.
- Use the scripts in `package.json` for formatting, linting, type-checking, tests, and builds; select the smallest applicable set described by the global workflow.
- For page or interaction changes, follow the browser and viewport inspection rules recorded in `AGENTS.md` and the repository instructions.

## Quality gates

The global workflow's gate contract lives in the global skill's `quality-gates.md`. AtlasLoom implements it with these commands:

- **CRAP (Cleaner step)**: run `pnpm test:coverage`, then `pnpm crap:check` to enforce the threshold (`pnpm crap` prints the same report without failing). The threshold is `6`; only production `.ts` files are analyzed.
- **Mutation testing (Hardener step)**: `pnpm mutation` runs the full local suite. Pull requests gate the changed production `.ts` files with `STRYKER_BREAK=100` (no unjustified surviving mutant); the nightly full run uses the default `break 60`.
- **`.vue` scope**: neither gate analyzes `.vue`; their scripts are covered by lint, typecheck, and E2E tests instead.
- **Ratchet**: gate only the production files the change touches. Every function in a touched file must be within threshold, so pre-existing violations in a touched file must be cleaned with that change; do not widen the scope to silence the gate.
- **Waivers**: a surviving mutant may only be silenced with an inline Stryker disable comment plus a stated reason. A waiver is itself a reviewable change.
- **Report**: state the gate command, the scope, and the before/after value alongside the change.

The change is complete only when the global structure review and the applicable AtlasLoom verification evidence are both reported.
