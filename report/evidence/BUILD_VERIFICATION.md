# Build verification

This record separates checks executed in the local build environment from checks delegated to GitHub Actions or the final hosted deployment.

## Executed locally on 21 August 2026

- Fixture validation: passed; 3 canonical lesson-plan fixtures.
- Formatting: passed; all supported source/documentation files match Prettier.
- TypeScript project references: passed with no errors.
- ESLint: passed with zero warnings.
- Vitest: passed; 12 files and 25 unit/component tests.
- Vite production build: passed; 3,394 modules transformed.
- PWA generation: passed; 87 precache entries, manifest and service worker emitted.
- Production smoke: passed; `/`, `/demo`, `/manifest.webmanifest` and `/sw.js` returned HTTP 200.

Command executed:

```bash
pnpm fixtures:validate && pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm smoke
```

## Browser-suite environment note

The local Playwright invocation was attempted, but the runtime did not contain Chromium. The allowed environment could not download the browser archive (the CDN response was empty/truncated), so no browser assertion actually ran locally. This is an infrastructure precondition failure, not recorded as an application pass or failure.

## GitHub Actions verification

The `ChalkBox quality gate` workflow is configured to run:

- frozen-lockfile install;
- fixtures, types, lint, unit/component tests and production build;
- pinned Chromium installation;
- desktop/mobile critical journeys;
- axe WCAG A/AA serious/critical checks;
- production-build, Playwright-report and eight product-screenshot artifacts.

GitHub Actions run **#16** for commit `06678f9` completed successfully on 21 August 2026. Both the `verify` and `browser-tests` jobs passed. The browser suite reported **12 passed**, **2 intentional project-specific skips**, and no flaky retries; the workflow also uploaded the production build, Playwright report, and eight-screen product evidence set.

## Final hosted verification

After Supabase and Cloudflare Pages are configured, record the exact deployment URL, function health, live Gemini generation, indexed RAG result, auth callback, cross-browser share, PWA/offline reload and downloadable PDFs in `INTEGRATION_STATUS.md`.

No unexecuted browser or hosted check is represented as passing.
