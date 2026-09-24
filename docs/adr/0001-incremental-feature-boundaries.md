# Incremental Feature Boundaries

AtlasLoom starts as a small SPA shell without established product features, so app bootstrap, routing, app-level views, and global styles remain in their current locations while business capabilities are added under `src/features/<feature>/` as they emerge. Feature internals stay private across boundaries, and code moves to `src/shared/` only when it has no single feature owner and is used by at least two features; this avoids premature scaffolding while preserving clear ownership as the application grows.
