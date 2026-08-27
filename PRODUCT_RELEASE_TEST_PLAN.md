# ChalkBox Product Release Test Plan

This release intentionally keeps **Demo Mode** separate from the authenticated product.

## 1. Auth
- Register one teacher account.
- Confirm email if enabled.
- Sign in and verify redirect to `/app`.
- Refresh `/app` and verify session persists.
- Sign out and confirm `/app` redirects to `/login`.
- Run forgot-password and reset-password flow.

## 2. Cloud library
- Generate a Topic Mode lesson while signed in.
- Wait a few seconds, open `/app/library`, click Sync & refresh.
- Verify the lesson appears and can be reopened from the cloud record.

## 3. My Textbooks
- Upload a new selectable-text Science PDF under 25 MB.
- Verify status moves uploading -> processing -> ready.
- Generate a lesson with a specific request.
- Verify source page labels point only to pages from that PDF.
- Repeat with a small scanned PDF to test Gemini PDF fallback.
- Delete the document and confirm its pages/chunks disappear by cascade.

## 4. RLS
Create Teacher A and Teacher B. Confirm B cannot list/open/delete A's plans or textbooks by changing IDs in requests/URLs.

## 5. Deployment
- Apply migration.
- Deploy `ingest-private-textbook` and `generate-private-textbook-lesson`.
- Ensure Gemini secrets are server-side only.
- Deploy `dist` to Cloudflare Pages with SPA fallback.
- Configure Supabase Site URL / Redirect URLs for the hosted origin.
- Run clean-incognito auth, Topic, PDF upload, generation, mobile, print and logout tests.
