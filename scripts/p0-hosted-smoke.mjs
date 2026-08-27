const rawUrl = process.env.P0_APP_URL?.trim()
if (!rawUrl) {
  console.error('P0 HOSTED SMOKE: missing P0_APP_URL')
  process.exit(2)
}

let origin
try {
  const parsed = new URL(rawUrl)
  if (parsed.protocol !== 'https:') throw new Error('production URL must use https')
  origin = parsed.origin
} catch (error) {
  console.error(`P0 HOSTED SMOKE: invalid P0_APP_URL (${error instanceof Error ? error.message : error})`)
  process.exit(2)
}

const routes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/app',
  '/app/library',
  '/app/textbooks',
  '/topic?product=1',
]

let failed = false
for (const route of routes) {
  const response = await fetch(`${origin}${route}`, { redirect: 'manual' })
  const text = await response.text().catch(() => '')
  const isHtml = /<html|<!doctype html/i.test(text)
  const hasRoot = /id=["']root["']/.test(text)
  const redirectedToLocalhost = /^https?:\/\/localhost/i.test(response.headers.get('location') ?? '')
  const ok = response.status === 200 && isHtml && hasRoot && !redirectedToLocalhost
  console.log(`${ok ? 'PASS' : 'FAIL'} ${route} -> HTTP ${response.status}`)
  if (!ok) failed = true
}

const root = await fetch(origin)
const requiredHeaders = [
  ['x-frame-options', 'DENY'],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
]
for (const [name, expected] of requiredHeaders) {
  const actual = root.headers.get(name) ?? ''
  const ok = actual.toLowerCase().includes(expected.toLowerCase())
  console.log(`${ok ? 'PASS' : 'FAIL'} header ${name}: ${actual || '<missing>'}`)
  if (!ok) failed = true
}
const csp = root.headers.get('content-security-policy') ?? ''
const cspOk = csp.includes("frame-ancestors 'none'") && csp.includes('https://*.supabase.co')
console.log(`${cspOk ? 'PASS' : 'FAIL'} Content-Security-Policy`)
if (!cspOk) failed = true

if (failed) {
  console.error('\nP0 HOSTED SMOKE: FAIL')
  process.exit(1)
}
console.log('\nP0 HOSTED SMOKE: PASS')
