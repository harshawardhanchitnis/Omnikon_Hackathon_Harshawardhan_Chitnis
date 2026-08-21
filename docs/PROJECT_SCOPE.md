# ChalkBox project scope and build contract

## Product objective

ChalkBox helps a teacher in an under-resourced Indian school move from a short classroom brief to an effective, inspectable lesson and then carry that plan through assessment, teaching, reflection, and reuse. It reduces blank-page and formatting work while leaving curriculum accuracy, safeguarding, and final pedagogical judgment with the teacher.

## Main journey

1. Enter the deterministic prepared demo or sign in by email.
2. Reuse a privacy-safe classroom profile or type/dictate a Quick Brief.
3. Review extracted grade, optional second grade, board, subject, topic, duration, language, class size, materials, constraints, assumptions, and confidence.
4. Generate through the protected Gemini route or explicitly choose a labelled prepared example.
5. Review objectives and an exact-duration typed sequence with visuals, reveals, misconceptions, differentiation, offline alternatives, assessment alignment, sources, disclosure, and quality checks.
6. Edit teaching blocks, fit timing exactly, save checkpoints, restore history, or compare an AI section suggestion against the current value before accepting or rejecting it.
7. Add provenance-labelled assessment items and compose a printable worksheet and answer key.
8. Preview, print, export PDF, present learner-facing material, or create an expiring immutable share snapshot.
9. Run private Teach Mode, broadcast redacted learner content to Present Mode, reveal hints/layers progressively, record anonymous aggregate Quick Check 2.0 signals, and save non-identifying notes.
10. Reflect on whole-class evidence and next action; inspect private trends or adapt an approved community snapshot.

## Roles

| Role               | Capabilities                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| Public visitor     | Landing, about, privacy, auth, offline help, read-only active share        |
| Demo teacher       | Fully seeded local workflow; no account or API dependency                  |
| Registered teacher | Own records, cloud sync, live AI, immutable sharing, community submission  |
| Demo admin         | Seeded moderation, provenance, health, user and AI-operation views         |
| Admin              | Server-gated moderation, source/indexing oversight, operational visibility |

## Routes and outcomes

| Route                      | Screen                     | Outcome                                                  |
| -------------------------- | -------------------------- | -------------------------------------------------------- |
| `/`                        | Landing                    | Understand the product and launch demo/auth              |
| `/about`                   | About                      | Problem, principles, team, originality                   |
| `/privacy`                 | Trust centre               | Data and responsible-AI boundaries                       |
| `/auth`                    | Passwordless auth          | Request a magic link or enter demo                       |
| `/auth/callback`           | Auth callback              | Restore session/profile                                  |
| `/demo`                    | Demo bootstrap             | Seed/reset the fictional local workspace                 |
| `/share/:slug`             | Shared snapshot            | Read an active immutable plan snapshot                   |
| `/offline`                 | Offline help               | Explain cached and queued capabilities                   |
| `/onboarding`              | Teacher setup              | Save privacy-safe teaching defaults                      |
| `/dashboard`               | Teacher home               | Resume the most useful next action                       |
| `/plans/new`               | Quick Brief and full brief | Review classroom input and create a plan                 |
| `/plans/:planId/edit`      | Plan editor                | Autosave, quality-check, version and adapt               |
| `/plans/:planId/preview`   | Classroom document         | Share, print, PDF, teach or present                      |
| `/plans/:planId/teach`     | Teach Mode                 | Run the live lesson and aggregate check                  |
| `/plans/:planId/present`   | Present Mode               | Project only learner-facing content                      |
| `/plans/:planId/reflect`   | Reflection                 | Save whole-class outcome and next action                 |
| `/library`                 | Personal library           | Search, filter, duplicate and reopen plans               |
| `/assessments`             | Assessment bank            | Filter provenance-labelled questions and build resources |
| `/worksheets/:worksheetId` | Worksheet builder          | Edit/reorder/mark and export learner/key PDFs            |
| `/classrooms`              | Classroom profiles         | Create, duplicate, edit and archive reusable context     |
| `/curriculum`              | Curriculum explorer        | Browse source-aware grade/subject/unit mappings          |
| `/community`               | Community lessons          | Discover approved snapshots and track submissions        |
| `/community/:communityId`  | Community detail           | Inspect immutable provenance, adapt privately, report    |
| `/analytics`               | Teacher insights           | View aggregate planning, teaching and Quick Check trends |
| `/settings`                | Settings                   | Preferences, defaults, conflicts, export and reset       |
| `/admin`                   | Admin overview             | Operational summary                                      |
| `/admin/users`             | Teacher administration     | Privacy-safe account state                               |
| `/admin/content`           | Content moderation         | Approve/reject submissions and inspect source audit      |
| `/admin/operations`        | AI operations              | Quota, validation, retrieval and failure telemetry       |
| `*`                        | Not found                  | Recover to an appropriate safe route                     |

## Major interactions

