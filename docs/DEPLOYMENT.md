# Deployment guide

The prepared demo can be deployed before any backend step. The cloud AI/account path needs the Supabase schema, functions, and public browser variables.

## 1. Local production check

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm build
pnpm preview
```

The production output is `dist/`. Deep links work locally through Vite preview and on Cloudflare through `public/_redirects`.

## 2. Supabase database

Install the free Supabase CLI and authenticate with your own account; never paste its access token into code or chat.

```bash
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref ihkxzqnggieardopttgw
pnpm dlx supabase@latest db push
```

This applies:

- profile, lesson, session, reflection, support, source, generation, and audit tables;
- pgvector with 768-dimensional HNSW indexing;
- the curriculum-match RPC;
- new-user profile trigger;
- RLS policies and column-level grants;
- original ChalkBox seed content without textbook copying.

## 3. Edge Function secrets

Set these in Supabase Dashboard → Edge Functions → Secrets, or with the CLI. Keep the Gemini key private.

```text
GEMINI_API_KEY=<private value>
GEMINI_MODEL=gemini-3.7-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
AI_DAILY_LIMIT_TEACHER=25
AI_DAILY_LIMIT_DEMO=5
APP_ORIGIN=https://your-chalkbox-domain.pages.dev
```

The function also understands the earlier aliases `TEACHER_DAILY_GENERATION_LIMIT` and `DEMO_DAILY_GENERATION_LIMIT`, but the `AI_DAILY_LIMIT_*` names above are canonical and match the hosted configuration.

Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to its functions.

## 4. Deploy functions

```bash
pnpm dlx supabase@latest functions deploy generate-lesson-plan
pnpm dlx supabase@latest functions deploy index-curriculum
pnpm dlx supabase@latest functions deploy health --no-verify-jwt
```

Smoke-test only the non-secret health endpoint:

```text
https://ihkxzqnggieardopttgw.supabase.co/functions/v1/health
```

It reports whether required configuration exists, never the values.

## 5. Create the first admin

1. Sign into ChalkBox once using your real email so `auth.users` and `profiles` exist.
2. In Supabase Table Editor, open `profiles`.
3. Locate only your verified user ID/email and change `role` from `teacher` to `admin`.
4. Sign out and in again; `/admin` is then available.

Never promote an unverified ID or a demo/anonymous profile.

## 6. Index approved curriculum chunks

The seed migration inserts original chunks without embeddings. Use the admin-only `index-curriculum` function to upsert each approved source and its chunks. Every request must include:

- title and publisher;
- direct source URL;
- exact licence;
- required attribution;
- board/grade/subject metadata where applicable;
- bounded chunks containing only original or appropriately licensed text.

Do not ingest substantial NCERT textbook prose. A retrieval failure does not fabricate citations; generation returns a syllabus-verification warning.

## 7. Cloudflare Turnstile (recommended before anonymous AI)

1. Create a free Turnstile widget for the final Pages hostname and any custom domain.
2. Add the public site key to Cloudflare Pages as `VITE_TURNSTILE_SITE_KEY`.
3. Add the private Turnstile secret in Supabase Auth → CAPTCHA protection.
4. Enable CAPTCHA for sign-in/anonymous auth only after the deployed site key is confirmed.

The widget component is already integrated into passwordless auth and anonymous AI-session creation. The prepared demo never depends on Turnstile.

## 8. Cloudflare Pages

Create a Pages project connected to the GitHub repository and choose:

| Setting           | Value                     |
| ----------------- | ------------------------- |
| Production branch | `main` after merge        |
| Build command     | `pnpm build`              |
| Build output      | `dist`                    |
| Node version      | `22`                      |
| Package manager   | pnpm via `packageManager` |

Add these **public build variables**:

```text
VITE_SUPABASE_URL=https://ihkxzqnggieardopttgw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable key>
VITE_APP_URL=https://your-chalkbox-domain.pages.dev
VITE_TURNSTILE_SITE_KEY=<optional public site key>
```

Do not add the Gemini key to Cloudflare Pages. It is not required by the frontend.

`public/_headers` supplies security headers. `public/_redirects` maps every SPA route to `index.html`. `wrangler.toml` declares `dist` for direct Wrangler deployments.

## 9. Supabase Auth URLs

After Cloudflare gives the final hostname:

1. Supabase → Authentication → URL Configuration.
2. Set **Site URL** to the final HTTPS origin.
3. Add `https://final-origin/auth/callback` to allowed redirect URLs.
4. Retain `http://localhost:5173/auth/callback` for local development if desired.

## 10. Post-deployment verification

Verify in a new incognito window:

- landing and prepared demo;
- direct deep link to `/privacy` and `/demo`;
- offline reload after visiting the dashboard;
- email magic link and callback;
- one anonymous and one registered Gemini request;
- edit/reload cloud plan;
- PDF download and print;
- public share in a second browser;
- Teach Mode/reflection/analytics;
- teacher blocked from `/admin` and admin allowed;
- reset demo;
- no secret value in Sources, Network responses, or the built JavaScript.

## Free-tier guardrails

- Keep AI quotas at 5 anonymous / 25 teacher generations per UTC day.
- Turn on Supabase project usage alerts.
- Turn on Cloudflare analytics only if desired; no paid feature is required.
- Do not enable a paid Gemini billing account for this submission.
- If a free quota is exhausted, saved plans and the prepared demo continue to work.
