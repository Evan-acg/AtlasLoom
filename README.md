# AtlasLoom

> A local-first workspace for organizing creative projects and their character archives.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is AtlasLoom?

AtlasLoom is a single-user application for managing creative projects and, as the feature grows, their fictional character archives. Project names and descriptions are stored as versioned JSON under the local `data/` directory, which is excluded from Git.

## Current capabilities

- Create, browse, and edit creative projects in a local workspace
- Persist projects as JSON through a local-only API
- Vue 3 and TypeScript application powered by Vite
- Vue Router history-mode routing with a not-found page
- Pinia ready for feature-owned application state
- UnoCSS utilities with the Wind3 preset

## Quick start

### Requirements

- Node.js `>=22.12`
- pnpm `11.9.0`

### Install and run

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts the web interface and local project API together, bound to `127.0.0.1`. Open the printed URL to manage projects; project data is written to `data/` and is not committed to Git.

## Contributing and feedback

Bug reports, ideas, and pull requests are welcome. Use [GitHub Issues](https://github.com/Evan-acg/AtlasLoom/issues) to report a problem or discuss a substantial change, and [Pull Requests](https://github.com/Evan-acg/AtlasLoom/pulls) to contribute.

## License

AtlasLoom is licensed under the [MIT License](LICENSE).
