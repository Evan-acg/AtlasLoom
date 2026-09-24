## Agent skills

### Issue tracker

Issues and specs live in this repo's GitHub Issues; use `gh`. See `.agents/docs/agents/issue-tracker.md`.

### Triage labels

Use the default five triage labels. See `.agents/docs/agents/triage-labels.md`.

### Domain docs

Use the single-context layout. See `.agents/docs/agents/domain.md`.

## Source architecture

Follow the root `ARCHITECTURE.md` for file placement and source dependency boundaries.

## UI design

Follow the root `DESIGN.md` for UI implementation and visual changes.

## Browser and visual inspection

- Use the project-local Playwright CLI for the running app and publicly accessible webpages. Do not sign in, reuse stored credentials, or save browser state.
- For the app, start Vite with `pnpm exec vite --host 127.0.0.1`, then open the URL with `pnpm exec playwright-cli -s=atlasloom open <url>`. For a public webpage, open its URL directly.
- Read page structure with `pnpm exec playwright-cli -s=atlasloom snapshot`; check browser errors with `pnpm exec playwright-cli -s=atlasloom console error`.
- Before invoking the CLI, set `PLAYWRIGHT_MCP_OUTPUT_DIR` to the operating system's temporary directory (`$env:TEMP` in PowerShell, `${TMPDIR:-/tmp}` in POSIX shells) so automatic snapshots and logs stay out of the repository.
- For UI changes, capture screenshots with `screenshot --filename=<absolute-temp-path>`, then inspect each image with the image-capable file reader. Do not leave screenshots in the repository.
- For page-level layout changes, inspect 375×812, 768×1024, 1024×768, 1280×800, and 1440×900 viewports. For small component changes, inspect 1–2 relevant sizes.
- Change viewport dimensions with `pnpm exec playwright-cli -s=atlasloom resize <width> <height>`.
- Close the named browser session with `pnpm exec playwright-cli -s=atlasloom close` when finished. Run `pnpm browser:install` if Chromium is not installed.
