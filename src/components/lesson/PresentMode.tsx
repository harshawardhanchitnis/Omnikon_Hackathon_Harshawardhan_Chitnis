import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Eye,
  EyeOff,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import LessonVisual from '@/components/lesson/LessonVisual'
import {
  useLessonTranslation,
} from '@/hooks/useLessonTranslation'
import {
  formatFormulaText,
} from '@/lib/formulaText'
import {
  buildTeachSteps,
  type FormulaLike,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'
import {
  adaptTeachSteps,
  type LessonSourceMode,
  type ResourceLevel,
} from '@/lib/lessonPresentation'

type Props = {
  lesson: JsonRecord
  lessonKey: string
  title: string
  durationMinutes: number
  resourceLevel: ResourceLevel
  language: LessonLanguage
  sourceMode?: LessonSourceMode
  formulas?: FormulaLike[]
  customized?: boolean
  onClose: () => void
}

type PresentationSlide = {
  key: string
  label: string
  timeLabel: string
  primaryText: string
  bullets: string[]
  question: string | null
  answer: string | null
  visual: boolean
  formulas: FormulaLike[]
  stageIndex: number
  stageCount: number
  continuationIndex: number
  continuationCount: number
}


function structurePresentationText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return { lead: '', points: [] as string[] }
  }

  const marker = /(?:\b(?:FIRSTLY|SECONDLY|THIRDLY|FOURTHLY|FIFTHLY|SIXTHLY|SEVENTHLY|EIGHTHLY|NINTHLY|TENTHLY|LASTLY|FINALLY|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s*[,.:;)\-–—]\s*|(?:^|\s)(?:\(\d{1,2}\)|\d{1,2}[.):;\-])\s*)/gi
  const matches = [...normalized.matchAll(marker)]

  if (matches.length < 2) {
    return { lead: normalized, points: [] as string[] }
  }

  const lead = normalized.slice(0, matches[0].index ?? 0).trim()
  const points = matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length
      const end =
        index + 1 < matches.length
          ? matches[index + 1].index ?? normalized.length
          : normalized.length

      return normalized
        .slice(start, end)
        .replace(/^[,;\s]+|[,;\s]+$/g, '')
        .trim()
    })
    .filter(Boolean)

  return { lead, points }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(
    seconds / 60,
  )
  const remaining = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

function localizedTimeLabel(
  value: string,
  language: LessonLanguage,
) {
  return language === 'hindi'
    ? value.replace(/\bmin\b/gi, 'मिनट')
    : value
}

function hardWrapText(text: string, maxChars: number) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) {
    const chunks: string[] = []
    for (let offset = 0; offset < text.length; offset += maxChars) {
      chunks.push(text.slice(offset, offset + maxChars))
    }
    return chunks
  }

  const chunks: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length > maxChars) {
      chunks.push(current)
      current = word
    } else {
      current = `${current} ${word}`
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function chunkText(text: string, maxChars = 280) {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length <= maxChars) return trimmed ? [trimmed] : ['']

  const sentences = trimmed.split(/(?<=[.!?।])\s+/).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      chunks.push(...hardWrapText(sentence, maxChars))
      continue
    }

    if (current && `${current} ${sentence}`.length > maxChars) {
      chunks.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }

  if (current) chunks.push(current)
  return chunks.length > 0 ? chunks : hardWrapText(trimmed, maxChars)
}

function paginateSlide(base: Omit<PresentationSlide, 'stageIndex' | 'stageCount' | 'continuationIndex' | 'continuationCount'>, stageIndex: number, stageCount: number) {
  const primaryChunks = chunkText(base.primaryText)
  const bulletChunks: string[][] = []
  for (let offset = 0; offset < base.bullets.length; offset += 2) {
    bulletChunks.push(base.bullets.slice(offset, offset + 2))
  }
  const formulaChunks: FormulaLike[][] = []
  for (let offset = 0; offset < base.formulas.length; offset += 3) {
    formulaChunks.push(base.formulas.slice(offset, offset + 3))
  }

  const continuationCount = Math.max(primaryChunks.length, bulletChunks.length || 1, formulaChunks.length || 1)
  return Array.from({ length: continuationCount }, (_, index): PresentationSlide => ({
    ...base,
    key: continuationCount > 1 ? `${base.key}-${index + 1}` : base.key,
    primaryText: primaryChunks[index] ?? '',
    bullets: bulletChunks[index] ?? [],
    formulas: formulaChunks[index] ?? [],
    question: index === continuationCount - 1 ? base.question : null,
    answer: index === continuationCount - 1 ? base.answer : null,
    visual: base.visual && index === 0,
    stageIndex,
    stageCount,
    continuationIndex: index + 1,
    continuationCount,
  }))
}

