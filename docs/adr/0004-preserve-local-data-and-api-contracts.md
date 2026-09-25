# Preserve Local Data and API Contracts During Structural Refactoring

The structural refactor will preserve the local data layout and `formatVersion: 1`, the `/api` routes and HTTP contracts, and the `{ error: string }` error response shape. Any future contract or persistence migration must be a separate decision and change, so structural cleanup does not put existing local data or clients at risk.
