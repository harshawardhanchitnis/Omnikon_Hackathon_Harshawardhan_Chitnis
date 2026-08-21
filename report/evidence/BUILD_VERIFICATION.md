# Build verification

This record distinguishes checks executed in the local build environment from checks that are intentionally delegated to GitHub Actions or the final hosted deployment.

## Executed locally

- Fixture validation: passed; 3 canonical lesson-plan fixtures validated
- Formatting: passed; all supported files match the Prettier policy
- TypeScript project references: passed with no errors
- ESLint: passed with zero warnings
- Vitest unit/component suite: passed; 4 files and 8 tests
- Vite production build: passed; 3,377 modules transformed
- PWA generation: passed; manifest, service worker, and 71 precache entries emitted
- Production smoke test: passed; `/`, `/demo`, `/manifest.webmanifest`, and `/sw.js` returned HTTP 200
- Technical report: generated as a 12-page A4 PDF and visually inspected from rendered PNG pages

Command executed: `pnpm verify`

## Executed in GitHub Actions

- Frozen-lockfile install
- The complete local quality gate above
- Playwright Chromium lifecycle tests
- Automated WCAG checks with axe
- Production-build, browser-report, and canonical product-screenshot artifact upload

## Final hosted verification

After Supabase and Cloudflare Pages are configured, follow `docs/DEPLOYMENT.md` and record the deployment URL, health-function result, authentication callback, live AI generation, public share route, PWA install, offline reload, and Lighthouse evidence in this folder.

No unexecuted browser or hosted check is represented as passing.
