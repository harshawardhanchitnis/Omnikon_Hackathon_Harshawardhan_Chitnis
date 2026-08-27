const required = [
  'P0_SUPABASE_URL',
  'P0_SUPABASE_PUBLISHABLE_KEY',
  'P0_APP_URL',
  'P0_SMTP_TEST_EMAIL',
]
for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error(`P0 SMTP SMOKE: missing ${name}`)
    process.exit(2)
  }
}

const supabaseUrl = process.env.P0_SUPABASE_URL.trim().replace(/\/$/, '')
const key = process.env.P0_SUPABASE_PUBLISHABLE_KEY.trim()
const appUrl = process.env.P0_APP_URL.trim().replace(/\/$/, '')
const email = process.env.P0_SMTP_TEST_EMAIL.trim().toLowerCase()

let parsed
try { parsed = new URL(appUrl) } catch { parsed = null }
if (!parsed || (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1')) {
  console.error('P0 SMTP SMOKE: P0_APP_URL must be an https production origin or localhost.')
  process.exit(2)
}

const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
  method: 'POST',
  headers: {
    apikey: key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    redirect_to: `${parsed.origin}/reset-password`,
  }),
})

if (!response.ok) {
  const payload = await response.json().catch(() => ({}))
  const raw = payload.msg || payload.message || payload.error_description || `HTTP ${response.status}`
  console.error(`P0 SMTP SMOKE: FAIL - ${raw}`)
  if (response.status === 429 || /rate limit/i.test(String(raw))) {
    console.error('Configure Supabase Custom SMTP before retrying; the default SMTP is intentionally rate-limited.')
  }
  process.exit(1)
}

console.log('P0 SMTP SMOKE: REQUEST ACCEPTED')
console.log(`  Recovery redirect requested: ${parsed.origin}/reset-password`)
console.log('  Final manual check: open the newest reset email, confirm it lands on this exact origin, set a new password, then sign in again.')
