# Source Architecture

This document defines where application code belongs and which source areas may depend on each other. Keep the structure incremental: do not create empty feature or shared directories before they contain code.

## Source layout

```text
src/
├── main.ts                 # application bootstrap
├── App.vue                 # application shell
├── router/
│   └── index.ts            # route composition and fallback route
├── views/                  # app-level pages only (home, not-found)
├── styles/                 # global reset and application styles
├── features/               # create when a product capability exists
│   └── <feature>/
│       ├── index.ts        # public API, only when consumed externally
│       ├── routes.ts       # feature routes, when the feature owns routes
│       ├── assets/         # feature-owned processed assets
│       ├── components/    # feature-owned Vue components
│       ├── composables/   # feature-owned composables
│       ├── stores/        # feature-owned Pinia stores
│       ├── views/         # feature pages
│       └── types/         # feature-owned types
└── shared/                 # create when code is genuinely cross-feature
    ├── assets/
    ├── components/
    ├── composables/
    ├── stores/
    ├── types/
    └── utils/
```

The tree is illustrative; create each directory only when it has a real file. The current home and not-found pages remain app-level routes. Do not add new business files directly under `src/`; feature-owned views and stores belong to their feature. Pinia state belongs to the feature that owns it, or to `shared/stores/` only when the state is genuinely shared.

## Ownership and dependencies

| Importer                                                                   | May import                                                    | Must not import                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| App shell (`main.ts`, `App.vue`, `router/`, app-level `views/`, `styles/`) | App shell, a feature's public `index.ts`, `shared/`           | Feature internals                                          |
| A feature                                                                  | Its own files, `shared/`, another feature's public `index.ts` | Another feature's internal files, app-shell implementation |
| `shared/`                                                                  | Other `shared/` modules and external packages                 | App-shell or feature modules                               |

- A feature owns its views, components, composables, stores, assets, and types. Keep implementation details private by default.
- When another feature or the app shell needs a feature, expose the required API from that feature's `index.ts`; never import a sibling feature's internal path.
- App-shell development tooling may use a feature's `development.ts` entry for development-only routes or experiments; this entry is not part of the production facade and must not be imported by production feature code.
- Put a capability in `shared/` only when it has no single feature owner and is used by at least two features. Keep single-feature helpers inside their feature.
- `src/router/index.ts` owns the top-level route table and not-found route. When a feature owns production routes, export its route records from `routes.ts` through the feature's public `index.ts`; development-only routes may be composed from the feature's `development.ts` entry.
- Avoid circular dependencies between features. Move genuinely common behavior to `shared/` only when it meets the ownership and reuse rule above.

## Files and assets

- Keep tests next to the code they cover and name them `*.spec.ts` (or `*.spec.tsx` if applicable).
- Use kebab-case for directories and ordinary TypeScript modules. Use PascalCase for Vue single-file component names.
- Put files that must be served unchanged at a stable public URL in the repository's `public/` directory.
- Keep build-processed assets next to their owning feature in `assets/`; put them in `src/shared/assets/` only when multiple features use them.
- Use the `@/` alias for imports across app/feature/shared boundaries. Relative imports are fine within one feature or app-shell area.

## Enforcement

`pnpm lint` enforces the source dependency boundaries. ESLint classifies `src/` as the app shell, with nested feature and shared elements; cross-feature and app-to-feature imports resolve only through a feature's public entry point. `pnpm typecheck` also verifies the `@/` alias.

This is an incremental structure, not a migration mandate: keep the app shell small, add feature folders when product capabilities are introduced, and do not move unrelated code just to make the tree look uniform.
