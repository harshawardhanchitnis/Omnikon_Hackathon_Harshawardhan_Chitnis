import { ArrowLeft, BookOpen, Clock3, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import ProductShell from '@/components/product/ProductShell'
import {
  callProductFunction,
  getSourceDocument,
  type SourceDocument,
} from '@/lib/productCloud'

type GenerationResponse = { ok: true; planId: string } | { ok: false; message: string }
type PrivateResourceLevel = 'low' | 'well'
type PrivateLanguage = 'english' | 'hindi'

export default function PrivateTextbookGeneratePage() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const [document, setDocument] = useState<SourceDocument | null>(null)
  const [classLevel, setClassLevel] = useState(8)
  const [durationMinutes, setDurationMinutes] = useState(40)
  const [resourceLevel, setResourceLevel] = useState<PrivateResourceLevel>('low')
  const [language, setLanguage] = useState<PrivateLanguage>('english')
  const [pageStart, setPageStart] = useState('')
  const [pageEnd, setPageEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pageCount = document?.total_pages ?? null
  const pageRangeError = useMemo(() => {
    const hasStart = pageStart.trim().length > 0
    const hasEnd = pageEnd.trim().length > 0
    if (!hasStart && !hasEnd) return null
    if (hasStart !== hasEnd) {
      return 'Enter both start and end page, or leave both blank for a complete lesson.'
    }

    const start = Number(pageStart)
    const end = Number(pageEnd)
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
      return 'Page numbers must be whole numbers starting from 1.'
    }
    if (start > end) return 'Start page cannot be greater than end page.'
    if (pageCount && (start > pageCount || end > pageCount)) {
      return `This PDF has ${pageCount} pages. Choose pages between 1 and ${pageCount}.`
    }
    return null
  }, [pageCount, pageEnd, pageStart])

  useEffect(() => {
    getSourceDocument(documentId).then(setDocument).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load textbook.'))
  }, [documentId])

  async function generate(event: React.FormEvent) {
    event.preventDefault()
    if (pageRangeError) {
      setError(pageRangeError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await callProductFunction<GenerationResponse>('generate-private-textbook-lesson', {
        documentId,
        // Backward-compatible internal request: the UI is full-lesson-only, but
        // sending this also keeps the frontend compatible with the previously
        // deployed Edge Function until the updated function is redeployed.
        teacherRequest: 'Generate one complete source-grounded classroom lesson from this textbook.',
        classLevel,
        durationMinutes,
        resourceLevel,
        language,
        pageStart: pageStart ? Number(pageStart) : null,
        pageEnd: pageEnd ? Number(pageEnd) : null,
      })
      if (!response.ok) throw new Error(response.message)
      navigate(`/app/lesson/${response.planId}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate this lesson.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProductShell>
      <section className="mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8 lg:px-10">
        <Link to="/app/textbooks" className="inline-flex items-center gap-2 text-xs font-extrabold text-[#176b43]"><ArrowLeft className="size-4" /> My Textbooks</Link>
        <div className="mt-5 rounded-[28px] border border-[#dbe3d8] bg-[#fffef9] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#176b43]"><BookOpen className="size-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">Generate full lesson from private source</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">{document?.file_name ?? 'Your textbook'}</h1>
              <p className="mt-2 text-xs font-medium leading-5 text-[#68746c]">ChalkBox retrieves only from this document, builds a complete source-grounded lesson, runs an independent audit and stores the result in your account.</p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#d5bd65] bg-[#fff5cf] px-4 py-4 text-[#5d4a0b]">
            <Clock3 className="mt-0.5 size-5 shrink-0" />
            <p className="text-xs font-extrabold uppercase leading-5 tracking-[0.04em]">LESSON GENERATION MAY TAKE UP TO 2–3 MINUTES FOR HIGH-QUALITY CONTENT.</p>
          </div>

          <form onSubmit={generate} className="mt-7 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-extrabold">Class
                <select value={classLevel} onChange={(event) => setClassLevel(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value={8}>Class 8</option><option value={9}>Class 9</option><option value={10}>Class 10</option></select>
              </label>
              <label className="text-xs font-extrabold">Duration
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value={30}>30 minutes</option><option value={40}>40 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select>
              </label>
              <label className="text-xs font-extrabold">Resources
                <select value={resourceLevel} onChange={(event) => setResourceLevel(event.target.value as PrivateResourceLevel)} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value="low">Low-resource</option><option value="well">Well-equipped</option></select>
              </label>
              <div>
                <p className="text-xs font-extrabold">Teaching language</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([['english', 'English'], ['hindi', 'हिंदी']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`h-11 rounded-xl border px-3 text-xs font-extrabold transition ${language === value ? 'border-[#176b43] bg-[#edf5e9] text-[#176b43]' : 'border-[#d6dfd4] bg-white text-[#657168] hover:bg-[#f6f9f4]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-extrabold">Optional page range</p>
              <p className="mt-1 text-[10px] font-medium leading-5 text-[#748078]">Leave blank to generate a complete lesson from the retrieved chapter/document context. For a full textbook, select the chapter pages you want taught as one complete lesson.</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label htmlFor="private-page-start" className="sr-only">Start page</label>
                <input id="private-page-start" aria-label="Start page" type="number" min={1} max={pageCount ?? undefined} value={pageStart} onChange={(event) => { setPageStart(event.target.value); setError(null) }} placeholder="Start page" className="h-11 rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm" />
                <label htmlFor="private-page-end" className="sr-only">End page</label>
                <input id="private-page-end" aria-label="End page" type="number" min={1} max={pageCount ?? undefined} value={pageEnd} onChange={(event) => { setPageEnd(event.target.value); setError(null) }} placeholder="End page" className="h-11 rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm" />
              </div>
              {pageRangeError && <p className="mt-2 text-[10px] font-bold text-[#9a3d34]" role="alert">{pageRangeError}</p>}
            </div>

            <div className="flex gap-2 rounded-xl border border-[#cfe0cc] bg-[#edf5e9] px-4 py-3 text-[11px] font-semibold leading-5 text-[#52665a]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#176b43]" />Source citations are constrained to pages retrieved from your uploaded document. The generator is not allowed to invent textbook provenance.</div>
            {error && <div className="rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold text-[#8c3027]">{error}</div>}
            <button disabled={loading || document?.status !== 'ready' || Boolean(pageRangeError)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f5132] text-sm font-extrabold text-white disabled:opacity-55">{loading && <LoaderCircle className="size-4 animate-spin" />}{loading ? 'Generating & auditing full lesson...' : 'Generate full source-grounded lesson'}</button>
          </form>
        </div>
      </section>
    </ProductShell>
  )
}
