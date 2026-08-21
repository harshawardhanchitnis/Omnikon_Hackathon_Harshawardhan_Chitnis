# ChalkBox project scope and build contract

## Product objective

ChalkBox helps a teacher in an under-resourced Indian school create an effective, curriculum-aligned lesson plan quickly and then carry that plan through the classroom. It reduces blank-page and formatting work while keeping the teacher responsible for accuracy, safety, curriculum fit, and adaptation.

## Primary user journey

1. Enter the prepared demo or sign in by email.
2. See recent plans, the next ready lesson, saved planning time, and support activity.
3. Describe grade, subject, topic, board, language, duration, class size, materials, constraints, and learning level.
4. Generate through the protected Gemini function or deliberately load the prepared water-cycle example.
5. Review objectives, sequence, timing, materials, differentiation, offline options, assessments, sources, and AI disclosure.
6. Edit any field; ChalkBox autosaves to the device and syncs registered accounts when available.
7. Preview, print, export PDF, or create a read-only share link.
8. Open Teach Mode, follow timed steps, pause the timer, navigate the lesson, and save non-identifying notes.
9. Record group-level understanding, engagement, pace, evidence, outcome, and the next teaching action.
10. View private trends, duplicate a plan, adapt community content, or reuse the lesson.

## User roles

| Role               | Capabilities                                                                          |
| ------------------ | ------------------------------------------------------------------------------------- |
| Public visitor     | Landing, trust pages, read-only shared plan, prepared demo entry                      |
| Demo teacher       | Complete seeded workflow stored only in the browser; live AI optional if configured   |
| Registered teacher | Own profile, plans, sessions, check-ins, reflections, exports, sharing and cloud sync |
| Demo admin         | Seeded health, account, content-provenance and AI-operations views                    |
| Admin              | Role-gated source indexing, operational visibility and support administration         |

## Screens and routes

| Route                     | Screen                 | Main outcome                                             |
| ------------------------- | ---------------------- | -------------------------------------------------------- |
| `/`                       | Landing                | Understand value and enter demo or account flow          |
| `/about`                  | About                  | Understand problem, product principles, and team         |
| `/privacy`                | Trust centre           | Understand data and AI boundaries                        |
| `/auth`                   | Passwordless auth      | Request a secure magic link                              |
| `/auth/callback`          | Auth callback          | Restore session and profile                              |
| `/demo`                   | Demo bootstrap         | Load the fictional seeded workspace                      |
| `/onboarding`             | Teacher setup          | Save classroom defaults without student data             |
| `/dashboard`              | Teacher home           | Start next action and see planning snapshot              |
| `/plans/new`              | Plan brief             | Generate or load a prepared example                      |
| `/plans/:planId/edit`     | Plan editor            | Edit and quality-check every plan section                |
| `/plans/:planId/preview`  | Classroom document     | Review, share, print, export PDF, or teach               |
| `/plans/:planId/teach`    | Teach Mode             | Run the live lesson sequence and timer                   |
| `/plans/:planId/reflect`  | Reflection             | Save outcome evidence and next action                    |
| `/library`                | Personal library       | Search, filter, duplicate, reopen, and remove drafts     |
| `/community`              | Community and support  | Explore plans, mentors, appointments, and guidance       |
| `/community/:communityId` | Community detail       | Inspect attribution and create a private adaptation      |
| `/analytics`              | Teacher insights       | View private, derived planning and outcome trends        |
| `/settings`               | Settings               | Defaults, accessibility, offline, export, and demo reset |
| `/share/:slug`            | Public shared plan     | Read a teacher-published plan without edit access        |
| `/admin`                  | Admin overview         | View seeded/production operational summary               |
| `/admin/users`            | Teacher administration | View privacy-safe account status                         |
| `/admin/content`          | Curriculum provenance  | Inspect approved sources and indexing status             |
| `/admin/operations`       | AI operations          | Inspect quotas, validation and error telemetry           |
| `/offline`                | Offline help           | Explain available offline actions                        |
| `*`                       | Not found              | Recover to a safe route                                  |

## Persisted data

- Teacher profile and classroom defaults.
- Lesson-plan content, status, quality score, source metadata, sharing state, and ancestry.
- Teaching-session timer, current step, attendance count, and non-identifying notes.
- Group-level check-ins and private reflections.
- Settings and local demo generation count.
- Registered-account copies in Postgres; offline copies in IndexedDB.
- Operational generation events without full prompts or lesson content.

## Demo fixture contract

The app starts from a clean public landing page. `/demo` creates a local fictional workspace for **Meera Patil**, a Grade 5–7 teacher at a fictional Zilla Parishad school in Pune district. It contains:

- three lesson plans: water cycle, fractions, and narrative point of view;
- one completed teaching session, check-in, and reflection;
- three attributed community-plan summaries;
- two mentor profiles, one confirmed appointment, and one guidance plan;
- notifications and a populated analytics view;
- a reset action that restores the exact original fixture set.

Prepared content is always labelled and never represented as a live Gemini response.

## In scope

- Responsive PWA for desktop and mobile.
- Passwordless Supabase authentication and anonymous AI session support.
- Complete teacher lesson lifecycle.
- Offline-first drafts and teaching continuity.
- Secure Gemini structured generation and curriculum retrieval.
- PDF, print, JSON backup, and public read-only share.
- Community adaptation with attribution.
- Teacher-only analytics and seeded mentor support.
- Role-gated, seeded admin operations.
- RLS migrations, Edge Functions, CI, tests, setup docs, and submission report.

## Explicitly out of scope

- Student accounts, student profiling, biometric data, or named student records.
- Automatic grading of individual students.
- Video conferencing, payments, or a paid marketplace.
- Reproduction of substantial NCERT or commercial textbook content.
- A district-scale enterprise tenancy/billing system.
- Native iOS/Android binaries; the installable PWA is the supported mobile package.
- Silent AI fallbacks or claims that prepared demo content was generated live.

## BUILD CONTRACT

- **Build:** ChalkBox, an offline-ready AI lesson-planning and teaching workspace for Omni_EdTech_7.
- **Stack:** React 19, TypeScript, Vite, Tailwind CSS, React Router, Zustand, React Hook Form, Zod, Dexie, Supabase, Gemini, pgvector, Recharts, React PDF, Vitest, Playwright, Cloudflare Pages.
- **Rules:** shared contracts; secrets only in Edge Functions; RLS owner boundaries; no student PII; explicit demo labels; visible AI errors; attributed retrieval; local-first writes; responsive and accessible UI.
- **Modules:** public/trust, auth/onboarding, dashboard, generation, editor, preview/export/share, Teach Mode, reflection, library, community/support, analytics, settings/offline, admin, data/AI infrastructure.
- **Build order:** foundation → shared UI → contracts/data → core journey → secondary flows → analytics/admin → secure AI/RAG → tests/docs → deployment/package.
- **Definition of done:** production build succeeds; fixtures validate; typecheck/lint/unit tests pass; E2E suites cover the critical journey; demo works with no setup; cloud path is deployable without exposing secrets; documentation and report are included.
