import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const passes = []

function pass(message) { passes.push(message) }
function fail(message) { failures.push(message) }

function parseEnv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index < 1) continue
    out[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return out
}

const redirectsPath = path.join(root, 'public', '_redirects')
if (fs.existsSync(redirectsPath) && /\/\*\s+\/index\.html\s+200/.test(fs.readFileSync(redirectsPath, 'utf8'))) {
  pass('Cloudflare SPA fallback is present')
} else fail('public/_redirects must contain /* /index.html 200')

const headersPath = path.join(root, 'public', '_headers')
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8')
  for (const required of ['X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Content-Security-Policy:']) {
    if (headers.includes(required)) pass(`Cloudflare header present: ${required.split(':')[0]}`)
    else fail(`public/_headers is missing ${required}`)
  }
} else fail('public/_headers is missing')

const envPath = path.join(root, '.env.local')
const env = parseEnv(envPath)
if (Object.keys(env).length === 0) {
  pass('.env.local not inspected (missing/empty); Cloudflare production variables will be checked during deployment')
} else {
  const forbidden = [
    'GEMINI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SECRET_KEYS',
    'CLOUDFLARE_API_TOKEN',
    'RESEND_API_KEY',
  ]
  for (const name of forbidden) {
    if (env[name]) fail(`${name} must never be present in browser .env.local`)
  }

  if (/^https:\/\//.test(env.VITE_SUPABASE_URL ?? '')) pass('VITE_SUPABASE_URL looks valid')
  else fail('VITE_SUPABASE_URL must be an https URL')

  if (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY) pass('Supabase public browser key is configured')
  else fail('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY is required')

  if (env.VITE_APP_URL) {
    try {
      const app = new URL(env.VITE_APP_URL)
      if (app.protocol === 'https:' || app.hostname === 'localhost' || app.hostname === '127.0.0.1') pass('VITE_APP_URL looks valid')
      else fail('VITE_APP_URL must be https in production')
    } catch { fail('VITE_APP_URL is invalid') }
  }
}

if (process.env.P0_APP_URL?.trim()) {
  try {
    const p0 = new URL(process.env.P0_APP_URL.trim())
    if (p0.protocol === 'https:') pass('P0_APP_URL is an https production origin')
    else fail('P0_APP_URL must use https for production checks')
  } catch { fail('P0_APP_URL is invalid') }
}

for (const message of passes) console.log(`PASS - ${message}`)
if (failures.length) {
  for (const message of failures) console.error(`FAIL - ${message}`)
  console.error(`\nP0 PRODUCTION CONFIG: FAIL (${failures.length})`)
  process.exit(1)
}
console.log('\nP0 PRODUCTION CONFIG: PASS')
