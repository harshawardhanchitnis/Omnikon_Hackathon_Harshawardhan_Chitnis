# AI and curriculum retrieval pipeline

## Models and cost posture

- Structured generation: [`gemini-3.7-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash).
- Retrieval embeddings: [`gemini-embedding-2`](https://ai.google.dev/gemini-api/docs/embeddings) with 768 output dimensions.

Google's [Gemini API pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists a free tier, but quotas and regional availability are provider-controlled and can change. ChalkBox is designed to spend ₹0: application quotas are stricter than provider limits, no paid billing feature is required, and the prepared/offline workflow remains usable when live AI is unavailable. Free-tier prompts may be used by the provider to improve products; the UI therefore asks for classroom context, not student personal data.

Model identifiers are server configuration, never browser assumptions:

```text
GEMINI_MODEL=gemini-3.7-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
```

## Protected action surface

| Action                | Function                         | Result                                              |
| --------------------- | -------------------------------- | --------------------------------------------------- |
| Create full lesson    | `generate-lesson-plan`           | Validated `LessonPlan` with sources and quality     |
| Parse Quick Brief     | `ai-action: parse-brief`         | Extracted fields, assumptions and confidence        |
| Adjust plan section   | `ai-action: regenerate-section`  | Replacement section only; prior checkpoint retained |
| Generate assessment   | `ai-action: generate-assessment` | Unreviewed question variants with provenance        |
| Translate/adapt text  | `ai-action: translate-adapt`     | Bounded adapted text with AI disclosure             |
| Index approved source | `index-curriculum`               | Embedded source chunks after admin validation       |
| Configuration check   | `health`                         | Booleans/status only; never secret values           |

The browser service `src/services/ai-actions.ts` normalizes success/error payloads. When the cloud route is absent, it returns an explicitly labelled prepared result where the feature has a safe deterministic equivalent; it never claims that Gemini ran.

## Lesson request boundary

1. The browser validates the brief with the shared contract.
2. The function verifies an authenticated teacher or controlled anonymous Supabase session.
3. `ownerId` must match the JWT subject.
4. Input enums, lengths, arrays, grade count, class size and 20–90 minute bounds are enforced.
5. A daily generation-event count applies the configured 5/day anonymous or 25/day teacher limit.
6. Only the bounded board/grade/subject/topic query is embedded.
7. Hybrid retrieval combines semantic similarity with keyword/metadata matches, limited to approved chunks.
8. Retrieved data is delimited as untrusted reference context, not instructions.
9. Gemini receives a strict JSON schema and conservative safety configuration.
10. Zod validates the response; one repair request is allowed, never an unbounded retry loop.
11. Deterministic quality checks run and trusted source/disclosure metadata is attached server-side.
12. The function returns typed content plus privacy-safe operational metadata.

## Deterministic lesson checks

- at least two measurable objectives;
- sequence duration within five minutes of the requested total;
- offline alternative for every activity;
- every assessment maps to one or more objective IDs;
- material use stays within the supplied/common classroom list;
- source/disclosure metadata comes from trusted code rather than model prose.

The browser repeats inspectable quality checks after teacher edits. Quality scores are product heuristics, not claims of measured learning impact.

## Retrieval and provenance

`curriculum_sources` stores title, publisher, direct URL, licence, attribution, board, grade, subject, approval status and content hash. `curriculum_chunks` stores bounded original/licensed text, metadata, search text and embedding. `match_curriculum_hybrid` blends vector similarity with keyword relevance and metadata filters.

The repository includes `data/curriculum/chalkbox-original.json`: original ChalkBox pedagogy guidance mapped to public curriculum taxonomy. It does not contain substantial textbook prose. The ingestion function refuses incomplete licence/attribution fields and is admin-only.

Every assessment question carries:

- provenance category (`curriculum-source`, `licensed-oer`, `chalkbox-authored`, `teacher-authored`, or `ai-derived`);
- review state (`unreviewed`, `teacher-reviewed`, or `curator-approved`);
- source/attribution when applicable;
- immutable snapshot when added to a worksheet.

## Prompt-injection controls

- System instructions state that classroom, source and teacher text are data—not executable instructions.
- Requests use bounded JSON rather than concatenating an arbitrary transcript into system text.
- Retrieval is limited to approved records and the server attaches canonical provenance.
- The model cannot call tools, browse or alter database permissions.
- Strict output schemas discard unknown structure and constrain arrays/counts.
- Admin/source-indexing authorization is independent of model output.

These controls reduce risk; they do not make generated pedagogy automatically correct. Teacher review remains mandatory.

## Failure behavior

| Condition                       | Response and UI behavior                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Invalid request                 | `400`; field-level correction                                                         |
| Missing/expired session         | `401`; sign-in/demo guidance                                                          |
| Owner/admin mismatch            | `403`; no write                                                                       |
| Quota reached                   | `429`; continue with saved/manual/prepared tools                                      |
| Provider rate limit             | `429`; visible retry-later message                                                    |
| Retrieval unavailable           | Continue only with a prominent syllabus-verification warning and no invented citation |
| Invalid model JSON after repair | `502`; preserve current plan/version                                                  |
| Network failure                 | Keep local work, queue eligible mutations, expose prepared/manual path                |

## Operational logging

Generation events store request ID, user ID, action/model, status, latency, retrieval count, quality score and timestamps. They exclude full teacher prompts, full lesson bodies, API keys, student information and raw authentication tokens.
