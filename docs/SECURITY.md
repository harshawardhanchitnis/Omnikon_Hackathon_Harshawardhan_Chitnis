# Security and privacy

## Data minimisation

ChalkBox has no student entity. Core flows do not request student names, email addresses, phone numbers, identifiers, photographs, marksheets, diagnoses, or other personal data. Teaching notes and reflections explicitly prompt for class-level patterns only.

## Secrets

- `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are Edge Function secrets.
- Browser code receives only a Supabase URL, publishable key, app URL, and optional public Turnstile site key.
- `.env*` files are ignored except `.env.example`.
- GitHub Actions builds without production secrets because the prepared demo is self-contained.

## Authorisation

- Supabase Auth provides signed user identity.
- Every private table has row-level security enabled.
- Teacher insert/update/delete policies require `owner_id = auth.uid()`.
- Public lesson access requires both `is_public = true` and a public slug.
- Admin functions query a server-side `profiles.role` check.
- Profile column grants prevent a teacher from updating their own role.
- The Edge Function independently compares request ownership to the authenticated user.

## Abuse controls

- Anonymous AI use is limited to five requests per UTC day; registered teachers default to 25.
- Cloudflare Turnstile is supported for passwordless and anonymous-session creation.
- Input lengths, enums, array sizes, activity counts, and duration bounds are schema-controlled.
- Prompt text separates untrusted classroom data from instructions.
- Gemini safety settings and timeouts are applied server-side.
- Generation telemetry excludes full prompts and generated plan content.

## Browser protections

Cloudflare `_headers` configures CSP, `frame-ancestors 'none'`, no-sniff, strict referrer policy, and a restrictive permissions policy. Turnstile, Supabase, blob workers, and self-hosted assets are the only necessary external allowances.

## Offline data

IndexedDB and localStorage are origin-scoped but not encrypted vaults. Teachers should use a locked device, avoid shared public computers for real accounts, and export/delete local data when appropriate. Demo reset affects only ChalkBox tables in the browser.

## Responsible content

- Generated plans require teacher verification.
- Safety-sensitive demonstrations include teacher control and an alternative.
- Sources and disclosures remain visible in the editor, preview, shared plan, and PDF.
- Curriculum ingestion rejects missing licence or attribution fields.
- NCERT/CBSE references are used for taxonomy/alignment, not wholesale content reproduction.

## Reporting a vulnerability

Do not open a public issue containing credentials or exploitable details. Contact the repository owner privately, include the affected route/function, reproduction steps, impact, and a suggested mitigation. Never include real student data in a report.
