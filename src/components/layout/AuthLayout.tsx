import {
  ArrowLeft,
  BookOpenText,
  Check,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AuthLayoutProps = {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
}

const benefits = [
  'Save and revisit every lesson plan',
  'Keep your teaching history in one place',
  'Continue editing lessons anytime',
]

function AuthLayout({
  children,
  eyebrow,
  title,
  description,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f8f7f1]">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        {/* =====================================================
            LEFT BRAND PANEL
        ====================================================== */}

        <section className="relative hidden overflow-hidden bg-[#0f5132] p-10 text-white lg:flex lg:flex-col xl:p-14">
          <div
            aria-hidden="true"
            className="absolute -left-24 -top-24 size-80 rounded-full border border-white/10"
          />

          <div
            aria-hidden="true"
            className="absolute bottom-12 right-10 size-48 rounded-full border border-white/10"
          />

          <div
            aria-hidden="true"
            className="absolute right-[8%] top-[20%] size-28 rotate-12 rounded-[28px] bg-white/[0.04]"
          />

          {/* Large ChalkBox brand banner */}

          <Link
            to="/"
            aria-label="Back to ChalkBox home"
            className="relative z-10 flex w-full items-center justify-center rounded-[26px] border border-white/30 bg-[#fffef9] px-8 py-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(0,0,0,0.22)]"
          >
            <img
              src="/branding/logo.png"
              alt="ChalkBox by HarshLabs AI"
              className="h-auto w-full max-w-[390px] object-contain"
            />
          </Link>

          {/* Main content */}

          <div className="relative z-10 my-auto max-w-[560px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-[#d8ebdd]">
              <Sparkles className="size-3.5" />
              {eyebrow}
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] xl:text-5xl">
              {title}
            </h1>

            <p className="mt-5 max-w-[520px] text-[15px] font-medium leading-7 text-[#d0e4d5]">
              {description}
            </p>

            <div className="mt-8 space-y-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 text-sm font-semibold text-[#edf6ef]"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="size-3.5" />
                  </div>

                  {benefit}
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.11]">
                <BookOpenText className="size-5 text-[#acd1b6]" />

                <p className="mt-3 text-xs font-bold">
                  Lesson History
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.11]">
                <GraduationCap className="size-5 text-[#acd1b6]" />

                <p className="mt-3 text-xs font-bold">
                  Teacher First
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.11]">
                <ShieldCheck className="size-5 text-[#acd1b6]" />

                <p className="mt-3 text-xs font-bold">
                  Privacy First
                </p>
              </div>
            </div>
          </div>

          {/* Large tagline banner */}

          <div className="relative z-10 w-full rounded-2xl border border-white/25 bg-[#fffef9] px-5 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.14)]">
            <p className="text-center text-[15px] font-extrabold tracking-[-0.01em] text-[#17211b]">
              Your classroom. Your plan.
              <span className="ml-1 text-[#176b43]">
                Powered by HarshLabs AI.
              </span>
            </p>
          </div>
        </section>

        {/* =====================================================
            RIGHT AUTH AREA
        ====================================================== */}

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 size-72 rounded-full bg-[#e4eee1]/70 blur-3xl"
          />

          <div className="relative w-full max-w-[480px]">
            {/* Mobile branding */}

            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link to="/">
                <img
                  src="/branding/logo.png"
                  alt="ChalkBox"
                  className="w-[155px]"
                />
              </Link>

              <Link
                to="/"
                className="flex size-10 items-center justify-center rounded-xl border border-[#d6e0d3] bg-[#fffef9] text-[#0f5132]"
                aria-label="Back to home"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthLayout