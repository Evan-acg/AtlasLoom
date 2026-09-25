# ADR 0005: Character Profiles Baseline and Parallel Boundaries

## Status

Accepted

## Context

The character-profiles capability is the only product feature in the current
application. Its existing implementation works, but the workspace page and
composable currently coordinate projects, characters, tags, route state,
refreshing, and recovery together. The server repository also combines HTTP
handling, business rules, JSON validation, and file-system persistence.

This refactor must preserve user-visible behavior while giving the next
tickets boundaries that can be implemented independently. This ADR records
the baseline before product-code changes and makes the ownership decisions
explicit.

## Decision

Keep projects, characters, tags, the project workspace, soft deletion, and
restore inside one `character-profiles` feature. Split responsibilities inside
that feature without introducing another feature or a feature-specific
`shared` abstraction.

The dependency direction is:

```text
app shell and build composition
        -> character-profiles public entry point
        -> character-profiles views, components, composables, APIs, and types
        -> character-profiles server integration and persistence

character-profiles implementation -> shared utilities only
shared utilities                  -> external packages only
```

The app shell may consume only the feature's intentional public entry point.
Feature internals remain private. The Vite server plugin is feature-owned; its
registration is build composition and must not make the app shell depend on
server implementation modules. No single-feature code moves to `shared/`.

## Current Baseline

The following commands were run before this refactor changed product code:

| Check                  | Result                            | Baseline interpretation                   |
| ---------------------- | --------------------------------- | ----------------------------------------- |
| `pnpm lint`            | Passed (`eslint` and `stylelint`) | No existing lint failure recorded         |
| `pnpm typecheck`       | Passed                            | No existing type failure recorded         |
| `pnpm exec vitest run` | 4 files, 41 tests passed          | No existing unit failure recorded         |
| `pnpm test:e2e`        | 11 tests passed                   | No existing browser-flow failure recorded |

This is the first recorded baseline for this refactor. There are no failures
to carry forward from the recorded run; failures appearing after a ticket
must be compared with these four results and treated as new until explained.
Failures from runs before this baseline were not recorded and cannot be
retroactively classified.

## Current Responsibility Map

| Responsibility                                                          | Current owner                                                                                           | Refactor boundary                                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| App bootstrap, top-level routes, app-level views, global styles         | `src/main.ts`, `src/App.vue`, `src/router/`, `src/views/`, `src/styles/`                                | App shell remains outside feature internals                                                                                            |
| Feature public surface                                                  | `src/features/character-profiles/index.ts`                                                              | #33 owns the narrow facade; prototype export must remain development-only                                                              |
| Workspace page orchestration and route synchronization                  | `ProjectWorkspaceView.vue`                                                                              | #33 establishes the host seam; later slices consume it                                                                                 |
| Page-level project, character, tag, selection, loading, and error state | `useProjectWorkspace.ts`                                                                                | #33 establishes resource-level interfaces; resource slices own their state behind those interfaces                                     |
| Mixed workspace presentation and form drafts                            | `ProjectWorkspaceContent.vue`                                                                           | Split by #34, #35, and #36; no later slice owns the whole file                                                                         |
| Project journey                                                         | Project API plus project portions of workspace views                                                    | #34 owns project UI, project state/API adapter/type tests after the #33 seam                                                           |
| Tag management and character filtering                                  | Tag API plus tag/filter portions of workspace views                                                     | #35 owns tag/filter UI, state/API adapter/type tests after the #33 seam                                                                |
| Character journey                                                       | Character API plus character portions of workspace views                                                | #36 owns character UI, state/API adapter/type tests after the #33 seam                                                                 |
| Restore use case and user-visible error conversion                      | `ArchivedProjectView.vue`, `SoftDeleteControls.vue`, and workspace code currently duplicate parts of it | #33 owns the feature-level restore/error boundary; #34/#35/#36 consume it without redefining the behavior                              |
| HTTP transport adapters                                                 | `src/features/character-profiles/api/` and `src/shared/utils/request.ts`                                | Feature API modules own resource paths and payloads; shared request remains transport-only until a concrete cross-feature reuse exists |
| HTTP routing and error response shape                                   | `src/features/character-profiles/server/project-api.ts`                                                 | #37 may reorganize server internals but preserves `/api` and `{ error: string }`                                                       |
| File storage, JSON validation, and business repository rules            | `src/features/character-profiles/server/project-repository.ts`                                          | #37 owns the server persistence split and its tests                                                                                    |
| Vite API registration and data-directory selection                      | `src/features/character-profiles/server/vite-plugin.ts`                                                 | Remains feature-owned and does not become a runtime consumer surface                                                                   |
| Development workspace prototype                                         | `src/features/character-profiles/prototypes/WorkspaceFlowPrototype.vue`                                 | #38 owns isolation and removal of unnecessary production exports                                                                       |

