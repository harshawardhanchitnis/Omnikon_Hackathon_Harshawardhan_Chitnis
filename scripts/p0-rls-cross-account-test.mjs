const required = [
  'P0_SUPABASE_URL',
  'P0_SUPABASE_PUBLISHABLE_KEY',
  'P0_USER_A_EMAIL',
  'P0_USER_A_PASSWORD',
  'P0_USER_B_EMAIL',
  'P0_USER_B_PASSWORD',
]

for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error(`P0 RLS TEST: missing ${name}`)
    process.exit(2)
  }
}

const url = process.env.P0_SUPABASE_URL.trim().replace(/\/$/, '')
const key = process.env.P0_SUPABASE_PUBLISHABLE_KEY.trim()
const marker = `p0-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
const results = []

function check(condition, label, detail = '') {
  results.push({ ok: Boolean(condition), label, detail })
  if (!condition) throw new Error(`${label}${detail ? `: ${detail}` : ''}`)
}

async function signIn(email, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.access_token || !body.user?.id) {
    throw new Error(`Sign-in failed for one P0 test account (HTTP ${response.status}).`)
  }
  return { token: body.access_token, id: body.user.id }
}

function headers(token, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    ...extra,
  }
}

async function rest(path, token, init = {}) {
  return fetch(`${url}${path}`, {
    ...init,
    headers: headers(token, init.headers ?? {}),
  })
}

async function rows(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Unexpected HTTP ${response.status}${text ? `: ${text.slice(0, 220)}` : ''}`)
  }
  return response.json()
}

