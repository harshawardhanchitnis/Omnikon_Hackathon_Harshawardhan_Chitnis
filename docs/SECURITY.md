# Security, privacy and trust boundaries

## Data minimisation

ChalkBox deliberately has no student entity. It never needs student names, email addresses, phone numbers, identifiers, photographs, marksheets, diagnoses or biometrics. Classroom profiles contain aggregate learner count and non-identifying support/accessibility descriptions. Teaching notes, Quick Checks and reflections ask only for whole-class patterns.

## Secrets and environments

- `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are Edge Function secrets.
- Browser code receives only `VITE_SUPABASE_URL`, a publishable key, public app URL and optional Turnstile site key.
- `.env*` files are ignored except `.env.example`.
- CI and the prepared demo build without any production secret.
- Health checks expose configuration booleans, never values.

## Authorization

- Supabase Auth provides signed identity for cloud paths.
- Every private table has RLS enabled and owner policies tied to `auth.uid()`.
- Profile column grants prevent users from elevating their own role.
- Admin moderation/indexing checks the server-side profile role.
- Edge Functions re-check action authorization and request ownership.
- Share access uses a high-entropy token to an immutable snapshot and still enforces expiry/revocation.
- Community discovery exposes only approved immutable publication rows, never private mutable plans.

## Version and conflict integrity

Plan/session/reflection remote updates carry a record version. Conditional writes prevent a stale device from silently overwriting a newer record. Failed writes stay in an ordered local queue. A detected mismatch creates a conflict with explicit **Keep local**, **Keep cloud**, and **Duplicate both** resolutions.

## Abuse and AI controls

- Anonymous AI defaults to five requests/day; registered teachers default to 25.
- Cloudflare Turnstile is supported for sign-in/anonymous session creation.
- Zod bounds strings, enums, arrays, activity counts, class size, duration and at most two grades.
- Untrusted classroom and curriculum content is separated from prompt instructions.
- Gemini has no database credentials, browser/tool access or authority to approve content.
- Strict structured output plus one repair attempt prevents uncontrolled retries.
- Assessment variants are unreviewed until explicit teacher acceptance.
- Generation telemetry excludes full prompts and generated lesson content.

## Browser and PWA protections

`public/_headers` configures a content-security policy, `frame-ancestors 'none'`, no-sniff, strict referrer policy and restrictive permissions policy. Only self-hosted assets plus required Supabase/Turnstile endpoints are allowed. Source maps are useful for this judging build but can be disabled for a public production release if desired.

The service worker caches the application shell and essential self-hosted fonts. It does not cache authenticated API responses as public assets.

## Local/offline data

IndexedDB and localStorage are origin-scoped, not encrypted vaults. Teachers should use a locked device, avoid real accounts on shared public computers and export/delete their local records when appropriate. Demo reset clears only ChalkBox's Dexie tables and restores fictional fixtures; it does not touch unrelated browser storage.

Zustand localStorage contains UI preferences/profile shell only. Plans, assessments, classroom profiles, shares, publications, sessions and reflections live in IndexedDB.

## Responsible content and copyright

- Generated material requires teacher verification against the current syllabus and school safeguarding policy.
- Safety-sensitive activities keep teacher control and an offline/low-resource alternative.
- Sources and AI disclosure remain visible in editor, preview, shared view and PDFs.
- Curriculum ingestion requires licence and attribution metadata.
- The bundled corpus is original ChalkBox guidance mapped to curriculum taxonomy; substantial NCERT/commercial textbook prose is excluded.
- Community approval publishes a specific submitted snapshot and attribution. Reports enter a moderation queue.
- The competitor was reviewed as an allowed benchmark; ChalkBox contains no copied competitor code, CSS, text, assets or layout.

## Known boundaries

- Local browser data can be removed by the user/browser and is not a substitute for institutional backup.
- Browser speech recognition availability and privacy behavior vary by browser/platform.
- Free Supabase/Gemini quotas may pause or change; saved/manual/prepared features continue.
- The PWA is not a certified learning-management, examination or student-record system.

## Vulnerability reporting

Do not open a public issue containing credentials or exploitable details. Contact the repository owner privately with the affected route/function, reproduction, impact and suggested mitigation. Never include real student data.
