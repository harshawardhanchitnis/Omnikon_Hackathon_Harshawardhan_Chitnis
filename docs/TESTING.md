# Testing and verification

## Automated coverage

### Unit tests

- deterministic lesson-quality scoring;
- derived teacher analytics;
- all prepared lesson fixtures against the shared Zod contract;
- obvious student-identifying field checks.

### Component tests

- plan-card metadata, accessible heading, route destination, and action rendering.

### End-to-end tests

- public landing → prepared demo → dashboard;
- plan creation → prepared example → editor → preview;
- Teach Mode step navigation → completion → reflection → analytics;
- mobile bottom navigation;
- WCAG A/AA serious/critical axe checks on landing and dashboard.

The browser suites run for Desktop Chrome and a Pixel 7-sized viewport.

## Required local quality gate

```bash
pnpm fixtures:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm verify` intentionally covers the fast, browser-independent chain. CI runs Playwright as a separate dependent job and uploads its HTML report.

## Critical flows that must never break

1. Enter prepared demo without account/network.
2. Load a prepared plan without falsely claiming live AI.
3. Generate through the protected function when configured.
4. Edit and retain a plan after reload.
5. Preview, print, and download a PDF.
6. Start Teach Mode, navigate all steps, and save a private reflection.
7. Duplicate or adapt without modifying the source.
8. Reset demo to its canonical fixtures.
9. Reject private-route access for guests and admin-route access for teachers.
10. Load a public plan by slug without edit access.

## Manual verification matrix

| Area           | Desktop  | Mobile   | Offline             | Keyboard        | Screen reader cues    |
| -------------- | -------- | -------- | ------------------- | --------------- | --------------------- |
| Landing/auth   | Required | Required | Prepared demo link  | Tab/Enter       | Landmarks/headings    |
| Editor         | Required | Required | Autosave            | All controls    | Labels/status text    |
| Teach Mode     | Required | Required | Core use            | Prev/next/pause | Timer and step labels |
| Export/share   | Required | Required | PDF from cached app | Buttons         | Disclosures included  |
| Settings/reset | Required | Required | Required            | Dialog actions  | Switch state/alerts   |

## Evidence

- CI logs prove typecheck, lint, unit, build, and browser status.
- `docs/screenshots/` is produced by `pnpm screenshots` against the verified preview/live URL.
- `report/evidence/` indexes final Lighthouse and test artefacts when captured for submission.
