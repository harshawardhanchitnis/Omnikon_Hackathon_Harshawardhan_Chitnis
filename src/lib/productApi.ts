import { getFreshTeacherSession } from '@/lib/productAuth'

export function getProductSupabaseConfig() {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const anonKey = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      '',
  ).trim()

  if (!url || !anonKey) {
    throw new Error('Supabase public configuration is missing from .env.local.')
  }
  return { url, anonKey }
}

export async function productFetch(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = { authenticated: true },
) {
  const { url, anonKey } = getProductSupabaseConfig()
  const headers = new Headers(init.headers)
  headers.set('apikey', anonKey)

  if (options.authenticated !== false) {
    const session = await getFreshTeacherSession()
    if (!session) throw new Error('Your ChalkBox session has expired. Sign in again.')
    headers.set('Authorization', `Bearer ${session.access_token}`)
  } else if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${anonKey}`)
  }

  const response = await fetch(`${url}${path}`, { ...init, headers })
  if (response.status === 401 && options.authenticated !== false) {
    throw new Error('Your ChalkBox session has expired. Sign in again.')
  }
  return response
}

export async function parseApiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
  return (
    (typeof payload?.message === 'string' && payload.message) ||
    (typeof payload?.msg === 'string' && payload.msg) ||
    (typeof payload?.error_description === 'string' && payload.error_description) ||
    (typeof payload?.error === 'string' && payload.error) ||
    fallback
  )
}
