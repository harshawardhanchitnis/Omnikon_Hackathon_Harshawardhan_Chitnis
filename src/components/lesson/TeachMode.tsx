import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import LessonVisual from '@/components/lesson/LessonVisual'
import VoiceControls from '@/components/lesson/VoiceControls'
import {
  useLessonTranslation,
} from '@/hooks/useLessonTranslation'
import {
  buildTeachSteps,
  type JsonRecord,
  type TeachStep,
} from '@/lib/lessonExperience'
import type {
  LessonLanguage,
} from '@/lib/lessonLanguage'
import {
  adaptTeachSteps,
  type LessonSourceMode,
  type ResourceLevel,
} from '@/lib/lessonPresentation'

type Props = {
  lesson: JsonRecord
  lessonKey: string
  durationMinutes: number
  resourceLevel:
    ResourceLevel
  sourceMode?:
    LessonSourceMode
  language:
    LessonLanguage
}

const emptyStep:
  TeachStep = {
    key: 'empty',
    label: '',
    timeLabel: '',
    primaryText: '',
    bullets: [],
    question: null,
    answer: null,
    sourcePages: [],
  }

function formatTime(
  seconds: number,
) {
  const minutes =
    Math.floor(
      seconds / 60,
    )

  const remaining =
    seconds % 60

  return `${String(
    minutes,
  ).padStart(
    2,
    '0',
  )}:${String(
    remaining,
  ).padStart(
    2,
    '0',
  )}`
}

function localizedTimeLabel(
  value: string,
  language: LessonLanguage,
) {
  return language === 'hindi'
    ? value.replace(/\bmin\b/gi, 'मिनट')
    : value
}

