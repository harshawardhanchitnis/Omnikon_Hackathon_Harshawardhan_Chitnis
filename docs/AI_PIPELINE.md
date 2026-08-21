# AI and curriculum retrieval pipeline

## Models

- Lesson generation: `gemini-3.7-flash` (configurable as `GEMINI_MODEL`).
- Retrieval embeddings: `gemini-embedding-2`, 768 output dimensions.

Both identifiers were rechecked against the official Gemini API model and embedding documentation on 21 August 2026. The configured models are available on the Gemini Developer API free tier; provider limits remain external constraints, so ChalkBox also applies stricter application quotas.

Model names are Edge Function secrets/configuration, not hard-coded browser assumptions.

## Request boundary

The browser validates the lesson brief and calls `generate-lesson-plan`. The function then:

1. verifies the Supabase JWT;
2. requires the request owner to equal the authenticated user;
3. validates grade, subject, topic, timing, language, class size, materials, constraints, and learning level;
4. applies a 5/day anonymous or 25/day teacher quota (environment configurable);
5. embeds only the bounded grade/subject/topic search phrase;
6. retrieves up to six approved chunks matching grade, subject, and board;
7. constructs the system and user prompt with explicit data/instruction separation;
8. requests JSON that conforms to a narrow response schema;
9. validates the response with Zod and makes at most one repair request;
10. calculates deterministic quality checks and attaches server-derived source metadata;
11. returns a typed plan and privacy-safe operational metadata.

## Deterministic checks

- at least two measurable objectives;
- activity time within five minutes of the requested duration;
- an offline alternative for every activity;
- every assessment mapped to one or more objectives;
- materials limited to the supplied list plus notebooks/pencils;
- source/disclosure metadata attached by trusted server code.

The browser repeats the inspectable quality checks when the teacher edits a plan.

## Retrieval provenance

`curriculum_sources` stores title, publisher, URL, licence, attribution, board, grade, subject, approval state, and content hash. Every `curriculum_chunks` row belongs to one source and stores the original metadata next to its embedding.

Only approved chunks with embeddings are eligible for `match_curriculum_chunks`. Initial seed text is original ChalkBox pedagogy content plus public taxonomy metadata. Substantial textbook prose is explicitly excluded.

## Failure behaviour

- Invalid input: 400 with an actionable message.
- Missing or expired session: 401.
- Owner mismatch or admin-only request: 403.
- Daily quota: 429 with saved-plan guidance.
- Gemini provider rate limit: 429.
- Provider outage or invalid response after repair: 502.
- Retrieval failure: generation may continue with a prominent syllabus-verification warning; it does not invent retrieval citations.

The UI separately offers **Use prepared water-cycle example**. This is a direct, labelled action and never an automatic AI fallback.
