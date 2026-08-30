import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
  PencilLine,
  Presentation,
  Printer,
  Zap,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'
import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import CustomizePlanPanel from '@/components/lesson/CustomizePlanPanel'
import LanguageSelector from '@/components/lesson/LanguageSelector'
import LessonFlashcards from '@/components/lesson/LessonFlashcards'
import LessonReferenceView from '@/components/lesson/LessonReferenceView'
import PresentMode from '@/components/lesson/PresentMode'
import QuickTeachView from '@/components/lesson/QuickTeachView'
import TeachMode from '@/components/lesson/TeachMode'
import { Button } from '@/components/ui/button'
import { useLessonCustomizations } from '@/hooks/useLessonCustomizations'
import { useLessonTranslation } from '@/hooks/useLessonTranslation'
import {
  getJudgeLessonArtifact,
} from '@/data/judgeLessonCatalog'
import {
  asNumber,
  asRecord,
  asString,
  getFormulaCards,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'
import {
  recordTextbookLessonVisit,
} from '@/lib/lessonLibrary'
import {
  getResourceLabel,
  getResourceLabelHindi,
  normalizeDuration,
  normalizeResourceLevel,
} from '@/lib/lessonPresentation'

type WorkspaceMode =
  | 'full'
  | 'teach'
  | 'quick'
  | 'flashcards'
  | 'customize'

const emptyLesson: JsonRecord = {}

function LessonWorkspacePage() {
  const {
    lessonKey = '',
  } = useParams()

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const artifact =
    getJudgeLessonArtifact(
      lessonKey,
    )
  const originalLesson =
    asRecord(artifact?.lesson) ??
    emptyLesson
  const {
    lesson,
    customizations,
    customized,
    saveSection,
    resetSection,
    resetAll,
  } = useLessonCustomizations(
    lessonKey || 'missing-textbook-lesson',
    originalLesson,
  )
  const [presenting, setPresenting] =
    useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [lessonKey])

  useEffect(() => {
    if (artifact && lessonKey) {
      recordTextbookLessonVisit(
        lessonKey,
        searchParams.toString(),
      )
    }
  }, [artifact, lessonKey, searchParams])

  const [
    mode,
    setMode,
  ] =
    useState<WorkspaceMode>(
      'full',
    )

  const [
    language,
    setLanguage,
  ] =
    useState<LessonLanguage>(
      () =>
        searchParams.get(
          'language',
        ) === 'hindi'
          ? 'hindi'
          : 'english',
    )

  const [
    completedSections,
    setCompletedSections,
  ] =
    useState<
      Set<string>
    >(new Set())

  const rawTitle =
    asString(lesson.title) ??
    'Lesson Plan'
  const rawSubject =
    asString(lesson.subject) ??
    'Science'
  const {
    texts: translatedHeaderTexts,
  } = useLessonTranslation(
    artifact
      ? [rawTitle, rawSubject]
      : [],
    language,
  )

  if (!artifact) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6f1] px-5">
        <div className="max-w-md rounded-[28px] border border-[#dce4da] bg-white p-8 text-center">
          <FileText className="mx-auto size-8 text-[#176b43]" />

          <h1 className="mt-4 text-2xl font-extrabold">
            Lesson not found
          </h1>

          <p className="mt-2 text-sm text-[#69756d]">
            This lesson is not available in the ChalkBox textbook corpus.
          </p>

          <Link
            to="/textbook"
            className="mt-6 inline-flex rounded-xl bg-[#0f5132] px-5 py-3 text-xs font-extrabold text-white"
          >
            Back to Textbook Mode
          </Link>
        </div>
      </main>
    )
  }

  if (!asRecord(artifact.lesson)) {
    return null
  }

  const title =
    translatedHeaderTexts[0] ??
    rawTitle

  const classLevel =
    asNumber(
      lesson.classLevel,
    )

  const subject =
    translatedHeaderTexts[1] ??
    rawSubject

  const artifactDuration =
    asNumber(
      lesson
        .requestedDurationMinutes,
    ) ??
    asNumber(
      artifact
        .requestedDurationMinutes,
    ) ??
    40

  const duration =
    normalizeDuration(
      searchParams.get(
        'duration',
      ),
      artifactDuration,
    )

  const resourceLevel =
    normalizeResourceLevel(
      searchParams.get(
        'resources',
      ),
    )

  const formulas =
    getFormulaCards(
      lessonKey,
    )

  function toggleCompleted(
    key: string,
  ) {
    setCompletedSections(
      (current) => {
        const next =
          new Set(current)

        if (
          next.has(key)
        ) {
          next.delete(key)
        } else {
          next.add(key)
        }

        return next
      },
    )
  }

  function changeLanguage(
    nextLanguage:
      LessonLanguage,
  ) {
    setLanguage(
      nextLanguage,
    )

    const nextParams =
      new URLSearchParams(
        searchParams,
      )
    nextParams.set(
      'language',
      nextLanguage,
    )
    setSearchParams(
      nextParams,
      { replace: true },
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#17211b]">
      <header className="sticky top-0 z-50 border-b border-[#dbe3d8] bg-[#fffef9]/95 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            to="/textbook"
            className="flex size-9 items-center justify-center rounded-xl border border-[#d7e1d4] bg-white text-[#566159] transition-all hover:-translate-x-0.5 hover:bg-[#edf4ea] hover:text-[#176b43]"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <Link to="/">
            <img
              src="/branding/logo.png"
              alt="ChalkBox"
              className="w-[138px]"
            />
          </Link>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="hidden items-center gap-2 rounded-lg bg-[#edf5e9] px-3 py-2 text-[9px] font-extrabold text-[#176b43] md:flex">
              <CheckCircle2 className="size-3.5" />

              {customized
                ? language === 'hindi'
                  ? 'सत्यापित मूल + शिक्षक बदलाव'
                  : 'Verified original + teacher edits'
                : language ===
                    'hindi'
                  ? 'पाठ्यपुस्तक सत्यापित'
                  : 'Textbook verified'}
            </div>

            <LanguageSelector
              language={
                language
              }
              onLanguageChange={
                changeLanguage
              }
            />

            {mode === 'full' && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.print()
                }
                className="h-9 rounded-xl border-[#d2ddd0] bg-white px-3 text-[10px] font-bold"
              >
                <Printer className="mr-1 size-3.5" />

                {language ===
                'hindi'
                  ? 'प्रिंट'
                  : 'Print'}
              </Button>
            )}
          </div>
        </div>

      </header>

      <section className="relative overflow-hidden bg-[#0f5132] text-white">
        <div className="absolute -right-16 -top-32 size-[360px] rounded-full border border-white/10" />

        <div className="absolute -bottom-28 left-[35%] size-64 rounded-full bg-white/[0.035]" />

        <div className="relative mx-auto max-w-[1600px] px-5 py-8 sm:px-7 lg:px-8 lg:py-10">
          <div>
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#d5e8d9]">
                  <BookOpen className="size-3.5" />

                  {language ===
                  'hindi'
                    ? 'पाठ्यपुस्तक मोड'
                    : 'Textbook Mode'}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#d5e8d9]">
                  <CheckCircle2 className="size-3.5" />

                  {customized
                    ? language === 'hindi'
                      ? 'सत्यापित मूल'
                      : 'Verified original'
                    : language ===
                        'hindi'
                      ? 'स्रोत सत्यापित'
                      : 'Source verified'}
                </span>

                {customized && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f4d47a]/35 bg-[#f4d47a]/10 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#f5dda0]">
                    <PencilLine className="size-3.5" />
                    {language === 'hindi'
                      ? 'शिक्षक द्वारा बदला गया'
                      : 'Teacher customized'}
                  </span>
                )}

                {language ===
                  'hindi' && (
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-extrabold text-[#d5e8d9]">
                    हिंदी मोड
                  </span>
                )}
              </div>

              <h1 className="mt-4 max-w-[900px] text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl lg:text-[46px]">
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#cce0d1]">
                {classLevel && (
                  <span>
                    {language ===
                    'hindi'
                      ? `कक्षा ${classLevel}`
                      : `Class ${classLevel}`}
                  </span>
                )}

                <span className="opacity-40">
                  •
                </span>

                <span>
                  {subject}
                </span>

                <span className="opacity-40">
                  •
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />

                  {duration}{' '}

                  {language ===
                  'hindi'
                    ? 'मिनट'
                    : 'minutes'}
                </span>

                <span className="opacity-40">
                  •
                </span>

                <span>
                  {language ===
                  'hindi'
                    ? getResourceLabelHindi(
                        resourceLevel,
                      )
                    : getResourceLabel(
                        resourceLevel,
                      )}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <nav className="sticky top-[69px] z-40 border-b border-[#dce4da] bg-[#fffef9]/95 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 py-3 pr-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 sm:pr-6 lg:px-8">
          <button
            type="button"
            onClick={() =>
              setMode(
                'full',
              )
            }
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
              mode === 'full'
                ? 'bg-[#0f5132] text-white shadow-sm'
                : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
            }`}
          >
            <BookOpen className="size-3.5" />

            {language ===
            'hindi'
              ? 'पूरा पाठ'
              : 'Full Lesson'}
          </button>

          <button
            type="button"
            onClick={() =>
              setMode(
                'teach',
              )
            }
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
              mode === 'teach'
                ? 'bg-[#0f5132] text-white shadow-sm'
                : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
            }`}
          >
            <GraduationCap className="size-3.5" />

            {language ===
            'hindi'
              ? 'कक्षा शुरू करें'
              : 'Start Class'}
          </button>

          <button
            type="button"
            onClick={() =>
              setMode(
                'quick',
              )
            }
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
              mode === 'quick'
                ? 'bg-[#0f5132] text-white shadow-sm'
                : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
            }`}
          >
            <Zap className="size-3.5" />

            {language ===
            'hindi'
              ? 'त्वरित पढ़ाएँ'
              : 'Quick Teach'}
          </button>

          <button
            type="button"
            onClick={() =>
              setMode(
                'flashcards',
              )
            }
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
              mode ===
              'flashcards'
                ? 'bg-[#0f5132] text-white shadow-sm'
                : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
            }`}
          >
            <Lightbulb className="size-3.5" />

            {language ===
            'hindi'
              ? 'फ्लैशकार्ड'
              : 'Flashcards'}
          </button>

          <span className="mx-1 hidden h-8 w-px shrink-0 bg-[#dce4da] sm:block" />

          <button
            type="button"
            onClick={() => setMode('customize')}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
              mode === 'customize'
                ? 'bg-[#0f5132] text-white shadow-sm'
                : 'border border-[#d9e2d7] bg-white text-[#536159] hover:bg-[#eef5eb]'
            }`}
          >
            <PencilLine className="size-3.5" />
            {language === 'hindi'
              ? 'कस्टमाइज़'
              : 'Customize'}
          </button>

          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f0ca5b] px-4 py-2.5 text-[10px] font-extrabold text-[#173525] hover:bg-[#e4bb45]"
          >
            <Presentation className="size-3.5" />
            {language === 'hindi'
              ? 'प्रस्तुत करें'
              : 'Present'}
          </button>
        </div>
      </nav>

      {mode === 'customize' && (
        <CustomizePlanPanel
          originalLesson={originalLesson}
          customizations={customizations}
          language={language}
          sourceMode="textbook"
          onSave={saveSection}
          onReset={resetSection}
          onResetAll={resetAll}
          onDone={() => setMode('full')}
        />
      )}

      {mode ===
        'full' && (
        <LessonReferenceView
          lesson={lesson}
          lessonKey={
            lessonKey
          }
          language={
            language
          }
          durationMinutes={
            duration
          }
          resourceLevel={
            resourceLevel
          }
          completedSections={
            completedSections
          }
          onToggleComplete={
            toggleCompleted
          }
        />
      )}

      {mode ===
        'teach' && (
        <TeachMode
          lesson={lesson}
          lessonKey={
            lessonKey
          }
          durationMinutes={
            duration
          }
          resourceLevel={
            resourceLevel
          }
          language={
            language
          }
        />
      )}

      {mode ===
        'quick' && (
        <QuickTeachView
          lesson={lesson}
          resourceLevel={
            resourceLevel
          }
          language={
            language
          }
        />
      )}

      {mode ===
        'flashcards' && (
        <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
          <LessonFlashcards
            lesson={lesson}
            formulas={
              formulas
            }
            language={
              language
            }
          />
        </div>
      )}

      {presenting && (
        <PresentMode
          lesson={lesson}
          lessonKey={lessonKey}
          title={title}
          durationMinutes={duration}
          resourceLevel={resourceLevel}
          language={language}
          sourceMode="textbook"
          formulas={formulas}
          customized={customized}
          onClose={() => setPresenting(false)}
        />
      )}
    </main>
  )
}

export default LessonWorkspacePage