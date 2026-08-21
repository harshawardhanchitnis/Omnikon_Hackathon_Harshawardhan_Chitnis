const configuredOrigin = Deno.env.get("APP_ORIGIN") ?? "*";

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin =
    configuredOrigin === "*" || configuredOrigin === origin
      ? configuredOrigin === "*"
        ? "*"
        : origin
      : configuredOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}

export function preflight(request: Request) {
  return new Response("ok", { headers: corsHeaders(request) });
}
