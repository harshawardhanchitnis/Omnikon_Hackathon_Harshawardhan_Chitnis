import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Lightbulb,
  MessageSquareText,
  PencilLine,
  Presentation,
  Printer,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'
import {
  Link,
} from 'react-router-dom'

import CustomizePlanPanel from '@/components/lesson/CustomizePlanPanel'
import FocusedTeachingView from '@/components/lesson/FocusedTeachingView'
import LanguageSelector from '@/components/lesson/LanguageSelector'
import LessonFlashcards from '@/components/lesson/LessonFlashcards'
import LessonReferenceView from '@/components/lesson/LessonReferenceView'
import PresentMode from '@/components/lesson/PresentMode'
import QuickTeachView from '@/components/lesson/QuickTeachView'
import TeachMode from '@/components/lesson/TeachMode'
import TopicWorkspaceTools from '@/components/lesson/TopicWorkspaceTools'
import { Button } from '@/components/ui/button'
import { useLessonCustomizations } from '@/hooks/useLessonCustomizations'
import { useLessonTranslation } from '@/hooks/useLessonTranslation'
import {
  asNumber,
  asString,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'
import {
  getResourceLabel,
  getResourceLabelHindi,
} from '@/lib/lessonPresentation'
import {
  loadTopicLessonBundle,
} from '@/lib/topicMode'

type WorkspaceMode =
  | 'focused'
  | 'full'
  | 'teach'
  | 'quick'
  | 'flashcards'
  | 'customize'

const emptyLesson: JsonRecord = {}

function TopicLessonWorkspacePage() {
  const bundle = useMemo(
    () =>
      loadTopicLessonBundle(),
    [],
  )
  const focusedMode =
    bundle?.request.requestMode === 'focused'
  const originalLesson =
    bundle?.lesson ?? emptyLesson
  const lessonIdentity =
    bundle
      ? `topic-${bundle.generationId}`
      : 'missing-topic-lesson'
  const {
    lesson,
    customizations,
    customized,
    saveSection,
    resetSection,
    resetAll,
  } = useLessonCustomizations(
    lessonIdentity,
    originalLesson,
  )
  const [presenting, setPresenting] =
    useState(false)

  const [
    mode,
    setMode,
  ] =
    useState<WorkspaceMode>(
      () =>
        bundle?.request
          .requestMode ===
        'focused'
          ? 'focused'
          : 'full',
    )

  const [
    language,
    setLanguage,
  ] =
    useState<LessonLanguage>(
      () =>
        bundle?.request
          .language ??
        'english',
    )

  const [
    completedSections,
    setCompletedSections,
  ] = useState<Set<string>>(
    new Set(),
  )

  const rawTitle =
    asString(lesson.title) ??
    'Topic teaching plan'
  const rawSubject =
    asString(lesson.subject) ??
    'Science'
  const {
    texts: translatedHeaderTexts,
  } = useLessonTranslation(
    bundle
      ? [rawTitle, rawSubject]
      : [],
    language,
  )

  if (!bundle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6f1] px-5">
        <div className="max-w-md rounded-[28px] border border-[#dce4da] bg-white p-8 text-center">
          <Sparkles className="mx-auto size-8 text-[#176b43]" />
          <h1 className="mt-4 text-2xl font-extrabold">
            No Topic Mode lesson yet
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#69756d]">
            Generate a live Science teaching plan first. ChalkBox does not
            substitute one of the prepared textbook lessons here.
          </p>
          <Link
            to="/topic"
            className="mt-6 inline-flex rounded-xl bg-[#0f5132] px-5 py-3 text-xs font-extrabold text-white"
          >
            Open Topic Mode
          </Link>
        </div>
      </main>
    )
  }

  const title =
    translatedHeaderTexts[0] ??
    rawTitle
  const classLevel =
    asNumber(
      lesson.classLevel,
    ) ??
    bundle.request.classLevel
  const subject =
    translatedHeaderTexts[1] ??
    rawSubject
  const duration =
    asNumber(
      lesson.requestedDurationMinutes,
    ) ??
    bundle.request
      .durationMinutes
  const resourceLevel =
    bundle.request
      .resourceLevel
  const lessonKey =
    `topic-${bundle.generationId}`

  function toggleCompleted(
    key: string,
  ) {
    setCompletedSections(
      (current) => {
        const next =
          new Set(current)

        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }

        return next
      },
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#17211b]">
      <header className="sticky top-0 z-50 border-b border-[#dbe3d8] bg-[#fffef9]/95 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link
            to="/topic"
            className="flex size-9 items-center justify-center rounded-xl border border-[#d7e1d4] bg-white text-[#566159] transition-all hover:-translate-x-0.5 hover:bg-[#edf4ea] hover:text-[#176b43]"
            aria-label="Back to Topic Mode"
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
              {language ===
              'hindi'
                ? 'विज्ञान जाँचा गया'
                : 'Science checked'}
            </div>

            <LanguageSelector
              language={language}
              onLanguageChange={
                setLanguage
              }
            />

            {(mode === 'full' || mode === 'focused') && (
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
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#d5e8d9]">
              <Sparkles className="size-3.5" />
              {language ===
              'hindi'
                ? 'टॉपिक मोड'
                : 'Topic Mode'}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#d5e8d9]">
              <CheckCircle2 className="size-3.5" />
              {language ===
              'hindi'
                ? 'AI द्वारा बनाया गया · विज्ञान जाँचा गया'
                : 'AI-generated · Science checked'}
            </span>

            <span className="inline-flex items-center rounded-full border border-[#f4d7a3]/30 bg-[#fff4da]/10 px-3 py-1.5 text-[8px] font-extrabold text-[#f1dfba]">
              {language ===
              'hindi'
                ? 'पाठ्यपुस्तक स्रोत नहीं'
                : 'No textbook provenance'}
            </span>

            {customized && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f4d47a]/35 bg-[#f4d47a]/10 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#f5dda0]">
                <PencilLine className="size-3.5" />
                {language === 'hindi'
                  ? 'शिक्षक द्वारा बदला गया'
                  : 'Teacher customized'}
              </span>
            )}
          </div>

          <h1 className="mt-4 max-w-[980px] text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl lg:text-[46px]">
            {title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#cce0d1]">
            <span>
              {language ===
              'hindi'
                ? `कक्षा ${classLevel}`
                : `Class ${classLevel}`}
            </span>
            <span className="opacity-40">•</span>
            <span>{subject}</span>
            <span className="opacity-40">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {duration}{' '}
              {language ===
              'hindi'
                ? 'मिनट'
                : 'minutes'}
            </span>
            <span className="opacity-40">•</span>
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
            <span className="opacity-40">•</span>
            <span>
              {bundle.request
                .requestMode ===
              'focused'
                ? language ===
                  'hindi'
                  ? 'केंद्रित शिक्षण सहायता'
                  : 'Focused teaching help'
                : language ===
                    'hindi'
                  ? 'पूरा पाठ'
                  : 'Complete lesson'}
            </span>
          </div>
        </div>
      </section>

      <nav className="sticky top-[69px] z-40 border-b border-[#dce4da] bg-[#fffef9]/95 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 py-3 pr-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 sm:pr-6 lg:px-8">
          {focusedMode ? (
            <span className="flex shrink-0 items-center gap-2 rounded-xl bg-[#0f5132] px-4 py-2.5 text-[10px] font-extrabold text-white shadow-sm">
              <MessageSquareText className="size-3.5" />
              {language === 'hindi' ? 'केंद्रित शिक्षण सहायता' : 'Focused Teaching Help'}
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode('full')}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
                  mode === 'full'
                    ? 'bg-[#0f5132] text-white shadow-sm'
                    : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
                }`}
              >
                <Sparkles className="size-3.5" />
                {language === 'hindi' ? 'पूरा प्लान' : 'Full Plan'}
              </button>

              <button
                type="button"
                onClick={() => setMode('teach')}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
                  mode === 'teach'
                    ? 'bg-[#0f5132] text-white shadow-sm'
                    : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
                }`}
              >
                <GraduationCap className="size-3.5" />
                {language === 'hindi' ? 'कक्षा शुरू करें' : 'Start Class'}
              </button>

              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
                  mode === 'quick'
                    ? 'bg-[#0f5132] text-white shadow-sm'
                    : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
                }`}
              >
                <Zap className="size-3.5" />
                {language === 'hindi' ? 'त्वरित पढ़ाएँ' : 'Quick Teach'}
              </button>

              <button
                type="button"
                onClick={() => setMode('flashcards')}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold transition-all ${
                  mode === 'flashcards'
                    ? 'bg-[#0f5132] text-white shadow-sm'
                    : 'bg-[#f0f4ee] text-[#5e6b62] hover:bg-[#e5eee2]'
                }`}
              >
                <Lightbulb className="size-3.5" />
                {language === 'hindi' ? 'फ्लैशकार्ड' : 'Flashcards'}
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
                {language === 'hindi' ? 'कस्टमाइज़' : 'Customize'}
              </button>

              <button
                type="button"
                onClick={() => setPresenting(true)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#f0ca5b] px-4 py-2.5 text-[10px] font-extrabold text-[#173525] hover:bg-[#e4bb45]"
              >
                <Presentation className="size-3.5" />
                {language === 'hindi' ? 'प्रस्तुत करें' : 'Present'}
              </button>
            </>
          )}
        </div>
      </nav>

      <TopicWorkspaceTools
        bundle={bundle}
        lesson={lesson}
        language={language}
      />

      {!focusedMode && mode === 'customize' && (
        <CustomizePlanPanel
          originalLesson={originalLesson}
          customizations={customizations}
          language={language}
          sourceMode="topic"
          onSave={saveSection}
          onReset={resetSection}
          onResetAll={resetAll}
          onDone={() =>
            setMode(
              bundle.request.requestMode === 'focused'
                ? 'focused'
                : 'full',
            )
          }
        />
      )}

      {mode === 'focused' &&
        bundle.request.requestMode === 'focused' && (
        <FocusedTeachingView
          lesson={lesson}
          lessonKey={lessonKey}
          language={language}
        />
      )}

      {!focusedMode && mode === 'full' && (
        <LessonReferenceView
          lesson={lesson}
          lessonKey={lessonKey}
          language={language}
          durationMinutes={
            duration
          }
          resourceLevel={
            resourceLevel
          }
          sourceMode="topic"
          formulas={
            bundle.formulaCards
          }
          completedSections={
            completedSections
          }
          onToggleComplete={
            toggleCompleted
          }
          expandAllByDefault
        />
      )}

      {!focusedMode && mode === 'teach' && (
        <TeachMode
          lesson={lesson}
          lessonKey={lessonKey}
          durationMinutes={
            duration
          }
          resourceLevel={
            resourceLevel
          }
          sourceMode="topic"
          language={language}
        />
      )}

      {!focusedMode && mode === 'quick' && (
        <QuickTeachView
          lesson={lesson}
          resourceLevel={
            resourceLevel
          }
          sourceMode="topic"
          language={language}
        />
      )}

      {!focusedMode && mode ===
        'flashcards' && (
        <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
          <LessonFlashcards
            lesson={lesson}
            formulas={
              bundle.formulaCards
            }
            language={language}
          />
        </div>
      )}

      {!focusedMode && presenting && (
        <PresentMode
          lesson={lesson}
          lessonKey={lessonKey}
          title={title}
          durationMinutes={duration}
          resourceLevel={resourceLevel}
          language={language}
          sourceMode="topic"
          formulas={bundle.formulaCards}
          customized={customized}
          onClose={() => setPresenting(false)}
        />
      )}
    </main>
  )
}

export default TopicLessonWorkspacePage
