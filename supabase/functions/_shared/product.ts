export type JsonRecord = Record<string, unknown>

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}
export function asString(value: unknown) { return typeof value === 'string' ? value : null }
export function asNumber(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : null }

export function env(name: string, fallback = '') {
  return Deno.env.get(name)?.trim() || fallback
}

function firstNamedKey(raw: string) {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed.default || Object.values(parsed)[0] || ''
  } catch {
    return raw
  }
}

export function supabase() {
  const url = env('SUPABASE_URL').replace(/\/$/, '')
  const anon = env('SUPABASE_ANON_KEY') || firstNamedKey(env('SUPABASE_PUBLISHABLE_KEYS')) || env('SUPABASE_PUBLISHABLE_KEY')
  const service = env('SUPABASE_SERVICE_ROLE_KEY') || firstNamedKey(env('SUPABASE_SECRET_KEYS')) || env('SUPABASE_SECRET_KEY')
  if (!url || !anon || !service) throw new Error('Supabase Edge Function environment is incomplete.')
  return { url, anon, service }
}

export async function requireUser(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) throw new Error('AUTH_REQUIRED')
  const { url, anon } = supabase()
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } })
  if (!response.ok) throw new Error('AUTH_REQUIRED')
  const user = await response.json() as JsonRecord
  const id = asString(user.id)
  if (!id) throw new Error('AUTH_REQUIRED')
  return { id, auth }
}

export async function adminRest(path: string, init: RequestInit = {}) {
  const { url, service } = supabase()
  const headers = new Headers(init.headers)
  headers.set('apikey', service)
  if (!service.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${service}`)
  const response = await fetch(`${url}${path}`, { ...init, headers })
  return response
}

export async function userRest(path: string, auth: string, init: RequestInit = {}) {
  const { url, anon } = supabase()
  const headers = new Headers(init.headers)
  headers.set('apikey', anon)
  headers.set('Authorization', auth)
  const response = await fetch(`${url}${path}`, { ...init, headers })
  return response
}

export async function readJson<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${message}${text ? `: ${text.slice(0, 500)}` : ''}`)
  }
  return await response.json() as T
}

export async function enforceDailyLimit(ownerId: string, eventType: string, defaultLimit = 20) {
  const configured = Number(env('AI_DAILY_LIMIT_TEACHER', String(defaultLimit)))
  const limit = Number.isFinite(configured) && configured > 0 ? configured : defaultLimit
  const since = new Date(); since.setUTCHours(0, 0, 0, 0)
  const countResponse = await adminRest(
    `/rest/v1/ai_usage_events?owner_id=eq.${ownerId}&event_type=eq.${encodeURIComponent(eventType)}&created_at=gte.${encodeURIComponent(since.toISOString())}&select=id`,
    { headers: { Prefer: 'count=exact' } },
  )
  const count = Number(countResponse.headers.get('content-range')?.split('/').pop() ?? 0)
  if (count >= limit) throw new Error('DAILY_LIMIT')
}

export async function recordUsage(ownerId: string, eventType: string) {
  await adminRest('/rest/v1/ai_usage_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner_id: ownerId, event_type: eventType }),
  })
}

function extractGeminiText(payload: JsonRecord) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
  const first = asRecord(candidates[0])
  const content = asRecord(first?.content)
  const parts = Array.isArray(content?.parts) ? content.parts : []
  return parts.map((part) => asString(asRecord(part)?.text) ?? '').join('').trim()
}

export async function geminiJson(model: string, parts: JsonRecord[], timeoutMs = 60000) {
  const key = env('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY_MISSING')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
        signal: controller.signal,
      },
    )
    if (!response.ok) throw new Error(`GEMINI_${response.status}:${await response.text()}`)
    const payload = await response.json() as JsonRecord
    const text = extractGeminiText(payload)
    return JSON.parse(text) as JsonRecord
  } finally { clearTimeout(timer) }
}

export async function geminiJsonFallback(parts: JsonRecord[], models: string[]) {
  let last: unknown = null
  for (const model of models) {
    try { return { model, value: await geminiJson(model, parts) } }
    catch (error) {
      last = error
      if (!/GEMINI_(404|408|429|500|502|503|504)|AbortError|fetch/i.test(String(error))) throw error
    }
  }
  throw last instanceof Error ? last : new Error('Gemini is temporarily unavailable.')
}

export async function embedText(text: string) {
  const key = env('GEMINI_API_KEY')
  const model = env('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-2')
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    },
  )
  if (!response.ok) throw new Error(`EMBED_${response.status}:${await response.text()}`)
  const payload = await response.json() as JsonRecord
  const embedding = asRecord(payload.embedding)
  const values = Array.isArray(embedding?.values) ? embedding.values.filter((value): value is number => typeof value === 'number') : []
  if (values.length !== 768) throw new Error(`Unexpected embedding dimensions: ${values.length}`)
  return values
}

export function vectorLiteral(values: number[]) { return `[${values.join(',')}]` }

export function base64(bytes: Uint8Array) {
  let binary = ''
  const block = 0x8000
  for (let offset = 0; offset < bytes.length; offset += block) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + block)))
  }
  return btoa(binary)
}