The current map describes existing responsibility, not permission to expand a
module. A ticket may extract a responsibility only within its assigned slice.

## Parallel Ticket Boundaries

Ticket #33 must finish first. It owns the public entry point, the app-shell
integration seam, and the stable resource-level interfaces. After #33, the
following tickets are independent:

| Ticket                 | Exclusive ownership                                                                                          | Must not modify                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| #34 Project journey    | Project list/detail/form, project lifecycle state and API adapter, and project behavior tests                | Character or tag journey modules; persistence internals; the established #33 facade/seam     |
| #35 Tags and filtering | Tag creation/rename/assignment, filter state and presentation, tag API adapter, and filtering behavior tests | Project or character journey modules; persistence internals; the established #33 facade/seam |
| #36 Character journey  | Character list/detail/form, character lifecycle state and API adapter, and character behavior tests          | Project or tag journey modules; persistence internals; the established #33 facade/seam       |
| #37 Persistence        | File-system adapter, JSON codec/version validation, project/character/tag repositories, and server/API tests | Runtime Vue views, composables, public facade, and browser UI behavior                       |

The tickets must not concurrently edit `ProjectWorkspaceView.vue`,
`ProjectWorkspaceContent.vue`, `useProjectWorkspace.ts`, `index.ts`,
`ArchivedProjectView.vue`, `SoftDeleteControls.vue`, or another shared
workspace host. #33 must establish the host seam before the vertical slices
start. If a vertical slice needs host wiring, it adds its owned module and
consumes that interface; host changes wait for the sequential integration
ticket. Resource-specific files may be changed only by their owning ticket.

The remaining cleanup and final integration tickets are intentionally
sequential after these four slices, as recorded by the GitHub blocking edges.

## Invariants and External Contracts

The following are not refactor seams and cannot be changed by #32 through #39:

- Existing user-visible project, character, tag, soft-delete, restore, repair,
  loading, error, keyboard, focus, and responsive behavior.
- The local `data/` directory layout, JSON fields, backups, and
  `formatVersion: 1`.
- `/api` paths, HTTP methods, request bodies, success response wrappers,
  status behavior, and the `{ error: string }` error response shape.
- Development prototype availability through its development-only entry.
- The rule that page-level state belongs to its feature composable unless a
  real cross-route or cross-component owner justifies a Pinia store.

Any persistence or API migration requires a separate decision and is outside
this structural refactor.

## Consequences

The four implementation seams can be reviewed and tested independently, and
an agent can identify the allowed files before editing. The cost is that the
workspace host interface must be deliberately designed before the vertical
journeys proceed. This is preferable to parallel edits to the current
monolithic workspace component, which would make behavior and ownership
ambiguous.

The baseline is a verification artifact, not a claim that the existing
structure already satisfies the target boundaries. In particular, the
current public entry exports both the production workspace and prototype, the
workspace content component mixes resource journeys, and the repository still
mixes persistence with business rules; the later tickets own those changes.