- Voice recognition uses the browser Web Speech API when present and visibly degrades to typing.
- Quick Brief parsing uses the protected AI action when configured and a labelled rule-based parser otherwise; teachers always review before generation.
- Plan changes write locally first. Cloud writes are conditional on record version and failures enter an ordered queue.
- Conflicts offer **Keep local**, **Keep cloud**, or **Duplicate both**; the system never silently overwrites.
- A share stores a plan-version snapshot. Later edits do not mutate the shared content. Expiry and revocation are checked at read time.
- Community approval publishes an immutable submitted snapshot, never a live pointer to the author's editable private plan.
- AI-derived questions remain unreviewed until the teacher explicitly accepts them.
- Quick Checks store only prompt, response counts, misconception signal, suggested next action and optional teacher note—no learner identity.
- Raw share tokens are returned once to the creator and retained only on that device; Postgres stores a hash and anonymous access is RPC-only.

## Persisted data

- Profile shell, preferences and default classroom selection.
- Lesson plans, ancestry, versions, quality metadata and sources.
- Immutable share snapshots with expiry/revocation.
- Classroom profiles without student-level data.
- Assessment questions, review state, worksheet snapshots and order.
- Teaching sessions, aggregate check-ins, Quick Checks, reflections and next actions.
- Community submissions/publications, immutable snapshots and reports.
- Notifications, offline mutation queue, record versions and sync conflicts.
- Privacy-safe generation events in Postgres; never full prompts or generated plan bodies.

## Analytics and reporting

Teacher analytics are derived locally from owned plans, sessions, reflections and Quick Checks:

- plans created, lessons taught, estimated planning time saved and quality average;
- subject mix and four-week create/teach rhythm;
- teacher-reported outcome signal and latest evidence/next action;
- anonymous aggregate Quick Check response distribution and response coverage.

Definitions remain visible. No individual learner profile, ranking or prediction exists. Exports include lesson/worksheet PDFs, browser print, and a JSON backup of the user's local workspace.

## Prepared demo fixture contract

`/demo` restores a fictional workspace for **Meera Patil**, a Grade 5–7 teacher at a fictional Zilla Parishad school in Pune district. It includes:

- four lessons: the 40-minute photosynthesis flagship, water cycle, fractions, and narrative point of view;
- two reusable classroom profiles;
- source-labelled curriculum mappings and five assessment questions;
- one worksheet with answer key;
- plan version history and one immutable share snapshot;
- completed session, class-level check-in, reflection and Quick Check;
- approved fractions, water-cycle and narrative community snapshots;
- one pending teacher submission for the moderation demo;
- notifications, analytics and one example sync conflict.

Prepared content is always labelled and never represented as a live Gemini response.

## In scope

- Responsive installable PWA for desktop and mobile.
- Passwordless Supabase authentication and anonymous AI session support.
- Complete planning, assessment, delivery, reflection and reuse loop.
- Classroom profiles, Quick Brief, voice assist and curriculum explorer.
- Local-first IndexedDB persistence, PWA caching, ordered sync and conflict UI.
- Protected Gemini structured actions and hybrid vector/keyword retrieval.
- Version history, immutable expiring shares, PDF/print/JSON export.
- Learner-only Present Mode and anonymous aggregate Quick Checks.
- Provenance-labelled question bank and worksheet/key generation.
- Immutable moderated community publications and admin workflows.
- RLS migrations, Edge Functions, CI, tests, documentation, report and ZIP.

## Explicitly out of scope

- Student accounts, student names, individual marks, profiling, biometrics or diagnoses.
- Automatic high-stakes grading or decisions about individual learners.
- Parent portals, attendance systems, school ERP, payments or marketplaces.
- Video conferencing, mentor booking, chat, or social-media feeds.
- Wholesale textbook ingestion or reproduction of substantial protected prose.
- District billing/multi-tenant enterprise administration.
- Native Android/iOS binaries; the PWA is the mobile package.
- Collaborative simultaneous editing, push notifications or background sync guarantees.
- Claims that rule-based/prepared content is live AI or that unconfigured services are deployed.

# BUILD CONTRACT

- **Build:** ChalkBox, an offline-ready, teacher-controlled planning, assessment and classroom-delivery workspace for Omni_EdTech_7.
- **Locked stack:** React 19, TypeScript, Vite, Tailwind CSS, React Router, React Hook Form, Zod, DomainProvider, Zustand for UI only, Dexie, Supabase, Gemini 3.7 Flash, Gemini Embedding 2/pgvector, Recharts, React PDF, Vitest, Playwright, Cloudflare Pages.
- **Architectural rules:** shared contracts; domain records in IndexedDB; local-first writes; version-aware sync; secrets only in Edge Functions; RLS ownership; immutable sharing/publications; no student PII; visible provenance and AI state; accessible responsive UI.
- **Major modules:** public/trust, identity/onboarding, classroom context, Quick Brief/generation, typed Classroom Teaching Engine, editor/history, assessment/worksheet, preview/secure share/export, Teach/Present, Quick Check 2.0, reflection/analytics, curriculum/community, settings/sync, admin, AI/RAG/data infrastructure.
- **Build order:** contracts/data → offline persistence/sync → core plan journey → assessment/classroom tools → delivery/reflection → sharing/community → AI/RAG → analytics/admin → tests/docs → deployment/package.
- **Definition of done:** deterministic demo works with no setup; production build and smoke pass; fixtures, formatting, types, lint and tests pass; browser suites cover critical journeys in CI; AI secrets stay server-side; persistence, error states, responsive design, exports, docs, report and final ZIP are present; hosted integration status is truthful.