async function createRow(table, token, body) {
  const response = await rest(`/rest/v1/${table}`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const created = await rows(response)
  if (!Array.isArray(created) || !created[0]?.id) throw new Error(`Could not create ${table} P0 probe row.`)
  return created[0]
}

async function deleteOwn(table, token, id) {
  await rest(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, token, { method: 'DELETE' })
}

async function invisibleTo(token, table, id) {
  const response = await rest(
    `/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=id&limit=1`,
    token,
  )
  const value = await rows(response)
  return Array.isArray(value) && value.length === 0
}

async function foreignOwnerInsertDenied(table, token, body) {
  const response = await rest(`/rest/v1/${table}`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  return !response.ok
}

let a
let b
let plan
let note
let customization
let probeDocument
let storagePath = ''

try {
  a = await signIn(process.env.P0_USER_A_EMAIL, process.env.P0_USER_A_PASSWORD)
  b = await signIn(process.env.P0_USER_B_EMAIL, process.env.P0_USER_B_PASSWORD)
  check(a.id !== b.id, 'Two distinct authenticated users')

  plan = await createRow('teacher_plans', a.token, {
    owner_id: a.id,
    source_mode: 'topic',
    source_id: marker,
    title: 'P0 RLS probe',
    class_level: 9,
    subject: 'Science',
    duration_minutes: 30,
    language: 'english',
    resource_level: 'low',
    payload: { productOrigin: 'authenticated_topic', p0Probe: true },
  })
  check(await invisibleTo(b.token, 'teacher_plans', plan.id), 'B cannot read A teacher_plan')

  const bDeletePlan = await rest(
    `/rest/v1/teacher_plans?id=eq.${encodeURIComponent(plan.id)}`,
    b.token,
    { method: 'DELETE' },
  )
  check(bDeletePlan.ok, 'B delete request is safely filtered by RLS')
  const aPlanStillThere = await rows(await rest(
    `/rest/v1/teacher_plans?id=eq.${encodeURIComponent(plan.id)}&select=id`,
    a.token,
  ))
  check(aPlanStillThere.length === 1, 'B cannot delete A teacher_plan')
  check(
    await foreignOwnerInsertDenied('teacher_plans', b.token, {
      owner_id: a.id,
      source_mode: 'topic',
      source_id: `${marker}-foreign`,
      title: 'must fail',
      payload: {},
    }),
    'B cannot insert teacher_plan as A',
  )

  note = await createRow('teacher_notes', a.token, {
    owner_id: a.id,
    plan_source_id: marker,
    notes: 'P0 private note',
  })
  check(await invisibleTo(b.token, 'teacher_notes', note.id), 'B cannot read A teacher_note')
  check(
    await foreignOwnerInsertDenied('teacher_notes', b.token, {
      owner_id: a.id,
      plan_source_id: `${marker}-foreign`,
      notes: 'must fail',
    }),
    'B cannot write teacher_note as A',
  )

  customization = await createRow('lesson_customizations', a.token, {
    owner_id: a.id,
    lesson_identity: marker,
    patches: { p0Probe: true },
  })
  check(await invisibleTo(b.token, 'lesson_customizations', customization.id), 'B cannot read A customization')
  check(
    await foreignOwnerInsertDenied('lesson_customizations', b.token, {
      owner_id: a.id,
      lesson_identity: `${marker}-foreign`,
      patches: {},
    }),
    'B cannot write customization as A',
  )

  storagePath = `${a.id}/${crypto.randomUUID()}/p0-probe.pdf`
  const pdfProbe = new TextEncoder().encode('%PDF-1.4\n% ChalkBox P0 storage isolation probe\n%%EOF\n')
  const upload = await rest(
    `/storage/v1/object/teacher-textbooks/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
    a.token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
      body: pdfProbe,
    },
  )
  check(upload.ok, 'A can upload to A storage prefix', `HTTP ${upload.status}`)

  const bStorageRead = await rest(
    `/storage/v1/object/teacher-textbooks/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
    b.token,
  )
  check(!bStorageRead.ok, 'B cannot read A private storage object', `HTTP ${bStorageRead.status}`)

  const aStorageRead = await rest(
    `/storage/v1/object/teacher-textbooks/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
    a.token,
  )
  check(aStorageRead.ok, 'A can read A private storage object', `HTTP ${aStorageRead.status}`)

  probeDocument = await createRow('source_documents', a.token, {
    owner_id: a.id,
    file_name: 'p0-probe.pdf',
    storage_path: storagePath,
    mime_type: 'application/pdf',
    size_bytes: pdfProbe.length,
    status: 'uploading',
    metadata: { p0Probe: true },
  })
  check(await invisibleTo(b.token, 'source_documents', probeDocument.id), 'B cannot read A source_document')
  check(
    await foreignOwnerInsertDenied('source_documents', b.token, {
      owner_id: a.id,
      file_name: 'must-fail.pdf',
      storage_path: `${a.id}/${crypto.randomUUID()}/must-fail.pdf`,
      mime_type: 'application/pdf',
      size_bytes: 10,
      status: 'uploading',
      metadata: {},
    }),
    'B cannot create source_document as A',
  )

  // Build a tiny private index under Account A so this security test is
  // self-contained and does not depend on pre-existing account data.
  const ingestResponse = await rest('/functions/v1/ingest-private-textbook', a.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId: probeDocument.id,
      totalPages: 2,
      allowGeminiFallback: false,
      pages: [
        {
          pageNumber: 1,
          readability: 1,
          text: 'P0 security probe page one. Temperature is linked to the average kinetic energy of particles. Thermal energy moves from a hotter object to a colder object when a temperature difference exists. This synthetic text exists only to create an owner-scoped vector row for the RLS test.',
        },
        {
          pageNumber: 2,
          readability: 1,
          text: 'P0 security probe page two. At thermal equilibrium two objects have the same temperature and there is no net thermal-energy transfer between them. This synthetic text is intentionally long enough to create a second private source page and chunk for isolation testing.',
        },
      ],
    }),
  })
  const ingestPayload = await ingestResponse.json().catch(() => ({}))
  check(
    ingestResponse.ok && ingestPayload.ok === true,
    'A can build an owner-scoped private index',
    `HTTP ${ingestResponse.status}${ingestPayload.message ? `: ${ingestPayload.message}` : ''}`,
  )
  const readyId = probeDocument.id

  const bPages = await rows(await rest(
    `/rest/v1/source_pages?document_id=eq.${encodeURIComponent(readyId)}&select=id&limit=3`,
    b.token,
  ))
  check(Array.isArray(bPages) && bPages.length === 0, 'B cannot read A source_pages')

  const bChunks = await rows(await rest(
    `/rest/v1/source_chunks?document_id=eq.${encodeURIComponent(readyId)}&select=id&limit=3`,
    b.token,
  ))
  check(Array.isArray(bChunks) && bChunks.length === 0, 'B cannot read A source_chunks')

  const zeroVector = `[${Array.from({ length: 768 }, () => '0').join(',')}]`
  const rpcResponse = await rest('/rest/v1/rpc/match_private_textbook_chunks', b.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_embedding: zeroVector,
      match_document: readyId,
      match_count: 3,
    }),
  })
  const rpcRows = await rows(rpcResponse)
  check(Array.isArray(rpcRows) && rpcRows.length === 0, 'B vector RPC cannot retrieve A chunks')

  console.log('\nP0 CROSS-ACCOUNT RLS/STORAGE TEST: PASS')
  for (const result of results) console.log(`  PASS - ${result.label}${result.detail ? ` (${result.detail})` : ''}`)
} catch (error) {
  console.error('\nP0 CROSS-ACCOUNT RLS/STORAGE TEST: FAIL')
  for (const result of results) console.error(`  ${result.ok ? 'PASS' : 'FAIL'} - ${result.label}${result.detail ? ` (${result.detail})` : ''}`)
  console.error(`  ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  if (a?.token) {
    if (plan?.id) await deleteOwn('teacher_plans', a.token, plan.id).catch(() => null)
    if (note?.id) await deleteOwn('teacher_notes', a.token, note.id).catch(() => null)
    if (customization?.id) await deleteOwn('lesson_customizations', a.token, customization.id).catch(() => null)
    if (probeDocument?.id) await deleteOwn('source_documents', a.token, probeDocument.id).catch(() => null)
    if (storagePath) {
      await rest('/storage/v1/object/teacher-textbooks', a.token, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [storagePath] }),
      }).catch(() => null)
    }
  }
}
