import { corsHeaders } from "../_shared/cors.ts";

Deno.serve((request) => {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "chalkbox-edge",
      configured: {
        gemini: Boolean(Deno.env.get("GEMINI_API_KEY")),
        embeddings: Boolean(Deno.env.get("GEMINI_EMBEDDING_MODEL")),
        database: Boolean(Deno.env.get("SUPABASE_URL"))
      },
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
});
