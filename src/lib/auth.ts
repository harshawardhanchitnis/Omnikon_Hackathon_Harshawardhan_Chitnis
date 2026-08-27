const SESSION_STORAGE_KEY = 'chalkbox-auth-session-v1'

export type ChalkBoxAuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export type ChalkBoxAuthSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: ChalkBoxAuthUser
}

type SupabaseAuthResponse = {
  access_token?: string | null
  refresh_token?: string | null
  expires_in?: number | null
  expires_at?: number | null
  token_type?: string | null
  user?: ChalkBoxAuthUser | null
  error?: string
  error_description?: string
  msg?: string
  message?: string
}

export type RegisterTeacherInput = {
  fullName: string
  email: string
  password: string
}

export type RegisterTeacherResult = {
  session: ChalkBoxAuthSession | null
  user: ChalkBoxAuthUser | null
}

function getSupabaseConfig() {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const anonKey = String(
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      '',
  ).trim()

  if (!url || !anonKey) {
    throw new Error(
      'ChalkBox authentication is not configured. Add VITE_SUPABASE_URL and the public Supabase anon/publishable key to .env.local.',
    )
  }

  return { url, anonKey }
}

function getErrorMessage(body: SupabaseAuthResponse, fallback: string) {
  return (
    body.error_description ||
    body.msg ||
    body.message ||
    body.error ||
    fallback
  )
}

async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<SupabaseAuthResponse> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      ...(anonKey.startsWith('sb_publishable_') ? {} : { Authorization: `Bearer ${anonKey}` }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let payload: SupabaseAuthResponse = {}
  try {
    payload = (await response.json()) as SupabaseAuthResponse
  } catch {
    // Keep the empty payload and report a stable user-facing error below.
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        payload,
        `Authentication request failed (${response.status}).`,
      ),
    )
  }

  return payload
}

function toSession(payload: SupabaseAuthResponse): ChalkBoxAuthSession | null {
  if (
    !payload.access_token ||
    !payload.refresh_token ||
    !payload.user
  ) {
    return null
  }

  const expiresIn = payload.expires_in ?? 3600
  const expiresAt =
    payload.expires_at ?? Math.floor(Date.now() / 1000) + expiresIn

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: payload.token_type ?? 'bearer',
    user: payload.user,
  }
}

function persistSession(session: ChalkBoxAuthSession | null) {
  if (typeof window === 'undefined') return

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export async function signInTeacher(
  email: string,
  password: string,
): Promise<ChalkBoxAuthSession> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) {
    throw new Error('Enter your email address and password.')
  }

  const payload = await authRequest('token?grant_type=password', {
    email: normalizedEmail,
    password,
  })
  const session = toSession(payload)

  if (!session) {
    throw new Error('ChalkBox could not create a signed-in session.')
  }

  persistSession(session)
  return session
}

export async function registerTeacher({
  fullName,
  email,
  password,
}: RegisterTeacherInput): Promise<RegisterTeacherResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = fullName.trim()

  if (!normalizedName || !normalizedEmail || password.length < 8) {
    throw new Error('Enter your name, a valid email and a password of at least 8 characters.')
  }

  const payload = await authRequest('signup', {
    email: normalizedEmail,
    password,
    data: {
      full_name: normalizedName,
    },
  })
  const session = toSession(payload)

  if (session) persistSession(session)

  return {
    session,
    user: payload.user ?? session?.user ?? null,
  }
}

export function getStoredTeacherSession(): ChalkBoxAuthSession | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as ChalkBoxAuthSession
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function clearStoredTeacherSession() {
  persistSession(null)
}
