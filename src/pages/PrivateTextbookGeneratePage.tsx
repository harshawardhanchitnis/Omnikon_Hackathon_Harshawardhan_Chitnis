import { ArrowLeft, BookOpen, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import ProductShell from '@/components/product/ProductShell'
import {
  callProductFunction,
  getSourceDocument,
  type SourceDocument,
} from '@/lib/productCloud'

type GenerationResponse = { ok: true; planId: string } | { ok: false; message: string }

export default function PrivateTextbookGeneratePage() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()
  const [document, setDocument] = useState<SourceDocument | null>(null)
  const [teacherRequest, setTeacherRequest] = useState('')
  const [classLevel, setClassLevel] = useState(8)
  const [durationMinutes, setDurationMinutes] = useState(40)
  const [resourceLevel, setResourceLevel] = useState('low')
  const [language, setLanguage] = useState('english')
  const [pageStart, setPageStart] = useState('')
  const [pageEnd, setPageEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSourceDocument(documentId).then(setDocument).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load textbook.'))
  }, [documentId])

  async function generate(event: React.FormEvent) {
    event.preventDefault()
    if (teacherRequest.trim().length < 12) {
      setError('Tell ChalkBox what you want to teach from this PDF (at least 12 characters).')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await callProductFunction<GenerationResponse>('generate-private-textbook-lesson', {
        documentId,
        teacherRequest: teacherRequest.trim(),
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
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">Generate from private source</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">{document?.file_name ?? 'Your textbook'}</h1>
              <p className="mt-2 text-xs font-medium leading-5 text-[#68746c]">ChalkBox retrieves only from this document, generates the lesson, runs an independent audit and stores the resulting lesson in your account.</p>
            </div>
          </div>

          <form onSubmit={generate} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-extrabold">What do you want to teach?</label>
              <textarea value={teacherRequest} onChange={(event) => setTeacherRequest(event.target.value)} rows={5} placeholder="Example: Teach the causes and effects of friction from this textbook, with a board explanation and one low-resource classroom activity." className="w-full rounded-2xl border border-[#d6dfd4] bg-white p-4 text-sm leading-6 outline-none focus:border-[#69a37a]" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-extrabold">Class
                <select value={classLevel} onChange={(event) => setClassLevel(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value={8}>Class 8</option><option value={9}>Class 9</option><option value={10}>Class 10</option></select>
              </label>
              <label className="text-xs font-extrabold">Duration
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value={30}>30 minutes</option><option value={40}>40 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select>
              </label>
              <label className="text-xs font-extrabold">Resources
                <select value={resourceLevel} onChange={(event) => setResourceLevel(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value="low">Low-resource</option><option value="standard">Standard</option><option value="well">Well-equipped</option></select>
              </label>
              <label className="text-xs font-extrabold">Language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm"><option value="english">English</option><option value="hindi">English + Hindi support</option></select>
              </label>
            </div>

            <div>
              <p className="text-xs font-extrabold">Optional page range</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <input type="number" min={1} value={pageStart} onChange={(event) => setPageStart(event.target.value)} placeholder="Start page" className="h-11 rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm" />
                <input type="number" min={1} value={pageEnd} onChange={(event) => setPageEnd(event.target.value)} placeholder="End page" className="h-11 rounded-xl border border-[#d6dfd4] bg-white px-3 text-sm" />
              </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-[#cfe0cc] bg-[#edf5e9] px-4 py-3 text-[11px] font-semibold leading-5 text-[#52665a]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#176b43]" />Source citations are constrained to pages retrieved from your uploaded document. The generator is not allowed to invent textbook provenance.</div>
            {error && <div className="rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold text-[#8c3027]">{error}</div>}
            <button disabled={loading || document?.status !== 'ready'} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f5132] text-sm font-extrabold text-white disabled:opacity-55">{loading && <LoaderCircle className="size-4 animate-spin" />}{loading ? 'Generating & auditing...' : 'Generate source-grounded lesson'}</button>
          </form>
        </div>
      </section>
    </ProductShell>
  )
}
