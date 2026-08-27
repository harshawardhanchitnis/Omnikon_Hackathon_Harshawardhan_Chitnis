# generate-topic-lesson

Server-side ChalkBox Topic Mode generator.

Required Supabase secret:
- `GEMINI_API_KEY`

Optional model overrides:
- `TOPIC_GENERATOR_MODEL` (default `gemini-3.6-flash`)
- `TOPIC_AUDITOR_MODEL` (default `gemini-3.5-flash-lite`)

The browser never receives the Gemini key. The function performs:
1. deterministic input/privacy checks;
2. live generation;
3. deterministic structural/provenance validation;
4. at most one structural regeneration if the model returned an invalid shape;
5. independent Science/age-fit/request-fit/feasibility/safety audit;
6. approval only when all audit dimensions are at least 8/10.

No Textbook Mode RAG or prepared lesson fallback is used.
