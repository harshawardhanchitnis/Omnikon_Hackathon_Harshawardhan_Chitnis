# Testing and verification

## Automated coverage

### Unit and contract tests

- canonical lesson/classroom bounds, including grades 1–10, one optional second grade, 20–90 minutes and class sizes 1–100;
- all prepared lesson fixtures against the shared Zod contract;
- deterministic lesson-quality scoring and derived analytics;
- Quick Brief parsing for duration, bilingual/support constraints and extraction labels;
- IndexedDB/offline queue ordering and conflict behavior;
- immutable sharing: private fields stripped, snapshot unaffected by later edits, expiry/revocation checks;
- community moderation permissions and approved-only discovery rules;
- Web Speech recognition and synthesis support/fallback handling;
- UI/preferences persistence without domain data in localStorage;
- accessible plan-card rendering and actions.

Current local result: **12 test files, 25 tests passing**.

### End-to-end journeys

- landing → deterministic demo → dashboard;
- Quick Brief prepared example → editor → preview;
- Teach Mode steps → reflection → insights;
- mobile bottom navigation;
- provenance-labelled assessment → worksheet builder;
- moderated immutable community snapshot → private adaptation;
- canonical screenshot evidence set;
- axe WCAG A/AA serious/critical checks on landing and dashboard.

The suite runs against Desktop Chrome and a Pixel 7 viewport. GitHub Actions installs its own pinned Chromium binary before execution.

## Required quality gate

```bash
pnpm fixtures:validate
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm smoke
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm verify` runs the complete browser-independent chain. CI runs Playwright as a dependent job and uploads its report, product screenshots and production build.

## Critical flows that must never break

1. Enter and reset prepared demo without account/API setup.
2. Parse/review a Quick Brief without silently claiming a rule-based result is AI.
3. Generate through the protected function when configured and preserve work on failure.
4. Create/edit/reload a plan from IndexedDB.
5. Save, restore and regenerate with version history intact.
6. Preview, print and generate lesson/worksheet PDFs with Hindi/English text.
7. Run Teach/Present Mode without leaking private teacher notes into learner view.
8. Save an anonymous aggregate Quick Check and private reflection.
9. Create an immutable share; enforce expiry/revocation; later edits cannot change it.
10. Adapt an approved community snapshot without modifying the publication.
11. Queue offline writes and resolve a simulated version conflict explicitly.
12. Block guests from private routes and teachers from admin routes.

## Manual verification matrix

| Area                 | Desktop  | Mobile   | Offline                 | Keyboard/a11y                       | Evidence         |
| -------------------- | -------- | -------- | ----------------------- | ----------------------------------- | ---------------- |
| Landing/demo         | Required | Required | Demo after first load   | Landmarks, headings, focus          | Screenshot + axe |
| Quick Brief          | Required | Required | Rule-based/manual path  | Labels, errors, review step         | E2E + screenshot |
| Editor/history       | Required | Required | Autosave/version        | All controls and status text        | Unit + manual    |
| Assessment/worksheet | Required | Required | Existing bank/resources | Reorder alternatives, names         | E2E + PDF        |
| Teach/Present        | Required | Required | Core saved lesson       | Timer, step labels, fullscreen exit | E2E + screenshot |
| Share/community      | Required | Required | Local demo simulation   | Read-only semantics                 | Unit + E2E       |
| Settings/sync        | Required | Required | Queue/conflict/reset    | Dialogs, switches, alerts           | Unit + manual    |
| Export               | Required | Required | Client-side             | Disclosure/source retained          | Rendered PDF QA  |

## Evidence policy

Executed checks are recorded in `report/evidence/BUILD_VERIFICATION.md`. Hosted integrations are separately tracked in `INTEGRATION_STATUS.md`. A missing browser runtime or unconfigured service is recorded as **not executed/not configured**, never as passing. Screenshots in `docs/screenshots/` must come from the verified production build or deployed origin.
