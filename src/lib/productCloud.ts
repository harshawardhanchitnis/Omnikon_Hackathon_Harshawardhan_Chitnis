import type { ChalkBoxAuthSession } from '@/lib/auth'
import { getStoredTeacherSession } from '@/lib/auth'
import {
  parseApiError,
  productFetch,
} from '@/lib/productApi'

export type CloudPlan = {
  id: string
  owner_id: string
  source_mode: 'topic' | 'private_textbook'
  source_id: string
  title: string
  class_level: number | null
  subject: string
  duration_minutes: number | null
  language: string | null
  resource_level: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SourceDocument = {
  id: string
  owner_id: string
  file_name: string
  storage_path: string
  mime_type: string
  size_bytes: number
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  total_pages: number | null
  readable_pages: number | null
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

function sessionOrThrow(): ChalkBoxAuthSession {
  const session = getStoredTeacherSession()
  if (!session) throw new Error('Sign in to use your ChalkBox cloud workspace.')
  return session
}

async function jsonOrThrow<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) throw new Error(await parseApiError(response, fallback))
  return (await response.json()) as T
}

const AUTHENTICATED_TOPIC_ORIGIN = 'authenticated_topic'

async function listCloudPlansRaw(): Promise<CloudPlan[]> {
  const response = await productFetch(
    '/rest/v1/teacher_plans?select=*&order=updated_at.desc&limit=100',
  )
  return jsonOrThrow<CloudPlan[]>(response, 'Could not load your lesson library.')
}

function isAuthenticatedProductPlan(plan: CloudPlan) {
  return (
    plan.source_mode !== 'topic' ||
    asString(plan.payload.productOrigin) === AUTHENTICATED_TOPIC_ORIGIN
  )
}

export async function listCloudPlans(): Promise<CloudPlan[]> {
  const rows = await listCloudPlansRaw()
  return rows.filter(isAuthenticatedProductPlan)
}

function demoTopicGenerationIdsFromLocalStorage() {
  const ids = new Set<string>()

  function add(value: unknown) {
    const record = asRecord(value)
    const id = asString(record?.generationId)
    if (id) ids.add(id)
  }

  try {
    const active = localStorage.getItem('chalkbox-topic-active-v1')
    if (active) add(JSON.parse(active))
  } catch {
    // Ignore malformed local demo data.
  }

  try {
    const history = localStorage.getItem('chalkbox-topic-history-v1')
    if (history) {
      const parsed = JSON.parse(history) as unknown
      if (Array.isArray(parsed)) parsed.forEach(add)
    }
  } catch {
    // Ignore malformed local demo data.
  }

  return ids
}

export async function cleanupLegacyDemoTopicImports() {
  const session = getStoredTeacherSession()
  if (!session) return 0

  const cleanupKey = `chalkbox-product-demo-import-cleanup-v2:${session.user.id}`
  if (localStorage.getItem(cleanupKey) === 'done') return 0

  const demoIds = demoTopicGenerationIdsFromLocalStorage()
  if (demoIds.size === 0) return 0

  const rows = await listCloudPlansRaw()
  const legacyDemoImports = rows.filter(
    (plan) =>
      plan.source_mode === 'topic' &&
      asString(plan.payload.productOrigin) !== AUTHENTICATED_TOPIC_ORIGIN &&
      demoIds.has(plan.source_id),
  )

  for (const plan of legacyDemoImports) {
    await deleteCloudPlan(plan.id)
  }

  localStorage.setItem(cleanupKey, 'done')
  return legacyDemoImports.length
}
export async function getCloudPlan(planId: string): Promise<CloudPlan> {
  const response = await productFetch(
    `/rest/v1/teacher_plans?id=eq.${encodeURIComponent(planId)}&select=*&limit=1`,
  )
  const rows = await jsonOrThrow<CloudPlan[]>(response, 'Could not load this lesson.')
  if (!rows[0]) throw new Error('Lesson not found.')
  return rows[0]
}

