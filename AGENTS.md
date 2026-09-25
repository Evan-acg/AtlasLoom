## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues; use `gh`. See `.agents/docs/agents/issue-tracker.md`.

When asked what to work on next in this repo or to choose an existing task, inspect GitHub Issues before routing to a skill. List open issues, read the relevant map/spec/tickets, and verify readiness, assignees, and blockers/dependencies with `gh`. Recommend the next clearly ready, unassigned ticket with no open blockers; if multiple candidates are equally eligible, present them for the user to choose. Use `/grill-with-docs` for a new idea that is not already represented by an issue.

### Triage labels

Use the default five triage labels. See `.agents/docs/agents/triage-labels.md`.

### Domain docs

Use the single-context layout. See `.agents/docs/agents/domain.md`.

## Source architecture

Follow the root `ARCHITECTURE.md` for file placement and source dependency boundaries.

## UI design

Follow the root `DESIGN.md` for UI implementation and visual changes.

## AI development workflow

- For any code generation or code modification, invoke the global `ai-development-workflow` skill and read `.agents/docs/agents/ai-development-workflow.md` before editing. The global skill defines the reusable discovery, design, implementation, review, and verification sequence; the local document defines AtlasLoom-specific constraints.
- When a change touches Vue SFCs, Vue reactivity, composables, Pinia, or feature UI state, also read the global skill's `vue.md` reference and `.agents/docs/agents/vue-development.md`. They define the reusable Vue rules and AtlasLoom-specific boundaries respectively.
- Treat these documents as delivery gates for product code. Prototype code under `src/**/prototypes/` is the only default exception; it must be reorganized before becoming production code.

## Browser and visual inspection

- Use the project-local Playwright CLI for the running app and publicly accessible webpages. Do not sign in, reuse stored credentials, or save browser state.
- For the app, start Vite with `pnpm exec vite --host 127.0.0.1`, then open the URL with `pnpm exec playwright-cli -s=atlasloom open <url>`. For a public webpage, open its URL directly.
- Read page structure with `pnpm exec playwright-cli -s=atlasloom snapshot`; check browser errors with `pnpm exec playwright-cli -s=atlasloom console error`.
- Before invoking the CLI, set `PLAYWRIGHT_MCP_OUTPUT_DIR` to the operating system's temporary directory (`$env:TEMP` in PowerShell, `${TMPDIR:-/tmp}` in POSIX shells) so automatic snapshots and logs stay out of the repository.
- For UI changes, capture screenshots with `screenshot --filename=<absolute-temp-path>`, then inspect each image with the image-capable file reader. Do not leave screenshots in the repository.
- For page-level layout changes, inspect 375×812, 768×1024, 1024×768, 1280×800, and 1440×900 viewports. For small component changes, inspect 1–2 relevant sizes.
- Change viewport dimensions with `pnpm exec playwright-cli -s=atlasloom resize <width> <height>`.
- Close the named browser session with `pnpm exec playwright-cli -s=atlasloom close` when finished. Run `pnpm browser:install` if Chromium is not installed.

## Command execution

- Run commands that finish on their own in the foreground with a maximum wait of 2 minutes. If a command reaches that limit, stop it and report the timeout.
- Commands that keep running or wait for ongoing input (such as `pnpm dev`, watchers, and interactive processes) must be started in the background so the agent is not blocked waiting for them to exit. Ensure the launch command itself returns promptly.
- After background startup, use short, bounded commands to check process status or service readiness; each check is subject to the 2-minute limit.
- Run an over-2-minute finite command in the background and poll for completion only when the user explicitly authorizes that exception for the task.
