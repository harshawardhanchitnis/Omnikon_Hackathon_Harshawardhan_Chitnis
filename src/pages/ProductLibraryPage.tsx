import { BookOpen, RefreshCcw, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import ProductShell from '@/components/product/ProductShell'
import {
  cleanupLegacyDemoTopicImports,
  deleteCloudPlan,
  listCloudPlans,
  type CloudPlan,
} from '@/lib/productCloud'

export default function ProductLibraryPage() {
  const [plans, setPlans] = useState<CloudPlan[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      await cleanupLegacyDemoTopicImports()
      setPlans(await listCloudPlans())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your lessons.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return plans
    return plans.filter((plan) =>
      `${plan.title} ${plan.subject} ${plan.class_level ?? ''} ${plan.source_mode}`.toLowerCase().includes(needle),
    )
  }, [plans, query])

  return (
    <ProductShell>
      <section className="mx-auto w-full max-w-[1260px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">Your account</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em]">Lesson Library</h1>
            <p className="mt-2 text-sm font-medium text-[#68746c]">Topic plans and lessons generated from your private PDFs are stored here.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cfdbcc] bg-white px-4 text-xs font-extrabold text-[#176b43]">
            <RefreshCcw className="size-4" /> Refresh
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#89948d]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your cloud lessons..." className="h-12 w-full rounded-2xl border border-[#d7e0d5] bg-[#fffef9] pl-11 pr-4 text-sm outline-none focus:border-[#69a37a]" />
        </div>

        {error && <div className="mt-5 rounded-xl border border-[#e7b5ae] bg-[#fff3f0] px-4 py-3 text-xs font-semibold text-[#8c3027]">{error}</div>}
        {loading && <p className="mt-8 text-sm font-bold text-[#68746c]">Loading your library...</p>}

        {!loading && filtered.length === 0 && (
          <div className="mt-8 rounded-[26px] border border-dashed border-[#cbd8c9] bg-[#fffef9] p-8 text-center">
            <BookOpen className="mx-auto size-7 text-[#176b43]" />
            <h2 className="mt-3 text-lg font-extrabold">No matching cloud lessons yet.</h2>
            <p className="mt-2 text-xs font-medium text-[#718078]">Generate a Topic lesson or create one from My Textbooks.</p>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan) => (
            <article key={plan.id} className="rounded-[24px] border border-[#dbe3d8] bg-[#fffef9] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-[#edf5e9] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#176b43]">
                  {plan.source_mode === 'private_textbook' ? 'My Textbook' : 'Topic Mode'}
                </span>
                <button onClick={async () => { await deleteCloudPlan(plan.id); await load() }} className="flex size-8 items-center justify-center rounded-lg text-[#8b5c57] hover:bg-[#fff0ed]" aria-label="Delete lesson"><Trash2 className="size-4" /></button>
              </div>
              <h2 className="mt-4 text-lg font-extrabold leading-6">{plan.title}</h2>
              <p className="mt-2 text-[11px] font-semibold text-[#718078]">{plan.class_level ? `Class ${plan.class_level} · ` : ''}{plan.subject}{plan.duration_minutes ? ` · ${plan.duration_minutes} min` : ''}</p>
              <Link to={`/app/lesson/${plan.id}`} className="mt-5 inline-flex rounded-xl bg-[#0f5132] px-4 py-2.5 text-xs font-extrabold text-white">Open lesson</Link>
            </article>
          ))}
        </div>
      </section>
    </ProductShell>
  )
}