export async function deleteCloudPlan(planId: string) {
  const response = await productFetch(
    `/rest/v1/teacher_plans?id=eq.${encodeURIComponent(planId)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) throw new Error(await parseApiError(response, 'Could not delete this lesson.'))
}

export async function upsertCloudPlan(input: {
  sourceMode: 'topic' | 'private_textbook'
  sourceId: string
  title: string
  classLevel?: number | null
  subject?: string
  durationMinutes?: number | null
  language?: string | null
  resourceLevel?: string | null
  payload: Record<string, unknown>
}) {
  const session = sessionOrThrow()
  const response = await productFetch(
    '/rest/v1/teacher_plans?on_conflict=owner_id,source_mode,source_id',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        owner_id: session.user.id,
        source_mode: input.sourceMode,
        source_id: input.sourceId,
        title: input.title,
        class_level: input.classLevel ?? null,
        subject: input.subject ?? 'Science',
        duration_minutes: input.durationMinutes ?? null,
        language: input.language ?? null,
        resource_level: input.resourceLevel ?? null,
        payload: input.payload,
      }),
    },
  )
  return jsonOrThrow<CloudPlan[]>(response, 'Could not save this lesson to ChalkBox cloud.')
}

export async function listSourceDocuments(): Promise<SourceDocument[]> {
  const response = await productFetch(
    '/rest/v1/source_documents?select=*&order=updated_at.desc&limit=100',
  )
  return jsonOrThrow<SourceDocument[]>(response, 'Could not load My Textbooks.')
}

export async function getSourceDocument(documentId: string): Promise<SourceDocument> {
  const response = await productFetch(
    `/rest/v1/source_documents?id=eq.${encodeURIComponent(documentId)}&select=*&limit=1`,
  )
  const rows = await jsonOrThrow<SourceDocument[]>(response, 'Could not load this textbook.')
  if (!rows[0]) throw new Error('Textbook not found.')
  return rows[0]
}

export async function createSourceDocument(file: File) {
  const session = sessionOrThrow()
  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-')
  const storagePath = `${session.user.id}/${id}/${safeName || 'textbook.pdf'}`

  const response = await productFetch('/rest/v1/source_documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id,
      owner_id: session.user.id,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/pdf',
      size_bytes: file.size,
      status: 'uploading',
      metadata: {},
    }),
  })

  const rows = await jsonOrThrow<SourceDocument[]>(response, 'Could not create the textbook record.')
  return rows[0]
}

export async function uploadSourcePdf(document: SourceDocument, file: File) {
  const response = await productFetch(
    `/storage/v1/object/teacher-textbooks/${document.storage_path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'x-upsert': 'false',
      },
      body: file,
    },
  )
  if (!response.ok) throw new Error(await parseApiError(response, 'Could not upload this PDF.'))
}

export async function deleteSourceDocument(document: SourceDocument) {
  const storageResponse = await productFetch('/storage/v1/object/teacher-textbooks', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [document.storage_path] }),
  })
  if (!storageResponse.ok) {
    throw new Error(await parseApiError(storageResponse, 'Could not remove the private PDF from storage.'))
  }
  const response = await productFetch(
    `/rest/v1/source_documents?id=eq.${encodeURIComponent(document.id)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) throw new Error(await parseApiError(response, 'Could not delete this textbook.'))
}

export async function callProductFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await productFetch(`/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrThrow<T>(response, `ChalkBox service ${name} failed.`)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

export async function syncLocalPlansToCloud() {
  if (!getStoredTeacherSession()) return

  // Demo Topic plans intentionally remain browser-local.

  const session = getStoredTeacherSession()
  if (!session) return

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue

    if (key.startsWith('chalkbox-topic-notes-v1:')) {
      const sourceId = key.slice('chalkbox-topic-notes-v1:'.length)
      const notes = localStorage.getItem(key) ?? ''
      await productFetch('/rest/v1/teacher_notes?on_conflict=owner_id,plan_source_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          owner_id: session.user.id,
          plan_source_id: sourceId,
          notes,
        }),
      })
    }

    if (key.startsWith('chalkbox-lesson-customizations-v1:')) {
      const lessonIdentity = key.slice('chalkbox-lesson-customizations-v1:'.length)
      let patches: unknown = {}
      try {
        patches = JSON.parse(localStorage.getItem(key) ?? '{}')
      } catch {
        patches = {}
      }
      await productFetch('/rest/v1/lesson_customizations?on_conflict=owner_id,lesson_identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          owner_id: session.user.id,
          lesson_identity: lessonIdentity,
          patches,
        }),
      })
    }
  }
}
