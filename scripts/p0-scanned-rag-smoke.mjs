import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const required = [
  'P0_SUPABASE_URL',
  'P0_SUPABASE_PUBLISHABLE_KEY',
  'P0_USER_A_EMAIL',
  'P0_USER_A_PASSWORD',
]
for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error(`P0 SCANNED RAG: missing ${name}`)
    process.exit(2)
  }
}

const url = process.env.P0_SUPABASE_URL.trim().replace(/\/$/, '')
const key = process.env.P0_SUPABASE_PUBLISHABLE_KEY.trim()
const candidates = [
  process.env.P0_SCANNED_PDF?.trim(),
  path.join(process.cwd(), 'ChalkBox_P0_Scanned_Science_Test.pdf'),
  path.join(os.homedir(), 'Downloads', 'ChalkBox_P0_Scanned_Science_Test.pdf'),
].filter(Boolean)
const pdfPath = candidates.find((candidate) => fs.existsSync(candidate))
if (!pdfPath) {
  console.error('P0 SCANNED RAG: test PDF not found. Set P0_SCANNED_PDF or put ChalkBox_P0_Scanned_Science_Test.pdf in Downloads.')
  process.exit(2)
}

async function signIn(email, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token || !payload.user?.id) {
    throw new Error(`Sign-in failed (HTTP ${response.status}).`)
  }
  return { token: payload.access_token, id: payload.user.id }
}

function authHeaders(token, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${token}`, ...extra }
}

async function request(pathname, token, init = {}) {
  return fetch(`${url}${pathname}`, {
    ...init,
    headers: authHeaders(token, init.headers ?? {}),
  })
}

async function json(response, label) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`${label} failed (HTTP ${response.status})${payload.message ? `: ${payload.message}` : ''}`)
  }
  return payload
}

let session
let documentId = ''
let storagePath = ''
let planId = ''
try {
  session = await signIn(process.env.P0_USER_A_EMAIL, process.env.P0_USER_A_PASSWORD)
  const bytes = fs.readFileSync(pdfPath)
  if (bytes.length <= 0 || bytes.length > 12 * 1024 * 1024) throw new Error('Scanned test PDF must be between 1 byte and 12 MB.')

  documentId = crypto.randomUUID()
  storagePath = `${session.id}/${documentId}/ChalkBox_P0_Scanned_Science_Test.pdf`
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')

  const upload = await request(`/storage/v1/object/teacher-textbooks/${encodedPath}`, session.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
    body: bytes,
  })
  if (!upload.ok) throw new Error(`Private scanned-PDF upload failed (HTTP ${upload.status}).`)
  console.log('PASS - image-only PDF uploaded to Account A private storage')

  const create = await request('/rest/v1/source_documents', session.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: documentId,
      owner_id: session.id,
      file_name: 'ChalkBox_P0_Scanned_Science_Test.pdf',
      storage_path: storagePath,
      mime_type: 'application/pdf',
      size_bytes: bytes.length,
      status: 'uploading',
      metadata: { p0ScannedProbe: true },
    }),
  })
  await json(create, 'Create scanned source document')
  console.log('PASS - private source document row created')

  const ingestResponse = await request('/functions/v1/ingest-private-textbook', session.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      pages: [],
      totalPages: 6,
      allowGeminiFallback: true,
    }),
  })
  const ingested = await json(ingestResponse, 'Scanned-PDF ingestion')
  if (ingested.ok !== true || ingested.extractionMode !== 'gemini_scanned_pdf') {
    throw new Error(`Scanned-PDF ingestion returned unexpected mode: ${String(ingested.extractionMode)}`)
  }
  if (!Number.isInteger(ingested.pages) || ingested.pages < 3) throw new Error('Scanned-PDF extraction returned too few readable pages.')
  if (!Number.isInteger(ingested.chunks) || ingested.chunks < 1) throw new Error('Scanned-PDF ingestion produced no private chunks.')
  console.log(`PASS - scanned fallback extracted ${ingested.pages}/6 page(s) and built ${ingested.chunks} chunk(s)`)

  const pagesResponse = await request(`/rest/v1/source_pages?document_id=eq.${encodeURIComponent(documentId)}&select=page_number,extraction_method&order=page_number.asc`, session.token)
  const pages = await json(pagesResponse, 'Read indexed scanned pages')
  if (!Array.isArray(pages) || pages.length < 3 || pages.some((row) => !String(row.extraction_method ?? '').startsWith('gemini_pdf:'))) {
    throw new Error('Indexed scanned pages are missing Gemini scanned-PDF provenance.')
  }
  console.log('PASS - indexed source pages are account-scoped scanned-PDF extractions')

  const generateResponse = await request('/functions/v1/generate-private-textbook-lesson', session.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId,
      teacherRequest: 'Teach specific heat capacity and thermal equilibrium with one worked calculation, one low-resource activity, one misconception and a quick check.',
      classLevel: 9,
      durationMinutes: 30,
      resourceLevel: 'low',
      language: 'english',
      pageStart: null,
      pageEnd: null,
    }),
  })
  const generated = await json(generateResponse, 'Generate lesson from scanned private RAG')
  if (generated.ok !== true || !generated.planId || !generated.bundle) throw new Error('Scanned RAG did not return a saved lesson plan.')
  planId = generated.planId
  const allowedPages = generated.bundle?.sourceDocument?.allowedPages
  if (!Array.isArray(allowedPages) || allowedPages.length < 1 || allowedPages.some((page) => !Number.isInteger(page) || page < 1 || page > 6)) {
    throw new Error('Generated scanned lesson has invalid source-page grounding.')
  }
  console.log(`PASS - scanned private RAG generated and saved a lesson grounded to page(s): ${allowedPages.join(', ')}`)
  console.log('\nP0 SCANNED PDF -> PRIVATE RAG -> LESSON: PASS')
} catch (error) {
  console.error(`\nP0 SCANNED PDF -> PRIVATE RAG -> LESSON: FAIL\n  ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  if (session?.token) {
    if (planId) {
      await request(`/rest/v1/teacher_plans?id=eq.${encodeURIComponent(planId)}`, session.token, { method: 'DELETE' }).catch(() => null)
    }
    if (documentId) {
      await request(`/rest/v1/source_documents?id=eq.${encodeURIComponent(documentId)}`, session.token, { method: 'DELETE' }).catch(() => null)
    }
    if (storagePath) {
      await request('/storage/v1/object/teacher-textbooks', session.token, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [storagePath] }),
      }).catch(() => null)
    }
  }
}
