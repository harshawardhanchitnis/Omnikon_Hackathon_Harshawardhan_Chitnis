import { corsHeaders } from "./cors.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string
  ) {
    super(message);
  }
}

export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export function errorResponse(request: Request, error: unknown) {
  if (error instanceof HttpError)
    return json(request, { error: error.message, code: error.code }, error.status);
  console.error(error);
  return json(
    request,
    { error: "The lesson service could not complete this request.", code: "INTERNAL_ERROR" },
    500
  );
}
