import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const binaryExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.pdf', '.zip', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.mov', '.bin', '.sqlite',
])
const skipDirs = new Set(['.git', 'node_modules', '.pnpm-store', 'coverage', '.cache'])
const maxTextBytes = 2 * 1024 * 1024

function isPlaceholder(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '').toLowerCase()
  return (
    !normalized ||
    normalized === 'undefined' ||
    normalized === 'null' ||
    normalized.includes('your-') ||
    normalized.includes('your_') ||
    normalized.includes('<') ||
    normalized.includes('example') ||
    normalized.includes('changeme') ||
    normalized.includes('replace-me')
  )
}

function trackedFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    return output.split('\0').filter(Boolean)
  } catch {
    return []
  }
}

function isTracked(rel) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', rel], {
      cwd: root,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

function walk(relDir) {
  const absolute = path.join(root, relDir)
  if (!fs.existsSync(absolute)) return []
  const files = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue
    const rel = path.join(relDir, entry.name)
    if (entry.isDirectory()) files.push(...walk(rel))
    else files.push(rel)
  }
  return files
}

const candidates = new Set(trackedFiles())
// Also scan the current working tree so a freshly applied patch is covered
// before the user stages/commits its new files.
for (const relDir of ['src', 'supabase', 'scripts', 'public']) {
  if (fs.existsSync(path.join(root, relDir))) {
    for (const file of walk(relDir)) candidates.add(file)
  }
}
for (const name of fs.readdirSync(root)) {
  if (/^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|vite\.config\..+|wrangler\..+)$/.test(name)) {
    candidates.add(name)
    continue
  }

  // Local .env files are expected to contain private runtime secrets and are
  // already excluded from source control. Only scan an env file if it is
  // actually tracked, because tracked env files would be a release defect.
  if (/^\.env(?:\..*)?$/.test(name) && isTracked(name)) {
    candidates.add(name)
  }
}
if (fs.existsSync(path.join(root, 'dist'))) {
  for (const file of walk('dist')) candidates.add(file)
}

const literalPatterns = [
  { label: 'Google/Gemini API key', regex: /AIza[0-9A-Za-z_-]{30,}/g },
  { label: 'Supabase secret key', regex: /sb_secret_[0-9A-Za-z_-]{16,}/g },
  { label: 'GitHub token', regex: /gh[pousr]_[0-9A-Za-z]{24,}/g },
  { label: 'private key material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
]

const sensitiveAssignments = /\b(GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEYS|CLOUDFLARE_API_TOKEN|CLOUDFLARE_API_KEY|GITHUB_TOKEN|RESEND_API_KEY)\s*=\s*(['"])([^'"\r\n]+)\2/g
const findings = []
let scanned = 0

for (const rel of [...candidates].sort()) {
  const ext = path.extname(rel).toLowerCase()
  if (binaryExtensions.has(ext)) continue
  const absolute = path.join(root, rel)
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue
  if (fs.statSync(absolute).size > maxTextBytes) continue

  let text
  try { text = fs.readFileSync(absolute, 'utf8') } catch { continue }
  if (text.includes('\0')) continue
  scanned += 1

  for (const { label, regex } of literalPatterns) {
    regex.lastIndex = 0
    const match = regex.exec(text)
    if (match) {
      const line = text.slice(0, match.index).split(/\r?\n/).length
      findings.push({ rel, line, label })
    }
  }

  sensitiveAssignments.lastIndex = 0
  for (const match of text.matchAll(sensitiveAssignments)) {
    const value = match[3] ?? ''
    if (isPlaceholder(value)) continue
    const line = text.slice(0, match.index).split(/\r?\n/).length
    findings.push({ rel, line, label: `${match[1]} contains a value` })
  }
}

if (findings.length > 0) {
  console.error(`P0 SECRET SCAN: FAIL (${findings.length} finding${findings.length === 1 ? '' : 's'})`)
  for (const finding of findings) {
    console.error(`  ${finding.rel}:${finding.line} - ${finding.label}`)
  }
  console.error('No secret values were printed. Remove the finding from tracked/build output and rerun the scan.')
  process.exit(1)
}

console.log(`P0 SECRET SCAN: PASS (${scanned} text files checked; tracked source + dist when present)`)