function TeachMode({
  lesson,
  lessonKey,
  durationMinutes,
  resourceLevel,
  sourceMode = 'textbook',
  language,
}: Props) {
  const steps =
    useMemo(
      () =>
        adaptTeachSteps(
          buildTeachSteps(
            lesson,
          ),
          lesson,
          durationMinutes,
          resourceLevel,
          sourceMode,
        ),
      [
        durationMinutes,
        lesson,
        resourceLevel,
        sourceMode,
      ],
    )

  const storageKey =
    `chalkbox-teach-${lessonKey}`

  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            storageKey,
          )

        if (!stored) {
          return 0
        }

        const parsed =
          JSON.parse(
            stored,
          ) as {
            activeIndex?:
              number
          }

        return (
          parsed.activeIndex ??
          0
        )
      } catch {
        return 0
      }
    })

  const [
    completed,
    setCompleted,
  ] =
    useState<
      Set<string>
    >(() => {
      try {
        const stored =
          localStorage.getItem(
            storageKey,
          )

        if (!stored) {
          return new Set()
        }

        const parsed =
          JSON.parse(
            stored,
          ) as {
            completed?:
              string[]
          }

        return new Set(
          parsed.completed ??
            [],
        )
      } catch {
        return new Set()
      }
    })

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] =
    useState(0)

  const [
    running,
    setRunning,
  ] =
    useState(false)

  const [
    revealAnswer,
    setRevealAnswer,
  ] =
    useState(false)

  const safeIndex =
    steps.length > 0
      ? Math.min(
          activeIndex,
          steps.length - 1,
        )
      : 0

  const step =
    steps[safeIndex] ??
    emptyStep

  const translationInput =
    useMemo(
      () => [
        step.label,
        step.primaryText,
        ...step.bullets,
        step.question ??
          '',
        step.answer ??
          '',
      ],
      [step],
    )

  const {
    texts:
      translatedTexts,
    translating,
    error:
      translationError,
  } =
    useLessonTranslation(
      translationInput,
      language,
    )

  const translatedLabel =
    translatedTexts[0] ??
    step.label

  const translatedPrimary =
    translatedTexts[1] ??
    step.primaryText

  const bulletStart = 2

  const translatedBullets =
    translatedTexts.slice(
      bulletStart,
      bulletStart +
        step.bullets.length,
    )

  const questionIndex =
    bulletStart +
    step.bullets.length

  const answerIndex =
    questionIndex + 1

  const translatedQuestion =
    translatedTexts[
      questionIndex
    ] ??
    step.question

  const translatedAnswer =
    translatedTexts[
      answerIndex
    ] ??
    step.answer

  useEffect(() => {
    if (
      steps.length ===
      0
    ) {
      return
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        activeIndex:
          safeIndex,
        completed:
          [...completed],
      }),
    )
  }, [
    completed,
    safeIndex,
    steps.length,
    storageKey,
  ])

  useEffect(() => {
    if (!running) {
      return
    }

    const timer =
      window.setInterval(
        () => {
          setElapsedSeconds(
            (current) =>
              current + 1,
          )
        },
        1000,
      )

    return () => {
      window.clearInterval(
        timer,
      )
    }
  }, [running])

  if (
    steps.length ===
    0
  ) {
    return (
      <div className="mx-auto max-w-[800px] p-8 text-center">
        <p className="font-bold">
          No teaching flow is available for this lesson.
        </p>
      </div>
    )
  }

  const progress =
    Math.round(
      ((safeIndex + 1) /
        steps.length) *
        100,
    )

  const totalSeconds =
    durationMinutes * 60

  const timerProgress =
    Math.min(
      100,
      Math.round(
        (elapsedSeconds /
          totalSeconds) *
          100,
      ),
    )

  const voiceText =
    [
      translatedLabel,
      translatedPrimary,
      ...translatedBullets,
      translatedQuestion ??
        '',
    ]
      .filter(Boolean)
      .join('. ')

  function previous() {
    setActiveIndex(
      Math.max(
        0,
        safeIndex - 1,
      ),
    )

    setRevealAnswer(false)
  }

  function next() {
    setActiveIndex(
      Math.min(
        steps.length - 1,
        safeIndex + 1,
      ),
    )

    setRevealAnswer(false)
  }

  function toggleComplete() {
    setCompleted(
      (current) => {
        const next =
          new Set(current)

        if (
          next.has(
            step.key,
          )
        ) {
          next.delete(
            step.key,
          )
        } else {
          next.add(
            step.key,
          )
        }

        return next
      },
    )
  }

  function resetTimer() {
    setRunning(false)
    setElapsedSeconds(0)
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-[30px] border border-[#d6e1d4] bg-[#fffef9] shadow-[0_24px_70px_rgba(20,68,41,0.10)]">
        <div className="border-b border-[#dce4da] bg-[#f7faf5] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                {language ===
                'hindi'
                  ? 'लाइव कक्षा'
                  : 'Live classroom'}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-extrabold tracking-[-0.03em]">
                  {language ===
                  'hindi'
                    ? `चरण ${safeIndex + 1} / ${steps.length}`
                    : `Step ${safeIndex + 1} of ${steps.length}`}
                </h2>

                <span className="rounded-full bg-[#e5efe2] px-3 py-1.5 text-[9px] font-extrabold text-[#176b43]">
                  {localizedTimeLabel(step.timeLabel, language)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#d7e1d4] bg-white px-3 py-2">
                <Clock3 className="size-4 text-[#176b43]" />

                <span className="font-mono text-[12px] font-extrabold">
                  {formatTime(
                    elapsedSeconds,
                  )}
                </span>

                <span className="text-[9px] font-bold text-[#89948c]">
                  / {durationMinutes}:00
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRunning(
                    (current) =>
                      !current,
                  )
                }
                className="flex size-9 items-center justify-center rounded-xl bg-[#176b43] text-white"
                aria-label={running ? (language === 'hindi' ? 'टाइमर रोकें' : 'Pause timer') : (language === 'hindi' ? 'टाइमर शुरू करें' : 'Start timer')}
              >
                {running ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </button>

              <button
                type="button"
                onClick={
                  resetTimer
                }
                className="flex size-9 items-center justify-center rounded-xl border border-[#d7e1d4] bg-white text-[#657168]"
                aria-label={language === 'hindi' ? 'टाइमर रीसेट करें' : 'Reset timer'}
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#dde7da]">
            <div
              className="h-full rounded-full bg-[#176b43] transition-all duration-500"
              style={{
                width:
                  `${timerProgress}%`,
              }}
            />
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-[850px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                  {localizedTimeLabel(step.timeLabel, language)}
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                  {
                    translatedLabel
                  }
                </h1>
              </div>

              <button
                type="button"
                onClick={
                  toggleComplete
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.1em] transition-all ${
                  completed.has(
                    step.key,
                  )
                    ? 'bg-[#176b43] text-white'
                    : 'border border-[#cfdace] bg-white text-[#657168]'
                }`}
              >
                <Check className="size-3.5" />

                {completed.has(
                  step.key,
                )
                  ? language ===
                    'hindi'
                    ? 'पूरा'
                    : 'Covered'
                  : language ===
                      'hindi'
                    ? 'पूरा चिन्हित करें'
                    : 'Mark covered'}
              </button>
            </div>

            {language ===
              'hindi' &&
              translating && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#fff3d8] px-3 py-2 text-[9px] font-extrabold text-[#90672b]">
                <LoaderCircle className="size-3.5 animate-spin" />
                हिंदी तैयार हो रही है…
              </div>
            )}

            {translationError && (
              <div className="mt-4 rounded-xl border border-[#ead5d0] bg-[#fff8f6] p-3 text-[9px] font-semibold text-[#92564b]">
                {translationError}
              </div>
            )}

            {step.key ===
              'visualize' && (
              <div className="mt-7">
                <LessonVisual
                  lessonKey={
                    lessonKey
                  }
                  lesson={lesson}
                  sourceMode={sourceMode}
                />
              </div>
            )}

            <div className="mt-7 rounded-[22px] bg-[#f3f7f0] p-5 sm:p-6">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                {language ===
                'hindi'
                  ? 'शिक्षक संकेत'
                  : 'Teacher cue'}
              </p>

              <p className="mt-3 whitespace-pre-line text-[16px] font-semibold leading-8 text-[#334038]">
                {
                  translatedPrimary
                }
              </p>

              <div className="mt-5">
                <VoiceControls
                  text={
                    voiceText
                  }
                  language={
                    language
                  }
                />
              </div>
            </div>

            {translatedBullets.length >
              0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {translatedBullets.map(
                  (
                    bullet,
                    index,
                  ) => (
                    <div
                      key={`${step.key}-${index}`}
                      className="rounded-2xl border border-[#dde5da] bg-white p-4"
                    >
                      <div className="flex gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#e5efe2] text-[9px] font-extrabold text-[#176b43]">
                          {index +
                            1}
                        </span>

                        <p className="text-[12px] font-medium leading-6 text-[#566159]">
                          {
                            bullet
                          }
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {translatedQuestion &&
              translatedAnswer && (
                <div className="mt-5 rounded-[22px] border border-[#d9e3d7] bg-white p-5">
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
                    {language ===
                    'hindi'
                      ? 'कक्षा से पूछें'
                      : 'Ask the class'}
                  </p>

                  <p className="mt-3 text-[15px] font-extrabold leading-7">
                    {
                      translatedQuestion
                    }
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setRevealAnswer(
                        (current) =>
                          !current,
                      )
                    }
                    className="mt-4 rounded-xl bg-[#edf5e9] px-3 py-2 text-[9px] font-extrabold text-[#176b43]"
                  >
                    {revealAnswer
                      ? language ===
                        'hindi'
                        ? 'उत्तर छिपाएँ'
                        : 'Hide answer'
                      : language ===
                          'hindi'
                        ? 'उत्तर दिखाएँ'
                        : 'Reveal answer'}
                  </button>

                  {revealAnswer && (
                    <p className="mt-3 rounded-xl bg-[#f8faf6] p-4 text-[12px] font-medium leading-6 text-[#566159]">
                      {
                        translatedAnswer
                      }
                    </p>
                  )}
                </div>
              )}

            {step.sourcePages
              .length >
              0 && (
              <p className="mt-5 text-[9px] font-bold text-[#89948c]">
                {language ===
                'hindi'
                  ? 'पाठ्यपुस्तक पृष्ठ'
                  : 'Textbook pages'}
                :{' '}
                {step.sourcePages.join(
                  ', ',
                )}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-[#dce4da] bg-[#fafbf8] p-4 sm:p-5">
          <div className="mx-auto flex max-w-[850px] items-center justify-between gap-4">
            <button
              type="button"
              onClick={
                previous
              }
              disabled={
                safeIndex === 0
              }
              className="inline-flex items-center gap-2 rounded-xl border border-[#d7e1d4] bg-white px-4 py-2.5 text-[9px] font-extrabold text-[#657168] disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />

              {language ===
              'hindi'
                ? 'पिछला'
                : 'Previous'}
            </button>

            <div className="hidden flex-1 sm:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e2e8df]">
                <div
                  className="h-full bg-[#176b43] transition-all duration-500"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={next}
              disabled={
                safeIndex ===
                steps.length - 1
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f5132] px-4 py-2.5 text-[9px] font-extrabold text-white disabled:opacity-30"
            >
              {language ===
              'hindi'
                ? 'अगला'
                : 'Next'}

              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeachMode