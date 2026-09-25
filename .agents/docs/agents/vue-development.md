# AtlasLoom Vue Development Supplement

Read the global `ai-development-workflow` skill's `vue.md` reference first. This document adds AtlasLoom-specific ownership and dependency rules; it does not duplicate the global Vue component, state, and one-way data-flow guidance.

## Feature placement

- Feature views belong in `src/features/<feature>/views/` and coordinate the feature page.
- Feature components belong in `src/features/<feature>/components/` and remain focused on a coherent UI responsibility.
- Feature composables, stores, APIs, and types belong in their respective feature-owned directories.
- Put code in `src/shared/` only when it has no single feature owner and is used by at least two features.

## Dependency boundaries

- App shell code must not import feature internals.
- A feature must not import another feature's internal path; expose cross-feature behavior through the owning feature's public `index.ts`.
- Use the `@/` alias across app, feature, and shared boundaries. Relative imports are acceptable within one feature or app-shell area.
- Keep route composition in `src/router/` and feature-owned route records in the feature's public API when applicable.

## UI verification

Follow `DESIGN.md` for visual decisions and the browser inspection workflow in `AGENTS.md` for page-level or interaction changes. Do not treat a component split as complete until its data flow, feature ownership, dependency direction, and affected interaction have been reviewed.
