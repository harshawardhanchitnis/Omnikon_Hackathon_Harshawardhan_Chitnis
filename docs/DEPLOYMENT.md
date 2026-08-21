# Deployment guide

The prepared demo deploys as a static PWA without any backend. Accounts, cross-device sync, live Gemini actions, real share links and production moderation require the optional Supabase path.

## 1. Local development and production build

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm dev
```

For production preview:

```bash
pnpm build
pnpm preview
```

The output is `dist/`. Do not commit `node_modules`, `dist`, environment files, Playwright reports or browser binaries.

## 2. Create/link the free Supabase project

1. Create a free Supabase project in your account.
2. Copy its project reference from Project Settings.
3. Authenticate locally yourself; never paste the CLI access token into source or chat.
4. Link and apply migrations:

```bash
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase@latest db push
```

The checked-in migrations create profiles, plans/versions/shares, classrooms, assessment/worksheet tables, sessions/reflections/Quick Checks, publications/reports, generation events, sync versions, pgvector/hybrid retrieval, RLS, grants and triggers.

If using the project reference already recorded in `supabase/config.toml`, confirm that you own/control that exact project before running a write command.

## 3. Create the Gemini key safely

1. Open Google AI Studio in your own browser.
2. Create a Gemini Developer API key in a project with no paid billing requirement.
3. Never paste the key into chat, GitHub, `.env.local`, Cloudflare or any `VITE_*` variable.
4. In Supabase Dashboard → Edge Functions → Secrets, add:

```text
GEMINI_API_KEY=<private key>
GEMINI_MODEL=gemini-3.7-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
AI_DAILY_LIMIT_TEACHER=25
AI_DAILY_LIMIT_DEMO=5
AI_DAILY_ACTION_LIMIT_TEACHER=40
AI_DAILY_ACTION_LIMIT_DEMO=10
APP_ORIGIN=https://your-final-origin.example
```

Supabase automatically injects its URL, anonymous key and service-role key into Edge Functions. Do not copy the service-role key into the frontend.

## 4. Deploy Edge Functions

```bash
pnpm dlx supabase@latest functions deploy generate-lesson-plan
pnpm dlx supabase@latest functions deploy ai-action
pnpm dlx supabase@latest functions deploy index-curriculum
pnpm dlx supabase@latest functions deploy health --no-verify-jwt
```

Open only the non-secret health URL to confirm configuration flags:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/health
```

Then sign in through ChalkBox and test one real lesson generation, one Quick Brief parse and one assessment action. A health response does not prove generation by itself.

## 5. Index approved original curriculum content

1. Review both JSON bundles in `data/curriculum/` and confirm source/licence/attribution fields. The uploaded NCERT PDF itself is intentionally absent.
2. Run `pnpm curriculum:validate` to verify both local manifests.
3. Promote your verified user to admin in the Supabase `profiles` table.
4. Run `pnpm curriculum:index`; it calls the authenticated admin-only function for all approved bundles by default.
5. Query source rows to confirm approval and embeddings before claiming live RAG.

Do not ingest substantial NCERT/commercial textbook prose. Keep only original summaries, locators, source metadata, or explicitly licensed explanations.

## 6. Configure the frontend

Create `.env.local` for local cloud testing:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_APP_URL=http://localhost:5173
VITE_APP_ENV=development
VITE_DEMO_ENABLED=true
VITE_TURNSTILE_SITE_KEY=
```

These values are public by design. Rebuild after changing any `VITE_*` variable.

## 7. Optional Turnstile abuse protection

1. Create a free Cloudflare Turnstile widget for the final domain and localhost if needed.
2. Put the site key in the frontend deployment as `VITE_TURNSTILE_SITE_KEY`.
3. Put the secret in Supabase Auth CAPTCHA settings, never in frontend variables.
4. Enable protection only after both production domain and callback are verified.

The prepared demo remains independent of Turnstile.

## 8. Deploy the PWA on Cloudflare Pages

Connect the GitHub repository and configure:

| Setting           | Value                    |
| ----------------- | ------------------------ |
| Production branch | `main` after final merge |
| Build command     | `pnpm build`             |
| Build output      | `dist`                   |
| Node              | `22`                     |
| Package manager   | Declared pnpm version    |

Set frontend variables in Pages:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_APP_URL=https://your-final-origin.pages.dev
VITE_APP_ENV=production
VITE_DEMO_ENABLED=true
VITE_TURNSTILE_SITE_KEY=<optional public key>
```

Never add `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to Pages.

`public/_headers` supplies security headers; `public/_redirects` sends SPA deep links to `index.html`; `wrangler.toml` points to `dist` for direct Wrangler deployment. All fonts/icons are self-hosted.

## 9. Configure authentication redirects

In Supabase → Authentication → URL Configuration:

1. Set Site URL to the final HTTPS origin.
2. Add `https://FINAL_ORIGIN/auth/callback` to allowed redirects.
3. Retain `http://localhost:5173/auth/callback` for development if desired.
4. Enable anonymous sign-ins only if anonymous live AI is part of the demo.

## 10. Create the first admin

1. Sign into ChalkBox once with your verified email.
2. Locate that exact user in `profiles`.
3. Change only its role from `teacher` to `admin` using the trusted dashboard/SQL editor.
4. Sign out and in; confirm `/admin` is available.

Never promote a guessed ID or expose an admin mutation in client code.

## 11. Hosted verification checklist

Use a private window and record results in `INTEGRATION_STATUS.md`:

- root, privacy and direct SPA deep links;
- prepared demo and reset;
- offline reload after visiting dashboard/plan;
- magic-link callback;
- live Quick Brief and full lesson generation with model disclosure;
- indexed retrieval with a real source;
- edit/reload on a second device or session;
- immutable share opened in another browser, then expiry/revocation;
- lesson and Hindi/bilingual PDF download;
- worksheet and answer-key PDF;
- Teach Mode, Quick Check, reflection and analytics;
- teacher denied `/admin`, admin allowed;
- no secret in built JS, source maps or Network responses;
- CI and accessibility/browser tests green.

## Free-tier guardrails

- No paid service is required for the prepared demo or core local workflow.
- Keep application AI quotas below provider free limits and enable usage alerts.
- Do not enable paid Gemini billing for this submission unless the owner consciously changes the ₹0 constraint.
- Cloudflare Pages and Supabase free tiers can sleep/rate-limit; document this honestly.
- If cloud quota is exhausted, saved plans, manual planning, prepared examples, local assessment tools, Teach Mode and PDFs remain usable.
