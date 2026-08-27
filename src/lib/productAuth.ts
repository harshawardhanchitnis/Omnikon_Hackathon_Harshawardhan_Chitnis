import type { ChalkBoxAuthSession } from '@/lib/auth'
import {
  clearStoredTeacherSession,
  getStoredTeacherSession,
} from '@/lib/auth'

const SESSION_STORAGE_KEY = 'chalkbox-auth-session-v1'
export const AUTH_CHANGE_EVENT = 'chalkbox-auth-change'

function getConfig() {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const anonKey = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      '',
  ).trim()

  if (!url || !anonKey) {
    throw new Error(
      'ChalkBox cloud is not configured. Add VITE_SUPABASE_URL and the public Supabase anon/publishable key to .env.local.',
    )
  }

  return { url, anonKey }
}

function appOrigin() {
  const configured = String(import.meta.env.VITE_APP_URL ?? '').trim().replace(/\/$/, '')
  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.origin
      }
    } catch {
      // Fall through to the current browser origin.
    }
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  throw new Error('ChalkBox application URL is not configured.')
}

function authFailureMessage(status: number, payload: Record<string, unknown>, fallback: string) {
  const raw =
    (typeof payload.msg === 'string' && payload.msg) ||
    (typeof payload.message === 'string' && payload.message) ||
    (typeof payload.error_description === 'string' && payload.error_description) ||
    ''

  if (status === 429 || /rate limit/i.test(raw)) {
    return 'Email delivery is temporarily rate-limited. Please wait a few minutes and try again.'
  }
  if (/redirect/i.test(raw) && /not allowed|invalid/i.test(raw)) {
    return 'Password recovery is not configured for this ChalkBox URL yet.'
  }
  return raw || fallback
}

function notifyAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
  }
}

function persistSession(session: ChalkBoxAuthSession | null) {
  if (typeof window === 'undefined') return
  if (!session) {
    clearStoredTeacherSession()
  } else {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  }
  notifyAuthChanged()
}

function toSession(payload: Record<string, unknown>): ChalkBoxAuthSession | null {
  const user = payload.user
  const accessToken = payload.access_token
  const refreshToken = payload.refresh_token
  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    !user ||
    typeof user !== 'object'
  ) {
    return null
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  const expiresAt =
    typeof payload.expires_at === 'number'
      ? payload.expires_at
      : Math.floor(Date.now() / 1000) + expiresIn

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: typeof payload.token_type === 'string' ? payload.token_type : 'bearer',
    user: user as ChalkBoxAuthSession['user'],
  }
}

export async function refreshTeacherSession(
  session = getStoredTeacherSession(),
): Promise<ChalkBoxAuthSession | null> {
  if (!session?.refresh_token) return null

  const { url, anonKey } = getConfig()
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      ...(anonKey.startsWith('sb_publishable_') ? {} : { Authorization: `Bearer ${anonKey}` }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })

  if (!response.ok) {
    persistSession(null)
    return null
  }

  const payload = (await response.json()) as Record<string, unknown>
  const refreshed = toSession(payload)
  persistSession(refreshed)
  return refreshed
}

export async function getFreshTeacherSession(): Promise<ChalkBoxAuthSession | null> {
  const session = getStoredTeacherSession()
  if (!session) return null

  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at > now + 90) return session

  return refreshTeacherSession(session)
}

export async function signOutTeacher() {
  const session = getStoredTeacherSession()
  const { url, anonKey } = getConfig()

  if (session?.access_token) {
    try {
      await fetch(`${url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      })
    } catch {
      // Local sign-out must still succeed if the network is unavailable.
    }
  }

  persistSession(null)
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Enter your email address.')

  const { url, anonKey } = getConfig()
  const response = await fetch(`${url}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      ...(anonKey.startsWith('sb_publishable_') ? {} : { Authorization: `Bearer ${anonKey}` }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
      redirect_to: `${appOrigin()}/reset-password`,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(
      authFailureMessage(
        response.status,
        payload,
        'ChalkBox could not send the password reset email.',
      ),
    )
  }
}

export function captureRecoverySessionFromUrl(): ChalkBoxAuthSession | null {
  if (typeof window === 'undefined' || !window.location.hash) return null

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const authError = params.get('error_description') || params.get('error')
  if (authError) {
    window.history.replaceState({}, document.title, window.location.pathname)
    throw new Error(authError.replace(/\+/g, ' '))
  }
  if (params.get('type') !== 'recovery') return null

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null

  const expiresIn = Number(params.get('expires_in') ?? 3600)
  const session: ChalkBoxAuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number.isFinite(expiresIn) ? expiresIn : 3600,
    expires_at: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    token_type: params.get('token_type') ?? 'bearer',
    user: { id: 'recovery-session' },
  }

  persistSession(session)
  window.history.replaceState({}, document.title, window.location.pathname)
  return session
}

export async function updateRecoveredPassword(password: string) {
  if (password.length < 8) {
    throw new Error('Use a password of at least 8 characters.')
  }

  const session = await getFreshTeacherSession()
  if (!session) {
    throw new Error('Open the latest password-reset link from your email and try again.')
  }

  const { url, anonKey } = getConfig()
  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(
      authFailureMessage(
        response.status,
        payload,
        'ChalkBox could not update your password.',
      ),
    )
  }

  // Recovery sessions are intentionally short-lived. Force a normal sign-in
  // after changing the password so a placeholder recovery user can never
  // become an authenticated product workspace session.
  persistSession(null)
}
