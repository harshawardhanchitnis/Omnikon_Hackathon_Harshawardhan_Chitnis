import { AlertCircle, BookOpen, FileText, LoaderCircle, RefreshCcw, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import ProductShell from '@/components/product/ProductShell'
import {
  extractPdfInBrowser,
  PRODUCT_PDF_LIMITS,
} from '@/lib/pdfIngestion'
import {
  callProductFunction,
  createSourceDocument,
  deleteSourceDocument,
  listSourceDocuments,
  uploadSourcePdf,
  type SourceDocument,
} from '@/lib/productCloud'

export default function MyTextbooksPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<SourceDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    setLoadingDocuments(true)
    try {
      setDocuments(await listSourceDocuments())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your textbooks.')
    } finally {
      setLoadingDocuments(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    setMessage('Checking the PDF text layer...')
    let document: SourceDocument | null = null

    try {
      // Validate and inspect the PDF before creating any cloud record.
      // This prevents corrupt, encrypted or over-limit files from leaving orphan rows.
      const extraction = await extractPdfInBrowser(file)

      if (!extraction.usableLocally && !extraction.scannedFallbackEligible) {
        throw new Error(
          `This PDF does not have a reliable text layer. The scanned-PDF fallback currently supports up to ${PRODUCT_PDF_LIMITS.scannedMaxPages} pages and 12 MB. Split this scan into a smaller PDF and try again.`,
        )
      }

      document = await createSourceDocument(file)
      setMessage('Uploading the private PDF...')
      await uploadSourcePdf(document, file)

      setMessage(
        extraction.usableLocally
          ? `Indexing ${extraction.readablePages} readable pages...`
          : `No reliable text layer found. Extracting ${extraction.totalPages} scanned pages securely...`,
      )

      const result = await callProductFunction<{
        ok: boolean
        extractionMode?: string
        pages?: number
        chunks?: number
      }>('ingest-private-textbook', {
        documentId: document.id,
        pages: extraction.usableLocally
          ? extraction.pages.map((page) => ({
              pageNumber: page.pageNumber,
              text: page.text,
              readability: page.readability,
            }))
          : [],
        totalPages: extraction.totalPages,
        allowGeminiFallback: !extraction.usableLocally,
      })

      setMessage(
        result.extractionMode === 'gemini_scanned_pdf'
          ? 'Scanned textbook extracted and indexed. You can generate a source-grounded lesson now.'
          : 'Textbook ready. You can generate a source-grounded lesson now.',
      )
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process this PDF.')
      await load()
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function retryProcessing(document: SourceDocument) {
    setBusy(true)
    setError(null)
    setMessage(`Retrying ${document.file_name} from its stored readable pages...`)

    try {
      await callProductFunction('ingest-private-textbook', {
        documentId: document.id,
        totalPages: document.total_pages ?? undefined,
        retryStoredPages: true,
      })
      setMessage('Textbook processing completed. You can generate a source-grounded lesson now.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not retry this textbook.')
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProductShell>
      <section className="mx-auto w-full max-w-[1260px] px-5 py-8 sm:px-8 lg:px-10">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">Private source library</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em]">My Textbooks</h1>
            <p className="mt-2 max-w-[760px] text-sm font-medium leading-6 text-[#68746c]">Upload an unseen PDF. ChalkBox extracts readable pages locally, stores the original privately, builds your account-scoped vector index and uses only retrieved pages for grounded generation.</p>
          </div>

          {!loadingDocuments && documents.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0f5132] px-5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload another PDF
            </button>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-[#d6e1d3] bg-[#edf5e9] px-4 py-3 text-[11px] font-semibold leading-5 text-[#4f6356]">Current product limits: PDF only, up to 25 MB and 350 pages. Digital text layers are preferred. Image-only/scanned PDFs use the private server-side fallback when needed (currently up to 12 MB and 48 pages per scan).</div>

        {message && <div className="mt-4 rounded-xl border border-[#c8ddca] bg-[#f3faf2] px-4 py-3 text-xs font-semibold text-[#176b43]">{message}</div>}
        {error && <div className="mt-4 flex gap-2 rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold text-[#8c3027]"><AlertCircle className="size-4 shrink-0" />{error}</div>}

        <div className="mt-6 flex justify-end">
          <button onClick={() => void load()} className="inline-flex items-center gap-2 text-xs font-extrabold text-[#176b43]"><RefreshCcw className="size-4" /> Refresh</button>
        </div>

        {loadingDocuments && (
          <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-[28px] border border-[#dbe3d8] bg-[#fffef9]" role="status">
            <div className="flex items-center gap-3 text-xs font-bold text-[#68746c]">
              <LoaderCircle className="size-4 animate-spin text-[#176b43]" />
              Loading your private textbooks…
            </div>
          </div>
        )}

        {!loadingDocuments && documents.length === 0 && (
          <div className="mt-5 rounded-[28px] border border-dashed border-[#cbd8c9] bg-[#fffef9] p-10 text-center">
            <BookOpen className="mx-auto size-8 text-[#176b43]" />
            <h2 className="mt-3 text-xl font-extrabold">Upload your textbook here</h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0f5132] px-5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload PDF
            </button>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <article key={document.id} className="rounded-[24px] border border-[#dbe3d8] bg-[#fffef9] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#e8f2e5] text-[#176b43]"><FileText className="size-5" /></div>
                <button onClick={async () => { if (confirm('Delete this textbook and its private index?')) { await deleteSourceDocument(document); await load() } }} className="flex size-8 items-center justify-center rounded-lg text-[#8b5c57] hover:bg-[#fff0ed]" aria-label="Delete textbook"><Trash2 className="size-4" /></button>
              </div>
              <h2 className="mt-4 line-clamp-2 text-base font-extrabold">{document.file_name}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-extrabold uppercase tracking-[0.08em]">
                <span className={`rounded-full px-2.5 py-1 ${document.status === 'ready' ? 'bg-[#e8f2e5] text-[#176b43]' : document.status === 'failed' ? 'bg-[#fff0ed] text-[#9a3d34]' : 'bg-[#fff5d9] text-[#80631c]'}`}>{document.status}</span>
                {document.total_pages ? <span className="rounded-full bg-[#f1f3ef] px-2.5 py-1 text-[#667269]">{document.total_pages} pages</span> : null}
              </div>
              {document.error_message && <p className="mt-3 text-[10px] font-semibold leading-5 text-[#9a3d34]">{document.error_message}</p>}
              {document.status === 'ready' && <Link to={`/app/textbooks/${document.id}/generate`} className="mt-5 inline-flex rounded-xl bg-[#0f5132] px-4 py-2.5 text-xs font-extrabold text-white">Generate lesson</Link>}
              {document.status === 'failed' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void retryProcessing(document)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#d8c48e] bg-[#fff8e8] px-4 py-2.5 text-xs font-extrabold text-[#76571e] disabled:opacity-50"
                >
                  <RefreshCcw className="size-3.5" />
                  Retry Processing
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </ProductShell>
  )
}
