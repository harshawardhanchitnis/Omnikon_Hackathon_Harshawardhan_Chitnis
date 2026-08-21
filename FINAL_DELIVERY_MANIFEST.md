# ChalkBox final delivery manifest

Team HarshLabs · Omnikon National Hackathon 2026 · Omni_EdTech_7

## Included

- complete React/TypeScript source and lockfile;
- production `dist/` build and installable PWA assets;
- typed Classroom Teaching Engine, private Teach Mode and learner-safe Present Mode;
- exact 40-minute bilingual Photosynthesis flagship flow with nine instructional blocks;
- anonymous Quick Check 2.0, reflection, assessment, worksheet, offline, sharing, versioning and community flows;
- Supabase schema, RLS/security tests and server-side Gemini/RAG function code;
- copyright-safe NCERT Class VIII Science metadata, page locators and original derived summaries (not the textbook PDF);
- 12-page technical report;
- eight CI-captured product screenshots;
- implementation, deployment, security, testing, demo and integration-status documentation;
- unit/component, security-contract, accessibility and end-to-end tests.

## Verified quality gate

GitHub Actions run **#26** passed for application commit `0d98afb883049498c7c07da01e74a87e5bbdc3a1`:

- fixtures and curriculum provenance validated;
- strict TypeScript and ESLint passed;
- 14 Vitest files / 32 tests passed;
- production PWA build and route smoke passed;
- Playwright desktop/mobile suite: 17 passed / 3 intentional project-specific skips;
- exact eight-screen evidence artifact produced.

## Run locally

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the printed local URL and choose **Explore the prepared demo**. The prepared demonstration needs no database, API key or account.

For the complete production gate:

```bash
pnpm verify
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

## Truth boundary

The prepared demo and local-first product are immediately functional. Hosted Supabase, live Gemini/RAG, public cross-browser sharing, Turnstile and Cloudflare Pages remain optional owner-configured integrations and are not falsely represented as deployed. No secret or learner PII is included.
