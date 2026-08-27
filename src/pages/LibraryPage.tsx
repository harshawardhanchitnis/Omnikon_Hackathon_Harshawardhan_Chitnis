import {
  ArrowLeft,
  BookOpenCheck,
  BookOpenText,
  Clock3,
  Search,
  Sparkles,
  Trash2,
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

import { Button } from '@/components/ui/button'
import {
  deleteTopicLessonFromHistory,
} from '@/lib/topicMode'
import {
  activateLibraryItem,
  getLessonLibraryItems,
  type LessonLibraryItem,
  type LessonLibraryMode,
} from '@/lib/lessonLibrary'

type ModeFilter = 'all' | LessonLibraryMode

type ClassFilter = 'all' | 8 | 9 | 10

function formatDate(value: string | null) {
  if (!value) {
    return 'Ready to open'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently used'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function LessonCard({
  item,
  onOpen,
  onDelete,
}: {
  item: LessonLibraryItem
  onOpen: () => void
  onDelete?: () => void
}) {
  const isTopic = item.mode === 'topic'

  return (
    <article className="flex h-full flex-col rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5 shadow-[0_8px_24px_rgba(22,55,38,0.045)] transition-all hover:-translate-y-1 hover:border-[#bfd3bf] hover:shadow-[0_18px_38px_rgba(22,55,38,0.09)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ea] text-[#176b43]">
          {isTopic ? (
            <Sparkles className="size-4" />
          ) : (
            <BookOpenText className="size-4" />
          )}
        </div>

        <span className="rounded-full border border-[#d2ddd0] bg-[#f5f8f1] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.11em] text-[#176b43]">
          {isTopic ? 'Topic Mode' : 'Textbook Mode'}
        </span>
      </div>

      <h2 className="mt-5 text-lg font-extrabold leading-6 tracking-[-0.02em] text-[#17211b]">
        {item.title}
      </h2>

      <p className="mt-2 text-[11px] font-semibold text-[#68736c]">
        {item.meta}
      </p>

      <div className="mt-4 inline-flex w-fit items-center rounded-full bg-[#eef5eb] px-3 py-1.5 text-[9px] font-bold text-[#176b43]">
        {item.badge}
      </div>

      <div className="mt-auto pt-6">
        <div className="mb-3 flex items-center gap-2 text-[9px] font-semibold text-[#818b84]">
          <Clock3 className="size-3.5" />
          {formatDate(item.updatedAt)}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onOpen}
            className="h-10 flex-1 rounded-xl bg-[#0f5132] text-[10px] font-extrabold text-white hover:bg-[#0b3d28]"
          >
            {isTopic ? 'Reopen Plan' : 'Open Verified Lesson'}
          </Button>

          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onDelete}
              className="size-10 rounded-xl border-[#e0d8d2] bg-white text-[#8b5b4f] hover:bg-[#fbefeb] hover:text-[#8b3e2f]"
              aria-label={`Delete ${item.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function LibraryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [classFilter, setClassFilter] = useState<ClassFilter>('all')
  const [revision, setRevision] = useState(0)

  const items = useMemo(
    () => getLessonLibraryItems(),
    [revision],
  )

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return items.filter((item) => {
      if (
        modeFilter !== 'all' &&
        item.mode !== modeFilter
      ) {
        return false
      }

      if (
        classFilter !== 'all' &&
        item.classLevel !== classFilter
      ) {
        return false
      }

      if (
        normalizedQuery &&
        !item.searchableText.includes(normalizedQuery)
      ) {
        return false
      }

      return true
    })
  }, [items, query, modeFilter, classFilter])

  function openItem(item: LessonLibraryItem) {
    activateLibraryItem(item)
    navigate(item.href)
  }

  function deleteItem(item: LessonLibraryItem) {
    if (!item.topicBundle) {
      return
    }

    deleteTopicLessonFromHistory(
      item.topicBundle.generationId,
    )
    setRevision((current) => current + 1)
  }

  return (
    <main className="min-h-screen bg-[#f7f7f1] text-[#17211b]">
      <header className="sticky top-0 z-40 border-b border-[#dfe5dc] bg-[#fffef9]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1500px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#d7e1d4] bg-white text-[#566159] hover:bg-[#edf4ea] hover:text-[#176b43]"
            aria-label="Back to teacher workspace"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <Link to="/" className="shrink-0">
            <img
              src="/branding/logo.png"
              alt="ChalkBox"
              className="w-[135px] sm:w-[150px]"
            />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/textbook"
              className="hidden rounded-xl border border-[#d5dfd2] bg-white px-3.5 py-2 text-[10px] font-bold text-[#176b43] hover:bg-[#edf4ea] sm:inline-flex"
            >
              Textbook Mode
            </Link>
            <Link
              to="/topic"
              className="rounded-xl bg-[#0f5132] px-3.5 py-2 text-[10px] font-bold text-white hover:bg-[#0b3d28]"
            >
              New Topic Plan
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[#dfe5dc] bg-[#eef5eb]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c9d9c8] bg-white/70 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#176b43]">
                <BookOpenCheck className="size-3.5" />
                Teacher Library
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
                Your lessons, in one place.
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#68736c]">
                Reopen verified textbook lessons and your recent Topic Mode plans without generating them again.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d1dfcf] bg-[#fffef9] px-4 py-3 text-[10px] font-bold text-[#4e5b53] shadow-sm">
              {items.length} lessons available locally
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid gap-3 rounded-[22px] border border-[#dce4da] bg-[#fffef9] p-4 shadow-sm md:grid-cols-[1fr_auto_auto] md:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#879289]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by lesson, topic or class..."
              className="h-11 w-full rounded-xl border border-[#d7e1d4] bg-[#f8f9f5] pl-10 pr-4 text-xs font-semibold outline-none focus:border-[#8fba9d] focus:bg-white focus:ring-4 focus:ring-[#e3efe5]"
            />
          </label>

          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as ModeFilter)}
            className="h-11 rounded-xl border border-[#d7e1d4] bg-white px-3 text-xs font-bold text-[#435047] outline-none focus:border-[#8fba9d]"
          >
            <option value="all">All modes</option>
            <option value="textbook">Textbook Mode</option>
            <option value="topic">Topic Mode</option>
          </select>

          <select
            value={classFilter}
            onChange={(event) => {
              const value = event.target.value
              setClassFilter(
                value === 'all'
                  ? 'all'
                  : (Number(value) as 8 | 9 | 10),
              )
            }}
            className="h-11 rounded-xl border border-[#d7e1d4] bg-white px-3 text-xs font-bold text-[#435047] outline-none focus:border-[#8fba9d]"
          >
            <option value="all">All classes</option>
            <option value="8">Class 8</option>
            <option value="9">Class 9</option>
            <option value="10">Class 10</option>
          </select>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <LessonCard
                key={item.id}
                item={item}
                onOpen={() => openItem(item)}
                onDelete={
                  item.mode === 'topic'
                    ? () => deleteItem(item)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[26px] border border-dashed border-[#cbd8c9] bg-[#fffef9] px-5 py-14 text-center">
            <Search className="mx-auto size-7 text-[#8aa092]" />
            <h2 className="mt-4 text-lg font-extrabold">No matching lessons</h2>
            <p className="mt-2 text-xs font-medium text-[#707c73]">
              Try a different search, class or mode filter.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default LibraryPage
