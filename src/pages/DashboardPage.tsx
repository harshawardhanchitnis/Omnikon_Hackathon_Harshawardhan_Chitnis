import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  BookOpenText,
  Check,
  Clock3,
  History,
  LibraryBig,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  activateLibraryItem,
  getRecentLibraryItems,
  type LessonLibraryItem,
} from '@/lib/lessonLibrary'

function formatRecent(value: string | null) {
  if (!value) {
    return 'Ready'
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return 'Recent'
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60000),
  )

  if (diffMinutes < 2) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days}d ago`
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp))
}

function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const isDemoMode = searchParams.get('demo') === '1'

  const recentItems = useMemo(
    () => getRecentLibraryItems(5),
    [],
  )
  function openItem(item: LessonLibraryItem) {
    activateLibraryItem(item)
    navigate(item.href)
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const value = query.trim()
    navigate(
      value
        ? `/library?q=${encodeURIComponent(value)}`
        : '/library',
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f7f1] text-[#17211b]">
      <header className="sticky top-0 z-50 border-b border-[#dfe5dc] bg-[#fffef9]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1560px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
          <Link
            to="/"
            className="shrink-0 rounded-xl transition-transform hover:scale-[1.01]"
          >
            <img
              src="/branding/logo.png"
              alt="ChalkBox"
              className="w-[138px] sm:w-[155px]"
            />
          </Link>

          <form
            onSubmit={submitSearch}
            className="ml-auto hidden w-full max-w-[360px] md:block"
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a958d]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your lesson library..."
                className="h-10 w-full rounded-xl border border-[#dde4da] bg-[#f8f9f5] pl-10 pr-4 text-xs font-medium outline-none transition-all placeholder:text-[#9aa49d] focus:border-[#8fba9d] focus:bg-white focus:ring-4 focus:ring-[#e3efe5]"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link
              to="/library"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#d5dfd2] bg-white px-3 text-[10px] font-extrabold text-[#176b43] hover:bg-[#edf4ea] sm:px-4"
            >
              <LibraryBig className="mr-1.5 size-3.5" />
              <span className="hidden sm:inline">Library</span>
            </Link>
            <Link
              to="/topic"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#0f5132] px-3 text-[10px] font-extrabold text-white hover:bg-[#0b3d28] sm:px-4"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              New plan
            </Link>
          </div>
        </div>
      </header>

      {isDemoMode && (
        <section className="border-b border-[#bcd2be] bg-[#eaf3e7]">
          <div className="mx-auto flex w-full max-w-[1560px] items-start gap-3 px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#0f5132] text-white">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#176b43]">
                WELCOME TO THE DEMO MODE
              </p>
              <p className="mt-1 max-w-3xl text-[11px] font-medium leading-5 text-[#526158] sm:text-xs">
                Explore the available verified Textbook lessons or try live Topic Mode. No sign-in is required for this demo.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto w-full max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8 xl:px-10 lg:py-9">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cddccc] bg-[#eef5eb] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#176b43]">
            <Sparkles className="size-3" />
            Teacher Workspace
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl lg:text-[44px]">
            Plan. Teach. Reuse.
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#68736c]">
            Start a new lesson or reopen a plan you already trust. No student accounts or personal data required.
          </p>
        </div>

        <form onSubmit={submitSearch} className="mt-5 md:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a958d]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lessons..."
              className="h-11 w-full rounded-xl border border-[#dde4da] bg-[#fffef9] pl-10 pr-4 text-xs font-medium outline-none focus:border-[#8fba9d] focus:ring-4 focus:ring-[#e3efe5]"
            />
          </label>
        </form>

        <section className="mt-7 grid gap-4 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-[28px] border border-[#bcd2be] bg-[#eaf3e7] p-6 shadow-[0_10px_30px_rgba(22,55,38,0.06)] sm:p-7 lg:p-8">
            <div className="absolute -right-10 -top-12 size-40 rounded-full border border-[#c4d9c3]" />
            <div className="relative">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0f5132] text-white shadow-[0_10px_24px_rgba(15,81,50,0.18)]">
                <BookOpen className="size-5" />
              </div>
              <p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
                Textbook Mode
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                Teach from verified NCERT context
              </h2>
              <p className="mt-3 max-w-xl text-[12px] font-medium leading-6 text-[#566259]">
                For the demo, choose one of the available Class 8, 9, or 10 Science lessons and open a source-grounded plan with verified textbook context.
              </p>
              <Link
                to="/textbook"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#0f5132] px-5 text-xs font-extrabold text-white hover:bg-[#0b3d28]"
              >
                Start from Textbook
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[28px] border border-[#d8dfd5] bg-[#fffef9] p-6 shadow-[0_10px_30px_rgba(22,55,38,0.05)] sm:p-7 lg:p-8">
            <div className="absolute -right-10 -top-12 size-40 rounded-full border border-[#e1e6dc]" />
            <div className="relative">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#176b43] text-white shadow-[0_10px_24px_rgba(15,81,50,0.14)]">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
                Topic Mode
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                Build help for an unseen Science topic
              </h2>
              <p className="mt-3 max-w-xl text-[12px] font-medium leading-6 text-[#566259]">
                Ask for a complete lesson or focused teaching help. ChalkBox generates live, checks the Science, and adapts to your time and resources.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Live AI', 'Science checked', 'Resource aware'].map((item) => (
                  <span key={item} className="rounded-full bg-[#f0f5ed] px-3 py-1.5 text-[9px] font-bold text-[#48604e]">
                    {item}
                  </span>
                ))}
              </div>
              <Link
                to="/topic"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[#bfcfbd] bg-white px-5 text-xs font-extrabold text-[#0f5132] hover:bg-[#edf4ea]"
              >
                Start with a Topic
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_330px]">
          <article className="rounded-[26px] border border-[#dce4da] bg-[#fffef9] p-5 shadow-[0_7px_24px_rgba(22,55,38,0.04)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[#176b43]">
                  <History className="size-4" />
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
                    Recent work
                  </p>
                </div>
                <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em]">
                  Pick up where you left off
                </h2>
              </div>
              <Link
                to="/library"
                className="inline-flex h-9 items-center rounded-xl border border-[#d1dcd0] bg-white px-3.5 text-[10px] font-extrabold text-[#176b43] hover:bg-[#edf4ea]"
              >
                View Library
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </div>

            {recentItems.length > 0 ? (
              <div className="mt-5 divide-y divide-[#e6ebe3]">
                {recentItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className="group flex w-full items-center gap-3 py-3.5 text-left"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ea] text-[#176b43] transition-colors group-hover:bg-[#dfeedd]">
                      {item.mode === 'topic' ? (
                        <Sparkles className="size-4" />
                      ) : (
                        <BookOpenText className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-extrabold text-[#263229] sm:text-xs">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-[9px] font-medium text-[#7d887f]">
                        {item.meta} · {item.mode === 'topic' ? 'AI-generated' : 'Textbook verified'}
                      </p>
                    </div>
                    <span className="shrink-0 text-[8px] font-semibold text-[#929b95] sm:text-[9px]">
                      {formatRecent(item.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#ccd9ca] bg-[#f8faf6] px-4 py-8 text-center">
                <Clock3 className="mx-auto size-5 text-[#8aa092]" />
                <p className="mt-3 text-xs font-extrabold">No recent lesson activity yet</p>
                <p className="mt-1 text-[10px] font-medium text-[#748078]">
                  Open a textbook lesson or generate a Topic Mode plan and it will appear here.
                </p>
              </div>
            )}
          </article>

          <aside className="rounded-[26px] border border-[#cbdccb] bg-[#eef5eb] p-5 sm:p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#dcebdd] text-[#176b43]">
              <Check className="size-4" />
            </div>
            <p className="mt-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
              Demo-ready core
            </p>
            <h2 className="mt-2 text-lg font-extrabold leading-6">
              Two planning engines. One teaching workspace.
            </h2>
            <p className="mt-3 text-[11px] font-medium leading-6 text-[#5d6961]">
              Textbook Mode proves trustworthy curriculum grounding. Topic Mode proves live AI flexibility. Both lead into the same classroom teaching experience.
            </p>
            <Link
              to="/library"
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#0f5132] px-4 text-[10px] font-extrabold text-white hover:bg-[#0b3d28]"
            >
              <BookOpenCheck className="mr-2 size-4" />
              Browse all lessons
            </Link>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default DashboardPage