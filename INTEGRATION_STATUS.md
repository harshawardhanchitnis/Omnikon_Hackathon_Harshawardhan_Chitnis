# ChalkBox integration status

Last updated: **21 August 2026 (Asia/Kolkata)**

This file is the authoritative truth boundary between implemented code, locally verified behavior and externally hosted services. A service is not marked live merely because configuration/migrations exist.

## Immediately functional without external setup

| Capability                         | Status                     | Evidence/behavior                                                     |
| ---------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Prepared judge demo                | Verified locally           | Deterministic fictional fixtures seed into IndexedDB                  |
| Landing/dashboard/library          | Verified locally           | Production build and route smoke passed                               |
| Quick Brief rule-based review      | Implemented/tested         | Explicitly labelled `rule-based`; teacher reviews before use          |
| Plan editor/autosave/history       | Implemented/tested         | Dexie persistence, checkpoints, restore and duplicate                 |
| Classroom profiles                 | Implemented                | Create/edit/duplicate/archive without student names                   |
| Curriculum explorer                | Implemented                | Original static source-aware mappings                                 |
| Assessment bank/worksheet          | Implemented/tested         | Provenance/review state, learner/key PDF components                   |
| Teach/Present Mode                 | Verified locally and in CI | Typed blocks; explicit learner DTO excludes private teaching fields   |
| Quick Checks/reflections/analytics | Implemented/tested         | Anonymous counts, misconception signal and suggested next action      |
| Local immutable share demo         | Implemented/tested         | Cryptographic token/hash, snapshot, expiry and revocation logic       |
| Moderated community demo           | Implemented/tested         | Approved immutable fixtures plus pending submission                   |
| Offline queue/conflicts/reset      | Implemented/tested         | Ordered queue and three explicit conflict choices                     |
| PWA/build/smoke                    | Verified locally           | 89 precache entries and four smoke routes returned 200                |
| Copyright-safe curriculum bundle   | Verified locally           | 3 sources, 23 original chunks; NCERT book itself is not redistributed |

## Optional hosted integrations

| Integration                     | Code/config status                | Live verification status                                          | Required owner action                                         |
| ------------------------------- | --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Supabase Auth                   | Implemented                       | **Not verified in this final environment**                        | Apply migrations; set site/callback URLs; test magic link     |
| Supabase Postgres/RLS sync      | Implemented                       | **Not verified against hosted project**                           | Apply migrations; test two-session owner/version behavior     |
| Gemini 3.7 Flash                | Protected functions implemented   | **No API key supplied/used here; live generation unverified**     | Store key only in Edge Function secrets; deploy and test      |
| Gemini Embedding 2 + hybrid RAG | SQL/function/corpus implemented   | **Hosted embeddings/retrieval unverified**                        | Deploy/index approved corpus; verify a real retrieved source  |
| Cross-browser public sharing    | Hashed-token RPC path implemented | **Hosted public token unverified**                                | Apply migration 004; test active, expired and revoked link    |
| Cloud moderation                | Tables/RLS/UI implemented         | **Hosted admin role/write unverified**                            | Promote verified owner; test approve/reject/report            |
| Turnstile                       | Component/config supported        | **Not configured**                                                | Create free widget and configure site/secret keys             |
| Cloudflare Pages                | Build/headers/redirects ready     | **Final URL not supplied/verified**                               | Connect repository; set public variables; deploy              |
| Browser E2E/axe                 | v3 suite implemented              | **GitHub Actions run #26 passed: 17 passed, 3 intentional skips** | Download retained Playwright/eight-screen artifacts as needed |

## Environment values still required for the cloud path

Frontend deployment (public):

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_URL
VITE_TURNSTILE_SITE_KEY (optional)
```

Supabase Edge Function secrets (private):

```text
GEMINI_API_KEY
GEMINI_MODEL=gemini-3.7-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
AI_DAILY_LIMIT_DEMO=5
AI_DAILY_LIMIT_TEACHER=25
AI_DAILY_ACTION_LIMIT_DEMO=10
AI_DAILY_ACTION_LIMIT_TEACHER=40
APP_ORIGIN
```

Never send private keys through chat or commit them. Configure them directly in the service dashboard/CLI.

## Claim policy for judging

- Say **implemented and locally verified** only for rows marked verified above.
- Say **production-ready integration path** for optional hosted rows until the live verification is completed.
- Do not claim a prepared/rule-based output was generated live.
- Do not claim cloud sync, RAG, auth, share or moderation is live until its row is updated with the deployed URL/test result.
