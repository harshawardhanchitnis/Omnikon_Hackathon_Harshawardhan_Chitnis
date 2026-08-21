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

The v3 Classroom Teaching Engine passed GitHub Actions run **#26** on commit `0d98afb883049498c7c07da01e74a87e5bbdc3a1`:

- `verify`: passed;
- `browser-tests`: passed;
- Playwright: 20 discovered checks across desktop/mobile projects, **17 passed** and **3 intentional project-specific skips**;
- accessibility checks: passed on desktop and mobile;
- artifacts: production build, Playwright report and the exact eight-screen judge evidence set uploaded.

The eight evidence screens are landing, Quick Brief, lesson editor, Classroom Mode, Present Mode, Quick Check 2.0, Assessment Bank and mobile Classroom Mode.

## Final hosted verification

After Supabase and Cloudflare Pages are configured, record the exact deployment URL, function health, live Gemini generation, indexed RAG result, auth callback, cross-browser share, PWA/offline reload and downloadable PDFs in `INTEGRATION_STATUS.md`.

No unexecuted hosted check is represented as passing.
