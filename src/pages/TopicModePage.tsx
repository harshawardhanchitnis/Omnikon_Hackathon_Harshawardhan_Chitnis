import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Beaker,
  Check,
  Clock3,
  GraduationCap,
  History,
  Languages,
  Leaf,
  LoaderCircle,
  MessageSquareText,
  Microscope,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import {
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import ProductShell from '@/components/product/ProductShell'
import { useProductSession } from '@/hooks/useProductSession'
import { Button } from '@/components/ui/button'
import { upsertCloudPlan } from '@/lib/productCloud'
import {
  activateTopicLessonBundle,
  clearTopicDraft,
  clearTopicLessonHistory,
  deleteTopicLessonFromHistory,
  generateTopicLesson,
  loadTopicDraft,
  loadTopicLessonHistory,
  preflightTopicRequest,
  saveTopicLessonBundle,
  type TopicRequestMode,
} from '@/lib/topicMode'
import type {
  LessonLanguage,
} from '@/lib/lessonExperience'
import type {
  ResourceLevel,
} from '@/lib/lessonPresentation'

const classOptions = [
  8,
  9,
  10,
] as const

const examples = [
  'Explain why objects float and sink with a simple classroom activity.',
  'Build a complete lesson on heredity and Mendel’s laws.',
  'My students confuse speed and velocity. Help me teach the difference.',
  'How can I demonstrate atmospheric pressure without special equipment?',
]

const completeDurations = [
  30,
  40,
  45,
  60,
]

const focusedDurations = [
  20,
  30,
  40,
]

function TopicModeFrame({
  productMode,
  children,
}: {
  productMode: boolean
  children: ReactNode
}) {
  if (productMode) {
    return <ProductShell>{children}</ProductShell>
  }

  return <main className="min-h-screen bg-[#f7f7f1] text-[#17211b]">{children}</main>
}

function TopicModePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const productMode = searchParams.get('product') === '1'
  const { session, loading: sessionLoading } = useProductSession()
  const draft = useMemo(
    () => productMode ? null : loadTopicDraft(),
    [productMode],
  )

  const [
    history,
    setHistory,
  ] = useState(
    () => productMode ? [] : loadTopicLessonHistory(),
  )

  const [
    classLevel,
    setClassLevel,
  ] = useState<8 | 9 | 10>(
    draft?.classLevel ?? 8,
  )

  const [
    requestMode,
    setRequestMode,
  ] =
    useState<TopicRequestMode>(
      draft?.requestMode ?? 'complete',
    )

  const [
    teacherRequest,
    setTeacherRequest,
  ] = useState(
    draft?.teacherRequest ?? '',
  )

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(
    draft?.durationMinutes ?? 40,
  )

  const [
    resourceLevel,
    setResourceLevel,
  ] =
    useState<ResourceLevel>(
      draft?.resourceLevel === 'well' ? 'well' : 'low',
    )

  const [
    language,
    setLanguage,
  ] =
    useState<LessonLanguage>(
      draft?.language ?? 'english',
    )

  const [
    classroomContext,
    setClassroomContext,
  ] = useState(
    draft?.classroomContext ?? '',
  )

  const [
    generating,
    setGenerating,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const generationAbortRef =
    useRef<AbortController | null>(null)

  const durations = useMemo(
    () =>
      requestMode ===
      'complete'
        ? completeDurations
        : focusedDurations,
    [requestMode],
  )

  function changeMode(
    next: TopicRequestMode,
  ) {
    setRequestMode(next)

    if (
      next === 'focused' &&
      durationMinutes > 40
    ) {
      setDurationMinutes(20)
    }

    if (
      next === 'complete' &&
      durationMinutes < 30
    ) {
      setDurationMinutes(40)
    }
  }

  async function generate() {
    const request =
      teacherRequest.trim()

    if (request.length < 12) {
      setError(
        'Tell ChalkBox a little more about what you want to teach (at least 12 characters).',
      )
      return
    }

    const preflight = preflightTopicRequest(request)
    if (!preflight.ok) {
      setError(preflight.message)
      return
    }

    const controller = new AbortController()
    generationAbortRef.current = controller
    setGenerating(true)
    setError(null)

    try {
      const bundle =
        await generateTopicLesson({
          classLevel,
          subject: 'Science',
          requestMode,
          teacherRequest:
            request,
          durationMinutes,
          resourceLevel,
          language,
          classroomContext:
            classroomContext
              .trim(),
        }, productMode
          ? 'product'
          : 'demo', controller.signal)

      if (productMode) {
        const rows = await upsertCloudPlan({
          sourceMode: 'topic',
          sourceId: bundle.generationId,
          title: typeof bundle.lesson.title === 'string' ? bundle.lesson.title : request,
          classLevel: bundle.request.classLevel,
          subject: bundle.request.subject,
          durationMinutes: bundle.request.durationMinutes,
          language: bundle.request.language,
          resourceLevel: bundle.request.resourceLevel,
          payload: {
            ...(bundle as unknown as Record<string, unknown>),
            productOrigin: 'authenticated_topic',
          },
        })
        const plan = rows[0]
        if (!plan) throw new Error('ChalkBox generated the lesson but could not save it to your account.')
        navigate(`/app/lesson/${plan.id}`)
      } else {
        saveTopicLessonBundle(bundle)
        clearTopicDraft()
        setHistory(loadTopicLessonHistory())
        navigate('/topic/lesson')
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Topic Mode could not generate this lesson.',
      )
    } finally {
      if (generationAbortRef.current === controller) {
        generationAbortRef.current = null
      }
      setGenerating(false)
    }
  }

  function openHistoryItem(
    generationId: string,
  ) {
    const bundle = history.find(
      (item) =>
        item.generationId ===
        generationId,
    )

    if (!bundle) {
      return
    }

    activateTopicLessonBundle(bundle)
    navigate('/topic/lesson')
  }

  function removeHistoryItem(
    generationId: string,
  ) {
    deleteTopicLessonFromHistory(
      generationId,
    )
    setHistory(
      loadTopicLessonHistory(),
    )
  }

  function clearHistory() {
    clearTopicLessonHistory()
    setHistory([])
  }

  if (productMode && sessionLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f1] text-[#365044]">
        <p className="text-sm font-bold">Opening your ChalkBox workspace...</p>
      </main>
    )
  }

  if (productMode && !session) {
    return <Navigate to="/login" replace state={{ from: '/topic?product=1' }} />
  }

  return (
    <TopicModeFrame productMode={productMode}>
      {!productMode && <header className="sticky top-0 z-50 border-b border-[#dde4da] bg-[#fffef9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-[1560px] items-center gap-4 px-5 sm:px-8 lg:px-10 xl:px-12">
          <Link
            to={productMode ? "/app" : "/"}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#d7e1d4] bg-white text-[#455148] transition-all hover:-translate-x-0.5 hover:bg-[#edf4ea] hover:text-[#0f5132]"
            aria-label="Back to ChalkBox"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <Link
            to={productMode ? "/app" : "/"}
            className="shrink-0"
          >
            <img
              src="/branding/logo.png"
              alt="ChalkBox"
              className="w-[145px] sm:w-[158px]"
            />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-[#edf5e9] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#176b43] sm:inline-flex">
              Class 8–10 Science
            </span>
          </div>
        </div>
      </header>}

      <section className="relative overflow-hidden bg-[#0f5132] text-white">
        <div className="absolute -left-20 -top-32 size-80 rounded-full border border-white/10" />
        <div className="absolute -right-16 top-0 size-72 rounded-full bg-white/[0.035]" />

        <div className="relative mx-auto w-full max-w-[1560px] px-5 py-9 sm:px-8 lg:px-10 lg:py-11 xl:px-12">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-[850px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.09] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#d6eadb]">
                <Sparkles className="size-3.5" />
                Topic Mode
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl lg:text-[42px]">
                Tell ChalkBox what you need help teaching.
              </h1>

              <p className="mt-3 max-w-[760px] text-[13px] font-medium leading-7 text-[#cce0d1] sm:text-[14px]">
                Ask for a complete lesson or focused teaching help on any
                Class 8–10 Science topic. Topic Mode uses live AI, checks the
                result independently, and never pretends it came from a
                textbook source.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.09] px-5 py-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                <Microscope className="size-[18px] text-[#b9d9c1]" />
              </div>

              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#a9cab2]">
                  Generation path
                </p>
                <p className="mt-1 text-[12px] font-extrabold text-white">
                  Live AI · Science checked
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1360px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-[28px] border border-[#dbe3d8] bg-[#fffef9] p-6 shadow-[0_8px_28px_rgba(22,55,38,0.045)] sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e6f1e3] text-[#176b43]">
              <Target className="size-5" />
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                What do you need?
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.025em]">
                Choose the kind of teaching support.
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                changeMode(
                  'complete',
                )
              }
              className={`rounded-2xl border p-5 text-left transition-all ${
                requestMode ===
                'complete'
                  ? 'border-[#71a882] bg-[#edf5e9] shadow-[0_8px_22px_rgba(22,82,48,0.07)]'
                  : 'border-[#dce3da] bg-white hover:border-[#bfd0bd] hover:bg-[#f8faf6]'
              }`}
            >
              <div className="flex items-center justify-between">
                <GraduationCap className="size-5 text-[#176b43]" />
                {requestMode ===
                  'complete' && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#176b43] text-white">
                    <Check className="size-3" />
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-[15px] font-extrabold">
                Complete lesson
              </h3>
              <p className="mt-2 text-[11px] font-medium leading-5 text-[#657168]">
                Build the full classroom flow: hook, explanation, board plan,
                example, activity, practice and exit check.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                changeMode(
                  'focused',
                )
              }
              className={`rounded-2xl border p-5 text-left transition-all ${
                requestMode ===
                'focused'
                  ? 'border-[#71a882] bg-[#edf5e9] shadow-[0_8px_22px_rgba(22,82,48,0.07)]'
                  : 'border-[#dce3da] bg-white hover:border-[#bfd0bd] hover:bg-[#f8faf6]'
              }`}
            >
              <div className="flex items-center justify-between">
                <MessageSquareText className="size-5 text-[#176b43]" />
                {requestMode ===
                  'focused' && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#176b43] text-white">
                    <Check className="size-3" />
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-[15px] font-extrabold">
                Focused teaching help
              </h3>
              <p className="mt-2 text-[11px] font-medium leading-5 text-[#657168]">
                Solve one teaching problem deeply with a compact explanation,
                board plan, visual, misconception check and reteaching moves — not a full lesson.
              </p>
            </button>
          </div>

          <div className="mt-8">
            <label
              htmlFor="topic-request"
              className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#536159]"
            >
              What would you like help teaching?
            </label>

            <textarea
              id="topic-request"
              value={teacherRequest}
              onChange={(event) =>
                setTeacherRequest(
                  event.target.value,
                )
              }
              maxLength={1200}
              rows={6}
              placeholder='e.g. "My students confuse mass and weight. Help me explain the difference with a simple activity."'
              className="mt-3 w-full resize-y rounded-2xl border border-[#d6dfd3] bg-white px-4 py-4 text-[13px] font-medium leading-6 outline-none transition focus:border-[#6ca07b] focus:ring-4 focus:ring-[#e8f1e5]"
            />

            <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-semibold text-[#89948c]">
              <span>
                Do not include student names or personal information.
              </span>
              <span>
                {teacherRequest.length}/1200
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {examples.map(
              (example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() =>
                    setTeacherRequest(
                      example,
                    )
                  }
                  className="rounded-full border border-[#d9e2d6] bg-[#f7faf5] px-3 py-2 text-left text-[9px] font-bold leading-4 text-[#536159] transition hover:border-[#aac6ae] hover:bg-[#edf5e9]"
                >
                  {example}
                </button>
              ),
            )}
          </div>

          <div className="mt-8 grid gap-5 border-t border-[#e3e8e1] pt-7 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#536159]">
                Class
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {classOptions.map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setClassLevel(
                          option,
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-[11px] font-extrabold ${
                        classLevel ===
                        option
                          ? 'border-[#176b43] bg-[#edf5e9] text-[#176b43]'
                          : 'border-[#dce3da] bg-white text-[#657168]'
                      }`}
                    >
                      Class {option}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#536159]">
                Subject
              </p>
              <div className="mt-3 flex h-[43px] items-center gap-2 rounded-xl border border-[#71a882] bg-[#edf5e9] px-4 text-[11px] font-extrabold text-[#176b43]">
                <Beaker className="size-4" />
                Science
              </div>
            </div>

            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#536159]">
                <Clock3 className="size-3.5" />
                Available time
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {durations.map(
                  (minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() =>
                        setDurationMinutes(
                          minutes,
                        )
                      }
                      className={`rounded-xl border px-3.5 py-2.5 text-[10px] font-extrabold ${
                        durationMinutes ===
                        minutes
                          ? 'border-[#176b43] bg-[#edf5e9] text-[#176b43]'
                          : 'border-[#dce3da] bg-white text-[#657168]'
                      }`}
                    >
                      {minutes} min
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#536159]">
                <Leaf className="size-3.5" />
                Classroom resources
              </p>
              <select
                value={resourceLevel}
                onChange={(event) =>
                  setResourceLevel(
                    event.target
                      .value as ResourceLevel,
                  )
                }
                className="mt-3 h-[43px] w-full rounded-xl border border-[#d6dfd3] bg-white px-3 text-[11px] font-bold outline-none focus:border-[#6ca07b]"
              >
                <option value="low">
                  Low-resource classroom
                </option>
                <option value="well">
                  Well-equipped classroom
                </option>
              </select>
            </div>

            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#536159]">
                <Languages className="size-3.5" />
                Teaching language
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    ['english', 'English'],
                    ['hindi', 'हिंदी'],
                  ] as const
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setLanguage(
                          value,
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-[10px] font-extrabold ${
                        language ===
                        value
                          ? 'border-[#176b43] bg-[#edf5e9] text-[#176b43]'
                          : 'border-[#dce3da] bg-white text-[#657168]'
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="classroom-context"
                className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#536159]"
              >
                Optional classroom context
              </label>
              <input
                id="classroom-context"
                value={classroomContext}
                onChange={(event) =>
                  setClassroomContext(
                    event.target.value,
                  )
                }
                maxLength={400}
                placeholder="e.g. 42 learners, mixed ability, no lab"
                className="mt-3 h-[43px] w-full rounded-xl border border-[#d6dfd3] bg-white px-3 text-[11px] font-semibold outline-none focus:border-[#6ca07b]"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 whitespace-pre-line rounded-2xl border border-[#e7cfc8] bg-[#fff7f4] p-4 text-[11px] font-semibold leading-6 text-[#8b554b]">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-1 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 border-t border-[#e3e8e1] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[650px] rounded-xl border border-[#d5bd65] bg-[#fff5cf] px-4 py-3 text-[#5d4a0b]">
              <p className="text-[10px] font-extrabold uppercase leading-5 tracking-[0.04em]">
                TOPIC MODE USES LIVE AI FOR LESSON / TOPIC GENERATION. HIGH-QUALITY CONTENT USUALLY TAKES 2–3 MINUTES; COMPLEX REQUESTS MAY TAKE LONGER.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {generating && (
                <button
                  type="button"
                  onClick={() => generationAbortRef.current?.abort()}
                  className="h-11 rounded-xl border border-[#c9d5c7] bg-white px-4 text-[10px] font-extrabold text-[#6a4d43] hover:bg-[#fff7f4]"
                >
                  Cancel
                </button>
              )}
              <Button
              type="button"
              onClick={generate}
              disabled={generating}
              className="h-11 shrink-0 rounded-xl bg-[#0f5132] px-5 text-[11px] font-extrabold text-white hover:bg-[#0b3d28] disabled:opacity-60"
            >
              {generating ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  {requestMode === 'focused' ? 'Building focused help…' : 'Building complete lesson…'}
                </>
              ) : (
                <>
                  {requestMode === 'focused' ? 'Generate focused help' : 'Generate complete lesson'}
                  <ArrowRight className="ml-2 size-3.5" />
                </>
              )}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          {!productMode && history.length > 0 && (
            <div className="rounded-[24px] border border-[#d7e1d4] bg-[#fffef9] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-[#176b43]" />
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
                    Recent topic plans
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[8px] font-extrabold text-[#8a5c52] hover:underline"
                >
                  Clear
                </button>
              </div>

              <p className="mt-2 text-[9px] font-semibold leading-5 text-[#7b867e]">
                Reopen a generated plan without spending another AI call.
              </p>

              <div className="mt-4 space-y-2">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.generationId}
                    className="rounded-xl border border-[#e0e7de] bg-[#f8faf6] p-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openHistoryItem(
                          item.generationId,
                        )
                      }
                      className="w-full text-left"
                    >
                      <p className="line-clamp-2 text-[10px] font-extrabold leading-5 text-[#334138]">
                        {item.request.teacherRequest}
                      </p>
                      <p className="mt-1 text-[8px] font-bold text-[#78847b]">
                        Class {item.request.classLevel} · {item.request.durationMinutes} min · {item.request.requestMode === 'focused' ? 'Focused' : 'Complete'}
                      </p>
                    </button>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[8px] font-semibold text-[#98a199]">
                        {new Date(item.generatedAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          removeHistoryItem(
                            item.generationId,
                          )
                        }
                        className="flex size-7 items-center justify-center rounded-lg text-[#9a6b62] hover:bg-[#fff0ec]"
                        aria-label="Remove recent topic plan"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[24px] border border-[#d7e1d4] bg-[#edf5e9] p-5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
              What Topic Mode guarantees
            </p>

            <div className="mt-4 space-y-3">
              {[
                'Unseen Class 8–10 Science requests are allowed.',
                'No textbook RAG or fake page citations.',
                'Exact minute allocation is deterministic.',
                'Activities adapt to available resources.',
                'A separate AI pass checks science, age level, fit, feasibility and safety.',
              ].map(
                (item) => (
                  <div
                    key={item}
                    className="flex gap-2 text-[10px] font-semibold leading-5 text-[#526057]"
                  >
                    <span className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#176b43] text-white">
                      <Check className="size-2.5" />
                    </span>
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e4dcc9] bg-[#fffaf0] p-5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#946c31]">
              Source transparency
            </p>
            <p className="mt-3 text-[10px] font-semibold leading-5 text-[#6f6657]">
              Topic Mode creates general curriculum support from the teacher’s
              request. It must not display “Source verified”, textbook pages or
              textbook provenance unless a verified source is explicitly added in
              a future version.
            </p>
          </div>
        </aside>
      </div>
    </TopicModeFrame>
  )
}

export default TopicModePage
