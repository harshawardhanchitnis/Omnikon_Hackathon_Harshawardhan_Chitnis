# Build verification

This record separates checks executed in the local build environment from checks delegated to GitHub Actions or the final hosted deployment.

## Executed locally on 21 August 2026

- Fixture validation: passed; 4 canonical lesson-plan fixtures.
- Curriculum provenance validation: passed; 3 attributed sources and 23 original chunks.
- Formatting: passed; all supported source/documentation files match Prettier.
- TypeScript project references: passed with no errors.
- ESLint: passed with zero warnings.
- Vitest: passed; 14 files and 32 unit/component tests.
- Vite production build: passed; 3,399 modules transformed.
- PWA generation: passed; 89 precache entries, manifest and service worker emitted.
- Production smoke: passed; `/`, `/demo`, `/manifest.webmanifest` and `/sw.js` returned HTTP 200.

Command executed:

```bash
pnpm fixtures:validate && pnpm curriculum:validate && pnpm format:check && pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm smoke
```

## Browser-suite environment note

The local Playwright invocation was attempted, but the runtime did not contain Chromium. The workspace could not install a browser because the execution service rejected that dependency action, so no browser assertion actually ran locally. This is an infrastructure precondition failure, not recorded as an application pass or failure.

## GitHub Actions verification

The `ChalkBox quality gate` workflow is configured to run:

- frozen-lockfile install;
- fixtures, types, lint, unit/component tests and production build;
- pinned Chromium installation;
- desktop/mobile critical journeys;
- axe WCAG A/AA serious/critical checks;
- production-build, Playwright-report and eight product-screenshot artifacts.

The previous v2 baseline passed GitHub Actions run **#16**. The new v3 branch must complete its own workflow before any browser-pass claim is updated here. The workflow is configured to upload the production build, Playwright report, and eight-screen v3 product evidence set.

## Final hosted verification

After Supabase and Cloudflare Pages are configured, record the exact deployment URL, function health, live Gemini generation, indexed RAG result, auth callback, cross-browser share, PWA/offline reload and downloadable PDFs in `INTEGRATION_STATUS.md`.

No unexecuted browser or hosted check is represented as passing.
