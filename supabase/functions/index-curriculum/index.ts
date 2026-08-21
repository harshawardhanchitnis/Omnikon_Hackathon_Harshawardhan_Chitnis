import { z } from "npm:zod@4";
import { preflight } from "../_shared/cors.ts";
import { requireAdmin, serviceClient } from "../_shared/auth.ts";
import { embedDocument } from "../_shared/gemini.ts";
import { errorResponse, HttpError, json } from "../_shared/http.ts";

const schema = z.object({
  source: z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(3).max(200),
    publisher: z.string().min(2).max(160),
    sourceUrl: z.url(),
    licence: z.string().min(3).max(300),
    attribution: z.string().min(3).max(500),
    grade: z.string().max(2).nullable().optional(),
    subject: z.string().max(80).nullable().optional(),
    board: z.string().max(80).nullable().optional()
  }),
  chunks: z
    .array(
      z.object({
        content: z.string().min(20).max(4000),
        metadata: z.record(z.string(), z.unknown()).default({})
      })
    )
    .min(1)
    .max(30)
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflight(request);
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  try {
    const admin = await requireAdmin(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      throw new HttpError(400, "The source or chunk metadata is invalid.", "INVALID_SOURCE");
    const service = serviceClient();
    const { source, chunks } = parsed.data;
    const row = {
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      source_url: source.sourceUrl,
      licence: source.licence,
      attribution: source.attribution,
      grade: source.grade ?? null,
      subject: source.subject ?? null,
      board: source.board ?? null,
      approved: true,
      created_by: admin.id
    };
    const { data: savedSource, error: sourceError } = await service
      .from("curriculum_sources")
      .upsert(row)
      .select("id")
      .single();
    if (sourceError || !savedSource) throw sourceError ?? new Error("Source could not be saved");
    const embedded = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]!;
      const embedding = await embedDocument(chunk.content, source.title);
      embedded.push({
        source_id: savedSource.id,
        chunk_index: index,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding
      });
    }
    const { error: chunkError } = await service
      .from("curriculum_chunks")
      .upsert(embedded, { onConflict: "source_id,chunk_index" });
    if (chunkError) throw chunkError;
    await service.from("audit_events").insert({
      actor_id: admin.id,
      action: "curriculum.index",
      resource_type: "curriculum_source",
      resource_id: savedSource.id,
      metadata: { chunks: chunks.length }
    });
    return json(request, { sourceId: savedSource.id, indexedChunks: chunks.length });
  } catch (error) {
    return errorResponse(request, error);
  }
});