function PresentMode({
  lesson,
  lessonKey,
  title,
  durationMinutes,
  resourceLevel,
  language,
  sourceMode = 'textbook',
  formulas = [],
  customized = false,
  onClose,
}: Props) {
  const rootRef =
    useRef<HTMLDivElement>(null)
  const mainRef =
    useRef<HTMLElement>(null)
  const [activeIndex, setActiveIndex] =
    useState(0)
  const [answerVisible, setAnswerVisible] =
    useState(false)
  const [running, setRunning] =
    useState(false)
  const [elapsedSeconds, setElapsedSeconds] =
    useState(0)
  const [fullscreen, setFullscreen] =
    useState(Boolean(document.fullscreenElement))

  const isHindi = language === 'hindi'

  const slides = useMemo<PresentationSlide[]>(
    () => {
      const teachSteps = adaptTeachSteps(
        buildTeachSteps(lesson),
        lesson,
        durationMinutes,
        resourceLevel,
        sourceMode,
      )
      const stageCount = teachSteps.length
      const teachingSlides = teachSteps.flatMap((step, stageOffset) => {
        const structured = structurePresentationText(step.primaryText)
        const filteredBullets = step.bullets.filter(
          (item) =>
            !/^listen for:/i.test(item) &&
            !/^resource adaptation:/i.test(item),
        )

        const base: Omit<PresentationSlide, 'stageIndex' | 'stageCount' | 'continuationIndex' | 'continuationCount'> = {
          key: step.key,
          label: step.label,
          timeLabel: step.timeLabel,
          primaryText: structured.lead,
          bullets: [...structured.points, ...filteredBullets],
          question: step.question,
          answer: step.answer,
          visual: step.key === 'visualize',
          formulas: step.key === 'define' ? formulas : [],
        }

        return paginateSlide(base, stageOffset + 1, stageCount)
      })

      return teachingSlides
    }, [
      durationMinutes,
      formulas,
      lesson,
      resourceLevel,
      sourceMode,
    ],
  )

  const safeIndex = Math.min(
    activeIndex,
    Math.max(0, slides.length - 1),
  )
  const slide = slides[safeIndex]

  const translationInput = useMemo(
    () => {
      if (!slide) {
        return []
      }

      return [
        slide.label,
        slide.primaryText,
        ...slide.bullets,
        slide.question ?? '',
        slide.answer ?? '',
        ...slide.formulas.flatMap(
          (formula) => [
            formula.label,
            formula.note,
          ],
        ),
      ]
    }, [slide],
  )

  const { texts, translating } = useLessonTranslation(
    translationInput,
    language,
  )
  const {
    texts: translatedTitleTexts,
  } = useLessonTranslation(
    [title],
    language,
  )
  const translatedTitle =
    translatedTitleTexts[0] ??
    title

  let translationCursor = 0
  const translatedLabel =
    texts[translationCursor++] ??
    slide?.label ??
    ''
  const translatedPrimary =
    texts[translationCursor++] ??
    slide?.primaryText ??
    ''
  const translatedBullets =
    (slide?.bullets ?? []).map(
      (item) =>
        texts[translationCursor++] ?? item,
    )
  const translatedQuestion =
    texts[translationCursor++] ??
    slide?.question ??
    ''
  const translatedAnswer =
    texts[translationCursor++] ??
    slide?.answer ??
    ''
  const translatedFormulas =
    (slide?.formulas ?? []).map(
      (formula) => ({
        ...formula,
        label:
          texts[translationCursor++] ??
          formula.label,
        note:
          texts[translationCursor++] ??
          formula.note,
      }),
    )

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!running) {
      return
    }

    const timer = window.setInterval(
      () => {
        setElapsedSeconds(
          (current) => current + 1,
        )
      },
      1000,
    )

    return () =>
      window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    const handleFullscreen = () =>
      setFullscreen(
        Boolean(document.fullscreenElement),
      )

    document.addEventListener(
      'fullscreenchange',
      handleFullscreen,
    )

    return () =>
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreen,
      )
  }, [])

  useEffect(() => {
    setAnswerVisible(false)
    mainRef.current?.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }, [safeIndex])

  function previousSlide() {
    setActiveIndex((current) =>
      Math.max(0, current - 1),
    )
  }

  function nextSlide() {
    setActiveIndex((current) =>
      Math.min(
        slides.length - 1,
        current + 1,
      ),
    )
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await rootRef.current?.requestFullscreen()
      }
    } catch {
      // Fullscreen is an enhancement; presentation remains usable without it.
    }
  }

  if (!slide) {
    return null
  }

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b2f21] text-white"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 bg-[#09291d] px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12]"
          aria-label={isHindi ? 'प्रस्तुति बंद करें' : 'Exit presentation'}
        >
          <X className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-[#9dc7a9]">
            {isHindi
              ? 'कक्षा प्रस्तुति'
              : 'Classroom presentation'}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-extrabold leading-tight sm:text-base">
            {translatedTitle}
          </p>
        </div>

        {customized && (
          <span className="hidden rounded-full border border-[#f1cf68]/35 bg-[#f1cf68]/10 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#f5d978] sm:inline-flex">
            {isHindi
              ? 'शिक्षक बदलाव'
              : 'Teacher customized'}
          </span>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 font-mono text-[11px] font-bold">
            {formatTime(elapsedSeconds)}
            <span className="text-white/45">
              / {durationMinutes}:00
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setRunning((current) => !current)
            }
            className="flex size-10 items-center justify-center rounded-xl bg-[#f0ca5b] text-[#173525]"
            aria-label={
              running
                ? isHindi ? 'टाइमर रोकें' : 'Pause timer'
                : isHindi ? 'टाइमर शुरू करें' : 'Start timer'
            }
          >
            {running ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setRunning(false)
              setElapsedSeconds(0)
            }}
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]"
            aria-label={isHindi ? 'टाइमर रीसेट करें' : 'Reset timer'}
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]"
            aria-label={
              fullscreen
                ? isHindi ? 'फुलस्क्रीन से बाहर निकलें' : 'Exit fullscreen'
                : isHindi ? 'फुलस्क्रीन खोलें' : 'Enter fullscreen'
            }
          >
            {fullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Expand className="size-4" />
            )}
          </button>
        </div>
      </header>

      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-[#f0ca5b] transition-all"
          style={{
            width: `${(slide.stageIndex / slide.stageCount) * 100}%`,
          }}
        />
      </div>

      <main ref={mainRef} className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-10 pt-5 sm:px-8 sm:pb-12 sm:pt-6 lg:overflow-hidden lg:px-12">
        <section className="my-auto w-full max-w-[1320px]">
          {isHindi && translating ? (
            <div className="grid min-h-[360px] place-items-center text-center">
              <div>
                <p className="text-sm font-extrabold text-[#f5d978]">हिंदी तैयार हो रही है…</p>
                <p className="mt-2 text-xs font-semibold text-white/60">यह स्लाइड अनुवाद पूरा होने पर दिखाई जाएगी।</p>
              </div>
            </div>
          ) : (<>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#9dc7a9]">
                {isHindi ? 'चरण' : 'Step'} {slide.stageIndex}{' '}
                {isHindi ? '/' : 'of'} {slide.stageCount}
                {slide.continuationCount > 1
                  ? ` · ${isHindi ? 'भाग' : 'part'} ${slide.continuationIndex}/${slide.continuationCount}`
                  : ''}
                {slide.timeLabel
                  ? ` · ${localizedTimeLabel(slide.timeLabel, language)}`
                  : ''}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#fffdf5] sm:text-4xl lg:text-5xl">
                {translatedLabel}
              </h1>
            </div>
          </div>

          {slide.formulas.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {translatedFormulas.map(
                (formula, index) => (
                  <div
                    key={`${formula.label}-${index}`}
                    className="rounded-[24px] border border-white/12 bg-white/[0.06] p-6"
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9dc7a9]">
                      {formula.label}
                    </p>
                    <p className="mt-4 font-serif text-3xl font-bold leading-tight text-[#f5d978] sm:text-4xl">
                      {formatFormulaText(
                        formula.formula,
                      )}
                    </p>
                    <p className="mt-4 text-sm font-medium leading-6 text-white/72">
                      {formatFormulaText(
                        formula.note,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : slide.visual ? (
            <div className="mt-7 space-y-4">
              <div className="rounded-[28px] bg-[#fffef9] p-3 text-[#17211b] shadow-2xl sm:p-5">
                <LessonVisual
                  lessonKey={lessonKey}
                  lesson={lesson}
                  sourceMode={sourceMode}
                  language={language}
                  presentation
                />
              </div>

              {translatedBullets.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {translatedBullets.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[9px] size-2.5 shrink-0 rounded-full bg-[#f0ca5b]"
                      />
                      <p className="text-base font-semibold leading-7 text-white/90">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`mt-8 grid gap-6 ${
                translatedPrimary || translatedQuestion
                  ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]'
                  : 'mx-auto max-w-5xl grid-cols-1'
              }`}
            >
              <div>
                {translatedPrimary && (
                  <p className="max-w-5xl whitespace-pre-line text-2xl font-bold leading-[1.45] text-[#fffdf5] sm:text-3xl lg:text-[36px]">
                    {translatedPrimary}
                  </p>
                )}

                {translatedQuestion &&
                  translatedQuestion !==
                    translatedPrimary && (
                  <div className="mt-7 rounded-[24px] border border-[#f0ca5b]/30 bg-[#f0ca5b]/10 p-5 sm:p-6">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#f5d978]">
                      {isHindi ? 'प्रश्न' : 'Question'}
                    </p>
                    <p className="mt-3 text-2xl font-extrabold leading-snug sm:text-3xl">
                      {translatedQuestion}
                    </p>
                  </div>
                )}
              </div>

              {translatedBullets.length > 0 && (
                <ul className="space-y-3">
                  {translatedBullets.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-[9px] size-2.5 shrink-0 rounded-full bg-[#f0ca5b]"
                      />
                      <p className="text-base font-semibold leading-7 text-white/90 sm:text-lg">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {translatedAnswer && (
            <div className="mt-7">
              <button
                type="button"
                onClick={() =>
                  setAnswerVisible(
                    (current) => !current,
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-[#f0ca5b]/35 bg-[#f0ca5b]/10 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#f5d978]"
              >
                {answerVisible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
                {answerVisible
                  ? isHindi
                    ? 'उत्तर छिपाएँ'
                    : 'Hide answer'
                  : isHindi
                    ? 'उत्तर दिखाएँ'
                    : 'Show answer'}
              </button>

              {answerVisible && (
                <div className="mt-4 rounded-[24px] border border-[#8cc39b]/25 bg-[#163f2c] p-5 text-lg font-semibold leading-8 text-[#dff0e3] sm:text-xl">
                  {translatedAnswer}
                </div>
              )}
            </div>
          )}
          </>)}
        </section>
      </main>

      <footer className="shrink-0 border-t border-white/10 bg-[#09291d] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={previousSlide}
            disabled={safeIndex === 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-[10px] font-extrabold disabled:opacity-25"
          >
            <ChevronLeft className="size-4" />
            {isHindi ? 'पिछला' : 'Previous'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={nextSlide}
              disabled={
                safeIndex === slides.length - 1
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#f0ca5b] px-5 text-[10px] font-extrabold text-[#173525] disabled:opacity-30"
            >
              {isHindi ? 'अगला' : 'Next'}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PresentMode
