import {
  adminRest,
  asNumber,
  asRecord,
  asString,
  base64,
  corsHeaders,
  embedText,
  enforceDailyLimit,
  geminiJsonFallback,
  json,
  readJson,
  recordUsage,
  requireUser,
  supabase,
  vectorLiteral,
  type JsonRecord,
} from '../_shared/product.ts'

type Page = {
  pageNumber: number
  text: string
  readability: number
  extractionMethod: string
}

type ScannedExtraction = {
  pages: Page[]
  models: string[]
}

const MAX_PRODUCT_PAGES = 350
const MAX_SCANNED_BYTES = 12 * 1024 * 1024
const MAX_SCANNED_PAGES = 48
const SCANNED_BATCH_PAGES = 12

function clean(value: string) {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function normalizeTotalPages(value: unknown) {
  const total = asNumber(value)
  if (!total || !Number.isInteger(total) || total < 1 || total > MAX_PRODUCT_PAGES) return null
  return total
}

function normalizePages(value: unknown): Page[] {
  if (!Array.isArray(value)) return []
  const byPage = new Map<number, Page>()
  for (const item of value) {
    const row = asRecord(item)
    const pageNumber = asNumber(row?.pageNumber)
    const text = clean(asString(row?.text) ?? '')
    const readability = asNumber(row?.readability) ?? 1
    if (!pageNumber || !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > MAX_PRODUCT_PAGES || text.length < 80) continue
    byPage.set(pageNumber, {
      pageNumber,
      text,
      readability,
      extractionMethod: 'local_text_layer',
    })
  }
  return [...byPage.values()].sort((a, b) => a.pageNumber - b.pageNumber)
}

async function loadDocument(ownerId: string, documentId: string) {
  const response = await adminRest(
    `/rest/v1/source_documents?id=eq.${encodeURIComponent(documentId)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*&limit=1`,
  )
  const rows = await readJson<JsonRecord[]>(response, 'Could not read textbook record')
  if (!rows[0]) throw new Error('DOCUMENT_NOT_FOUND')
  return rows[0]
}

async function mark(documentId: string, ownerId: string, body: JsonRecord) {
  await adminRest(
    `/rest/v1/source_documents?id=eq.${encodeURIComponent(documentId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

async function downloadPrivatePdf(document: JsonRecord) {
  const storagePath = asString(document.storage_path)
  if (!storagePath) throw new Error('PDF_STORAGE_PATH_MISSING')

  const { url, service } = supabase()
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  const headers: Record<string, string> = { apikey: service }
  if (!service.startsWith('sb_secret_')) headers.Authorization = `Bearer ${service}`

  const download = await fetch(`${url}/storage/v1/object/teacher-textbooks/${encoded}`, { headers })
  if (!download.ok) throw new Error('PDF_DOWNLOAD_FAILED')
  return new Uint8Array(await download.arrayBuffer())
}

function scannedRows(value: unknown, startPage: number, endPage: number, model: string) {
  if (!Array.isArray(value)) return [] as Page[]
  const rows: Page[] = []
  for (const item of value) {
    const row = asRecord(item)
    const pageNumber = asNumber(row?.pageNumber)
    const text = clean(asString(row?.text) ?? '')
    if (
      !pageNumber ||
      !Number.isInteger(pageNumber) ||
      pageNumber < startPage ||
      pageNumber > endPage ||
      text.length < 80
    ) continue
    rows.push({
      pageNumber,
      text,
      readability: 0.8,
      extractionMethod: `gemini_pdf:${model}`,
    })
  }
  return rows
}

async function extractScannedPdf(document: JsonRecord, totalPages: number | null): Promise<ScannedExtraction> {
  const size = asNumber(document.size_bytes) ?? 0
  if (size > MAX_SCANNED_BYTES) throw new Error('SCANNED_FILE_LIMIT')
  if (!totalPages) throw new Error('SCANNED_PAGE_COUNT_REQUIRED')
  if (totalPages > MAX_SCANNED_PAGES) throw new Error('SCANNED_PAGE_LIMIT')

  const bytes = await downloadPrivatePdf(document)
  const pdfData = base64(bytes)
  const byPage = new Map<number, Page>()
  const models = new Set<string>()

  for (let startPage = 1; startPage <= totalPages; startPage += SCANNED_BATCH_PAGES) {
    const endPage = Math.min(totalPages, startPage + SCANNED_BATCH_PAGES - 1)
    const prompt = `Extract ONLY PDF pages ${startPage}-${endPage} from this scanned Science textbook. Return JSON only: {"pages":[{"pageNumber":${startPage},"text":"faithful readable page text"}]}. Use the actual PDF page numbers. Preserve headings, formulas, units, tables as readable text, and important labels. Do not summarize, solve, add facts, infer missing content, or renumber pages. If a requested page is unreadable or blank, return an empty text string for that page.`

    const result = await geminiJsonFallback(
      [
        { text: prompt },
        { inlineData: { mimeType: 'application/pdf', data: pdfData } },
      ],
      ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'],
    )
    models.add(result.model)

    const rows = scannedRows(result.value.pages, startPage, endPage, result.model)
    for (const page of rows) byPage.set(page.pageNumber, page)
  }

  const pages = [...byPage.values()].sort((a, b) => a.pageNumber - b.pageNumber)
  const minimumUsefulPages = Math.max(1, Math.ceil(totalPages * 0.5))
  if (pages.length < minimumUsefulPages) throw new Error('SCANNED_EXTRACTION_INCOMPLETE')

  return { pages, models: [...models] }
}

function chunksFromPages(pages: Page[]) {
  const chunks: { chunkIndex: number; pageStart: number; pageEnd: number; content: string }[] = []
  let index = 0
  for (const page of [...pages].sort((a, b) => a.pageNumber - b.pageNumber)) {
    const paragraphs = page.text.split(/\n\s*\n/).map(clean).filter(Boolean)
    let current = ''
    function flush() {
      if (current.trim().length >= 120) {
        chunks.push({
          chunkIndex: index++,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          content: current.trim(),
        })
      }
      current = ''
    }
    for (const paragraph of paragraphs) {
      if ((current + '\n\n' + paragraph).length > 2800 && current) flush()
      current = current ? `${current}\n\n${paragraph}` : paragraph
      while (current.length > 3200) {
        const head = current.slice(0, 2800)
        chunks.push({
          chunkIndex: index++,
          pageStart: page.pageNumber,
          pageEnd: page.pageNumber,
          content: head,
        })
        current = current.slice(2550)
      }
    }
    flush()
  }
  return chunks.slice(0, 180)
}

function publicFailure(error: unknown) {
  const raw = String(error instanceof Error ? error.message : error).replace(/^Error:\s*/, '')
  if (raw === 'DOCUMENT_NOT_FOUND') return { status: 404, message: 'This textbook was not found in your account.' }
  if (raw === 'SCANNED_FILE_LIMIT') return { status: 422, message: 'The scanned-PDF fallback supports files up to 12 MB. Split this scan into a smaller PDF and try again.' }
  if (raw === 'SCANNED_PAGE_LIMIT') return { status: 422, message: `The scanned-PDF fallback currently supports up to ${MAX_SCANNED_PAGES} pages per PDF. Split this scan and try again.` }
  if (raw === 'SCANNED_PAGE_COUNT_REQUIRED') return { status: 422, message: 'ChalkBox could not determine the page count required for scanned-PDF extraction.' }
  if (raw === 'SCANNED_EXTRACTION_INCOMPLETE') return { status: 422, message: 'The scan was too difficult to extract reliably. Try a clearer scan or a smaller page range.' }
  if (raw === 'PDF_STORAGE_PATH_MISSING' || raw === 'PDF_DOWNLOAD_FAILED') return { status: 500, message: 'ChalkBox could not read the private PDF from storage.' }
  if (/GEMINI_(408|429|500|502|503|504)|EMBED_(408|429|500|502|503|504)|AbortError|fetch/i.test(raw)) {
    return { status: 503, message: 'AI extraction is temporarily busy. Your textbook is still private; retry processing in a few minutes.' }
  }
  return { status: 500, message: 'ChalkBox could not process this PDF. Retry once; if it continues, use a smaller or clearer PDF.' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, message: 'POST required.' }, 405)

  let ownerId = ''
  let documentId = ''
  try {
    const user = await requireUser(req)
    ownerId = user.id

    const body = asRecord(await req.json())
    documentId = asString(body?.documentId) ?? ''
    if (!documentId) return json({ ok: false, message: 'documentId is required.' }, 400)

    const totalPages = normalizeTotalPages(body?.totalPages)
    if (asNumber(body?.totalPages) && !totalPages) {
      return json({ ok: false, message: `PDF page count must be between 1 and ${MAX_PRODUCT_PAGES}.` }, 400)
    }

    await enforceDailyLimit(ownerId, 'textbook_ingestion', 5)
    const document = await loadDocument(ownerId, documentId)
    await mark(documentId, ownerId, { status: 'processing', error_message: null })

    let pages = normalizePages(body?.pages)
    let extractionMode = pages.length > 0 ? 'local_text_layer' : 'gemini_scanned_pdf'
    let scanModels: string[] = []

    if (pages.length === 0 && body?.allowGeminiFallback === true) {
      const scanned = await extractScannedPdf(document, totalPages)
      pages = scanned.pages
      scanModels = scanned.models
    }

    if (pages.length === 0) {
      throw new Error('ChalkBox could not extract reliable text from this PDF.')
    }

    const chunks = chunksFromPages(pages)
    if (chunks.length === 0) throw new Error('No usable textbook chunks were produced.')

    // Replace an older failed/partial index only after extraction/chunking has succeeded.
    await adminRest(
      `/rest/v1/source_chunks?document_id=eq.${encodeURIComponent(documentId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      { method: 'DELETE' },
    )
    await adminRest(
      `/rest/v1/source_pages?document_id=eq.${encodeURIComponent(documentId)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
      { method: 'DELETE' },
    )

    for (let offset = 0; offset < pages.length; offset += 40) {
      const batch = pages.slice(offset, offset + 40).map((page) => ({
        owner_id: ownerId,
        document_id: documentId,
        page_number: page.pageNumber,
        content: page.text,
        readability: page.readability,
        extraction_method: page.extractionMethod,
      }))
      const response = await adminRest('/rest/v1/source_pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (!response.ok) throw new Error(`Could not store textbook pages: ${await response.text()}`)
    }

    const embedded: JsonRecord[] = []
    for (let offset = 0; offset < chunks.length; offset += 4) {
      const group = chunks.slice(offset, offset + 4)
      const vectors = await Promise.all(
        group.map((chunk) =>
          embedText(
            `title: ${asString(document.file_name) ?? 'Textbook'} | page ${chunk.pageStart} | text: ${chunk.content}`,
          ),
        ),
      )
      group.forEach((chunk, index) => {
        embedded.push({
          owner_id: ownerId,
          document_id: documentId,
          chunk_index: chunk.chunkIndex,
          page_start: chunk.pageStart,
          page_end: chunk.pageEnd,
          content: chunk.content,
          embedding: vectorLiteral(vectors[index]),
        })
      })
    }

    for (let offset = 0; offset < embedded.length; offset += 25) {
      const response = await adminRest('/rest/v1/source_chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embedded.slice(offset, offset + 25)),
      })
      if (!response.ok) throw new Error(`Could not store textbook vectors: ${await response.text()}`)
    }

    const resolvedTotalPages = totalPages ?? Math.max(...pages.map((page) => page.pageNumber))
    const existingMetadata = asRecord(document.metadata) ?? {}
    await mark(documentId, ownerId, {
      status: 'ready',
      total_pages: resolvedTotalPages,
      readable_pages: pages.length,
      error_message: null,
      metadata: {
        ...existingMetadata,
        chunkCount: embedded.length,
        ingestionVersion: 'private-rag-v2-p0',
        extractionMode,
        extractedPages: pages.length,
        scannedFallbackModels: scanModels,
      },
    })

    await recordUsage(ownerId, 'textbook_ingestion')
    return json({
      ok: true,
      documentId,
      extractionMode,
      pages: pages.length,
      totalPages: resolvedTotalPages,
      chunks: embedded.length,
    })
  } catch (error) {
    const failure = publicFailure(error)
    if (ownerId && documentId) {
      await mark(documentId, ownerId, {
        status: 'failed',
        error_message: failure.message.slice(0, 1000),
      }).catch(() => null)
    }

    const raw = String(error instanceof Error ? error.message : error)
    if (raw === 'AUTH_REQUIRED') return json({ ok: false, message: 'Sign in to process textbooks.' }, 401)
    if (raw === 'DAILY_LIMIT') {
      return json({ ok: false, message: 'Your daily textbook-processing limit has been reached. Try again after the quota resets.' }, 429)
    }
    return json({ ok: false, message: failure.message }, failure.status)
  }
})
