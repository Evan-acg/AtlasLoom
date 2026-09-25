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

The change is complete only when the global structure review and the applicable AtlasLoom verification evidence are both reported.
