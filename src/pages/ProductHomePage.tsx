import {
  ArrowRight,
  Library,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import ProductShell from '@/components/product/ProductShell'
import { useProductSession } from '@/hooks/useProductSession'

export default function ProductHomePage() {
  const { session } = useProductSession()
  const name =
    typeof session?.user.user_metadata?.full_name === 'string'
      ? session.user.user_metadata.full_name
      : 'Teacher'

  return (
    <ProductShell>
      <section className="mx-auto w-full max-w-[1360px] px-5 py-9 sm:px-8 lg:px-10 lg:py-12">
        <div className="rounded-[30px] bg-[#0f5132] px-6 py-8 text-white sm:px-9 sm:py-10">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#bcd8c3]">Authenticated teacher workspace</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-5xl">Welcome, {name}.</h1>
          <p className="mt-3 max-w-[760px] text-sm font-medium leading-7 text-[#d3e3d6]">
            Upload your own textbook, create an unseen source-grounded lesson, or continue with live Topic Mode. Your product library is tied to this account.
          </p>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          <Link to="/app/textbooks" className="group rounded-[26px] border border-[#dbe3d8] bg-[#fffef9] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#176b43]"><Upload className="size-5" /></div>
            <h2 className="mt-5 text-xl font-extrabold">My Textbooks</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-[#68746c]">Upload an unseen PDF, index it privately and generate a grounded lesson from the material you actually teach.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#176b43]">Open textbooks <ArrowRight className="size-4" /></span>
          </Link>

          <Link to="/topic?product=1" className="group rounded-[26px] border border-[#dbe3d8] bg-[#fffef9] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#176b43]"><Sparkles className="size-5" /></div>
            <h2 className="mt-5 text-xl font-extrabold">Live Topic Mode</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-[#68746c]">Ask for an unseen Class 8–10 Science lesson or focused teaching help. Signed-in Topic plans sync into your cloud library.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#176b43]">Start with a topic <ArrowRight className="size-4" /></span>
          </Link>

          <Link to="/app/library" className="group rounded-[26px] border border-[#dbe3d8] bg-[#fffef9] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#176b43]"><Library className="size-5" /></div>
            <h2 className="mt-5 text-xl font-extrabold">Cloud Lesson Library</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-[#68746c]">Reopen lessons from this account instead of depending on one browser's localStorage.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[#176b43]">Browse library <ArrowRight className="size-4" /></span>
          </Link>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#cfe0cc] bg-[#edf5e9] px-5 py-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#176b43]" />
          <p className="text-xs font-semibold leading-6 text-[#4e6256]">Private textbook documents and vectors are owner-scoped through Supabase Row Level Security. Demo lessons remain separate from your account data.</p>
        </div>
      </section>
    </ProductShell>
  )
}
