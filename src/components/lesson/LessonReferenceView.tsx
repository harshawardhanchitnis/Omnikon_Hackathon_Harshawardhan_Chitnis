import {
  Check,
  ChevronDown,
  Clock3,
  Eye,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'
import {

  useMemo,
  useState,
} from 'react'

import LessonVisual from '@/components/lesson/LessonVisual'
import {
  useLessonTranslation,
} from '@/hooks/useLessonTranslation'
import {
  asNumberArray,
  asRecord,
  asRecordArray,
  asString,
  asStringArray,
  getFormulaCards,
  lessonSectionLabels,
  titleCase,
  type FormulaLike,
  type JsonRecord,
} from '@/lib/lessonExperience'
import type {
  LessonLanguage,
} from '@/lib/lessonLanguage'
import {
  formatFormulaText,
} from '@/lib/formulaText'
import {
  buildLessonFlowItems,
  getOrderedLessonSections,
  getResourceLabel,
  getResourceLabelHindi,
  getResourceStrategy,
  type LessonSourceMode,
  type ResourceLevel,
} from '@/lib/lessonPresentation'

type Props = {
  lesson: JsonRecord
  lessonKey: string
  language: LessonLanguage
  durationMinutes: number
  resourceLevel:
    ResourceLevel
  sourceMode?:
    LessonSourceMode
  formulas?:
    FormulaLike[]
  completedSections:
    Set<string>
  onToggleComplete: (
    key: string,
  ) => void
  expandAllByDefault?: boolean
}

const hindiSectionLabels:
  Record<string, string> = {
    hook: 'शुरुआत',
    define: 'परिभाषाएँ',
    explain: 'समझाएँ',
    visualize: 'दृश्य रूप',
    example: 'उदाहरण',
    activity: 'गतिविधि',
    howToTeach:
      'कैसे पढ़ाएँ',
    boardPlan:
      'बोर्ड योजना',
    practice: 'अभ्यास',
    checkUnderstanding:
      'समझ की जाँच',
    materials:
      'पाठ सामग्री',
  }

const hindiFlowDescriptions:
  Record<string, string> = {
    hook:
      'जिज्ञासा जगाएँ और पहले से मौजूद ज्ञान को सक्रिय करें.',

    define:
      'मुख्य शब्दों और आवश्यक सूत्रों को स्पष्ट करें.',

    explain:
      'मुख्य विचारों को जोड़कर समझाएँ कि वे कैसे काम करते हैं.',

    visualize:
      'बोर्ड पर दृश्य बनाकर अवधारणा को स्पष्ट करें.',

    activity:
      'व्याख्या को हाथों से की जाने वाली गतिविधि से जोड़ें.',

    example:
      'एक प्रतिनिधि उदाहरण को चरण-दर-चरण हल करें.',

    practice:
      'छात्रों को स्वयं अवधारणा लागू करने दें.',

    checkUnderstanding:
      'कक्षा समाप्त होने से पहले समझ की पुष्टि करें.',
  }

function getSectionLabel(
  key: string,
  language:
    LessonLanguage,
) {
  if (
    language ===
    'hindi'
  ) {
    return (
      hindiSectionLabels[
        key
      ] ??
      lessonSectionLabels[
        key
      ] ??
      titleCase(key)
    )
  }

  return (
    lessonSectionLabels[
      key
    ] ??
    titleCase(key)
  )
}

function localizedMetaTag(
  value: string,
  language: LessonLanguage,
) {
  if (language !== 'hindi') return titleCase(value)

  const normalized = value.trim().toLowerCase().replaceAll('_', ' ')
  const labels: Record<string, string> = {
    essential: 'आवश्यक',
    mixed: 'मिश्रित',
    'source grounded': 'स्रोत-आधारित',
    generated: 'एआई-निर्मित',
    teacher: 'शिक्षक',
  }

  return labels[normalized] ?? titleCase(value)
}

function SourcePages({
  pages,
  language,
  customized = false,
}: {
  pages: number[]
  language:
    LessonLanguage
  customized?: boolean
}) {
  if (
    pages.length === 0
  ) {
    return null
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-[#e3e8e1] pt-4">
      <span className="mr-1 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#89938c]">
        {customized
          ? language === 'hindi'
            ? 'मूल स्रोत'
            : 'Original source'
          : language ===
              'hindi'
            ? 'पाठ्यपुस्तक पृष्ठ'
            : 'Source pages'}
      </span>

      {pages.map(
        (page) => (
          <span
            key={page}
            className="flex size-6 items-center justify-center rounded-full border border-[#d9e4d7] bg-[#f7faf5] text-[9px] font-extrabold text-[#176b43]"
          >
            {page}
          </span>
        ),
      )}
    </div>
  )
}

function BulletList({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  if (
    items.length === 0
  ) {
    return null
  }

  return (
    <div className="mt-5">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#68746c]">
        {title}
      </p>

      <div className="mt-3 grid gap-2">
        {items.map(
          (
            item,
            index,
          ) => (
            <div
              key={`${title}-${index}`}
              className="flex gap-3 rounded-xl bg-[#f8faf6] px-3.5 py-3 text-[12px] font-medium leading-6 text-[#4f5c53]"
            >
              <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#4c9366]" />

              <span>
                {item}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function QuestionCards({
  questions,
  language,
}: {
  questions:
    JsonRecord[]
  language:
    LessonLanguage
}) {
  const [
    revealed,
    setRevealed,
  ] =
    useState<
      Set<number>
    >(new Set())

  const sourceTexts =
    useMemo(
      () =>
        questions.flatMap(
          (item) => [
            asString(
              item.question,
            ) ?? '',
            asString(
              item
                .expectedAnswer,
            ) ??
            asString(
              item.answer,
            ) ?? '',
          ],
        ),
      [questions],
    )

  const {
    texts,
    translating,
  } =
    useLessonTranslation(
      sourceTexts,
      language,
    )

  function toggle(
    index: number,
  ) {
    setRevealed(
      (current) => {
        const next =
          new Set(current)

        if (
          next.has(index)
        ) {
          next.delete(index)
        } else {
          next.add(index)
        }

        return next
      },
    )
  }

  return (
    <div className="mt-5 grid gap-3">
      {language ===
        'hindi' &&
        translating && (
        <div className="flex items-center gap-2 text-[9px] font-bold text-[#208653]">
          <LoaderCircle className="size-3.5 animate-spin" />
          प्रश्न हिंदी में तैयार हो रहे हैं…
        </div>
      )}

      {questions.map(
        (
          item,
          index,
        ) => {
          const question =
            texts[
              index * 2
            ] ??
            asString(
              item.question,
            )

          const answer =
            texts[
              index * 2 +
                1
            ] ??
            asString(
              item
                .expectedAnswer,
            ) ??
            asString(
              item.answer,
            )

          if (!question) {
            return null
          }

          return (
            <div
              key={`${question}-${index}`}
              className="rounded-2xl border border-[#dce4da] bg-[#fbfcf9] p-4"
            >
              <div className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e6f1e3] text-[9px] font-extrabold text-[#176b43]">
                  Q{index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold leading-6">
                    {question}
                  </p>

                  {answer && (
                    <button
                      type="button"
                      onClick={() =>
                        toggle(
                          index,
                        )
                      }
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#edf5e9] px-3 py-2 text-[9px] font-extrabold text-[#176b43]"
                    >
                      <Eye className="size-3.5" />

                      {revealed.has(
                        index,
                      )
                        ? language ===
                          'hindi'
                          ? 'उत्तर छिपाएँ'
                          : 'Hide answer'
                        : language ===
                            'hindi'
                          ? 'उत्तर दिखाएँ'
                          : 'Reveal answer'}
                    </button>
                  )}

                  {answer &&
                    revealed.has(
                      index,
                    ) && (
                      <p className="mt-3 rounded-xl bg-white p-3 text-[11px] font-medium leading-5 text-[#59655d]">
                        {answer}
                      </p>
                    )}
                </div>
              </div>
            </div>
          )
        },
      )}
    </div>
  )
}

function ArraySectionCard({
  sectionKey,
  items,
  language,
}: {
  sectionKey: string
  items: string[]
  language: LessonLanguage
}) {
  const {
    texts: translatedItems,
    translating,
    error: translationError,
  } = useLessonTranslation(
    items,
    language,
  )

  return (
    <section
      id={`lesson-${sectionKey}`}
      className="scroll-mt-32 rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5"
    >
      <h2 className="text-lg font-extrabold">
        {getSectionLabel(
          sectionKey,
          language,
        )}
      </h2>

      {language === 'hindi' && translating && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff4dd] px-3 py-2 text-[9px] font-bold text-[#8d652c]">
          <LoaderCircle className="size-3.5 animate-spin" />
          यह खंड हिंदी में तैयार हो रहा है…
        </div>
      )}

      {translationError && (
        <div className="mt-4 rounded-xl border border-[#ead5d0] bg-[#fff8f6] p-3 text-[9px] font-semibold text-[#92564b]">
          {translationError}
        </div>
      )}

      <BulletList
        title={
          language === 'hindi'
            ? 'विवरण'
            : 'Items'
        }
        items={translatedItems}
      />
    </section>
  )
}

function SectionCard(props: {
  sectionKey: string
  value: unknown
  lessonKey: string
  lesson: JsonRecord
  sourceMode?: LessonSourceMode
  language: LessonLanguage
  completed: boolean
  onToggleComplete: () => void
  expandAllByDefault?: boolean
}) {
  if (Array.isArray(props.value)) {
    const items = asStringArray(props.value)
    if (items.length === 0) {
      return null
    }

    return (
      <ArraySectionCard
        sectionKey={props.sectionKey}
        items={items}
        language={props.language}
      />
    )
  }

  const section = asRecord(props.value)
  if (!section) {
    return null
  }

  return (
    <RecordSectionCard
      sectionKey={props.sectionKey}
      section={section}
      lessonKey={props.lessonKey}
      lesson={props.lesson}
      sourceMode={props.sourceMode}
      language={props.language}
      completed={props.completed}
      onToggleComplete={props.onToggleComplete}
      expandAllByDefault={props.expandAllByDefault}
    />
  )
}

function RecordSectionCard({
  sectionKey,
  section,
  lessonKey,
  lesson,
  sourceMode = 'textbook',
  language,
  completed,
  onToggleComplete,
  expandAllByDefault = false,
}: {
  sectionKey: string
  section: JsonRecord
  lessonKey: string
  lesson: JsonRecord
  sourceMode?: LessonSourceMode
  language: LessonLanguage
  completed: boolean
  onToggleComplete: () => void
  expandAllByDefault?: boolean
}) {
  const [
    expanded,
    setExpanded,
  ] =
    useState(
      expandAllByDefault ||
        sectionKey ===
          'boardPlan' ||
        sectionKey ===
          'hook' ||
        sectionKey ===
          'visualize',
    )

  const teacherCustomized =
    section.__teacherCustomized === true

  const priority =
    asString(
      section.priority,
    )

  const origin =
    asString(
      section
        .contentOrigin,
    )

  const teacherPrompt =
    asString(
      section
        .teacherPrompt,
    ) ?? ''

  const expectedResponse =
    asString(
      section
        .expectedStudentResponse,
    ) ?? ''

  const teacherScript =
    asString(
      section
        .teacherScript,
    ) ?? ''

  const instructions =
    asString(
      section
        .teacherInstructions,
    ) ?? ''

  const explanation =
    asString(
      section
        .explanation,
    ) ?? ''

  const objective =
    asString(
      section.objective,
    ) ?? ''

  const sectionTitle =
    asString(
      section.title,
    ) ?? ''

  const text =
    asString(
      section.text,
    ) ?? ''

  const safety =
    asString(
      section.safetyNote,
    ) ?? ''

  const boardWork =
    asStringArray(
      section
        .boardWork,
    )

  const keyPoints =
    asStringArray(
      section
        .keyPoints,
    )

  const concepts =
    asStringArray(
      section
        .concepts,
    )

  const materials =
    asStringArray(
      section.materials,
    ).length > 0
      ? asStringArray(section.materials)
      : asStringArray(section.items)

  const steps =
    asStringArray(
      section.steps,
    )

  const drawingSteps =
    asStringArray(
      section
        .boardDrawingSteps,
    )

  const notices =
    asStringArray(
      section
        .whatStudentsShouldNotice,
    )

  const teacherMoves =
    asStringArray(section.teacherMoves).length > 0
      ? asStringArray(section.teacherMoves)
      : asStringArray(section.teacherCues)

  const questionsToAsk =
    asStringArray(
      section
        .questionsToAsk,
    )

  const misconceptions =
    asRecordArray(
      section
        .misconceptions,
    )

  const questions =
    asRecordArray(
      section.questions,
    )

  const pages =
    asNumberArray(
      section.sourcePages,
    )

  const misconceptionTexts =
    misconceptions.flatMap(
      (item) => [
        asString(
          item
            .misconception,
        ) ?? '',
        asString(
          item.correction,
        ) ?? '',
      ],
    )

  /*
   * English keeps collapsed cards lazy. Hindi preloads every section
   * so print/export does not reveal untranslated content.
   */
  const sourceTexts =
    expanded || language === 'hindi'
      ? [
          teacherPrompt,
          expectedResponse,
          teacherScript,
          instructions,
          explanation,
          objective,
          sectionTitle,
          text,
          safety,
          ...boardWork,
          ...keyPoints,
          ...concepts,
          ...materials,
          ...steps,
          ...drawingSteps,
          ...notices,
          ...teacherMoves,
          ...questionsToAsk,
          ...misconceptionTexts,
        ]
      : []

  const {
    texts:
      translated,
    translating,
    error:
      translationError,
  } =
    useLessonTranslation(
      sourceTexts,
      language,
    )

  let cursor = 0

  const tTeacherPrompt =
    translated[cursor++] ??
    teacherPrompt

  const tExpectedResponse =
    translated[cursor++] ??
    expectedResponse

  const tTeacherScript =
    translated[cursor++] ??
    teacherScript

  const tInstructions =
    translated[cursor++] ??
    instructions

  const tExplanation =
    translated[cursor++] ??
    explanation

  const tObjective =
    translated[cursor++] ??
    objective

  const tSectionTitle =
    translated[cursor++] ??
    sectionTitle

  const tText =
    translated[cursor++] ??
    text

  const tSafety =
    translated[cursor++] ??
    safety

  function take(
    original:
      string[],
  ) {
    const values =
      translated.slice(
        cursor,
        cursor +
          original.length,
      )

    cursor +=
      original.length

    return original.map(
      (
        item,
        index,
      ) =>
        values[index] ??
        item,
    )
  }

  const tBoardWork =
    take(boardWork)

  const tKeyPoints =
    take(keyPoints)

  const tConcepts =
    take(concepts)

  const tMaterials =
    take(materials)

  const tSteps =
    take(steps)

  const tDrawingSteps =
    take(drawingSteps)

  const tNotices =
    take(notices)

  const tTeacherMoves =
    take(teacherMoves)

  const tQuestionsToAsk =
    take(
      questionsToAsk,
    )

  const translatedMisconceptions =
    misconceptions.map(
      (
        item,
      ) => {
        const originalMisconception =
          asString(
            item
              .misconception,
          ) ?? ''

        const originalCorrection =
          asString(
            item.correction,
          ) ?? ''

        const translatedMisconception =
          translated[
            cursor++
          ] ??
          originalMisconception

        const translatedCorrection =
          translated[
            cursor++
          ] ??
          originalCorrection

        return {
          misconception:
            translatedMisconception,
          correction:
            translatedCorrection,
        }
      },
    )

  const label =
    getSectionLabel(
      sectionKey,
      language,
    )

  return (
    <section
      id={`lesson-${sectionKey}`}
      className="scroll-mt-32 overflow-hidden rounded-[24px] border border-[#dce4da] border-l-4 border-l-[#176b43] bg-[#fffef9] shadow-[0_8px_26px_rgba(22,66,39,0.04)]"
    >
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <button
          type="button"
          onClick={
            onToggleComplete
          }
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border ${
            completed
              ? 'border-[#176b43] bg-[#176b43] text-white'
              : 'border-[#ced9cc] bg-white text-[#89948c]'
          }`}
        >
          {completed ? (
            <Check className="size-4" />
          ) : (
            <span className="size-2 rounded-full border border-current" />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setExpanded(
              (current) =>
                !current,
            )
          }
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
              {language ===
              'hindi'
                ? 'शिक्षण खंड'
                : 'Teaching block'}
            </span>

            {priority && (
              <span className="rounded-full bg-[#edf5e9] px-2 py-1 text-[8px] font-extrabold text-[#176b43]">
                {localizedMetaTag(priority, language)}
              </span>
            )}

            {origin && (
              <span className="rounded-full border border-[#dce4da] px-2 py-1 text-[8px] font-extrabold text-[#718077]">
                {localizedMetaTag(origin, language)}
              </span>
            )}


            {teacherCustomized && (
              <span className="rounded-full bg-[#fff2c7] px-2 py-1 text-[8px] font-extrabold text-[#7a5b12]">
                {language === 'hindi'
                  ? 'शिक्षक बदलाव'
                  : 'Teacher customized'}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-[-0.025em]">
              {label}
            </h2>

            <ChevronDown
              className={`size-4 transition-transform ${
                expanded
                  ? 'rotate-180'
                  : ''
              }`}
            />
          </div>
        </button>
      </div>

      <div data-chalkbox-section-body="" className={expanded ? 'block' : 'hidden print:block'}>
        <div className="border-t border-[#e7ebe5] px-5 pb-6 sm:px-6">
          {language ===
            'hindi' &&
            translating && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff4dd] px-3 py-2 text-[9px] font-bold text-[#8d652c]">
              <LoaderCircle className="size-3.5 animate-spin" />
              यह खंड हिंदी में तैयार हो रहा है…
            </div>
          )}

          {translationError && (
            <div className="mt-4 rounded-xl border border-[#ead5d0] bg-[#fff8f6] p-3 text-[9px] font-semibold text-[#92564b]">
              {translationError}
            </div>
          )}

          {sectionKey ===
            'visualize' && (
            <div className="mt-5">
              <LessonVisual
                lessonKey={
                  lessonKey
                }
                lesson={lesson}
                sourceMode={sourceMode}
                language={language}
              />
            </div>
          )}

          {tTeacherPrompt && (
            <div className="mt-5 rounded-2xl border border-[#d6e4d3] bg-[#f1f7ee] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#176b43]" />

                <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                  {language ===
                  'hindi'
                    ? 'यह कहें'
                    : 'Say this'}
                </p>
              </div>

              <p className="mt-3 text-[14px] font-semibold leading-7">
                “{tTeacherPrompt}”
              </p>
            </div>
          )}

          {tExpectedResponse && (
            <div className="mt-3 rounded-xl bg-[#fafbf8] p-4">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#818c84]">
                {language ===
                'hindi'
                  ? 'छात्रों के उत्तर में यह सुनें'
                  : 'Listen for'}
              </p>

              <p className="mt-2 text-[11px] font-medium leading-5">
                {tExpectedResponse}
              </p>
            </div>
          )}

          {tTeacherScript && (
            <div className="mt-5">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#58665c]">
                {language ===
                'hindi'
                  ? 'शिक्षक स्क्रिप्ट'
                  : 'Teacher script'}
              </p>

              <p className="mt-3 whitespace-pre-line text-[13px] font-medium leading-7 text-[#48554c]">
                {tTeacherScript}
              </p>
            </div>
          )}

          {tInstructions && (
            <p className="mt-5 rounded-xl bg-[#f5f8f2] p-4 text-[12px] font-medium leading-6">
              {tInstructions}
            </p>
          )}

          {tSectionTitle && (
            <p className="mt-5 text-[12px] font-extrabold leading-6 text-[#263229]">
              {tSectionTitle}
            </p>
          )}

          {tExplanation && (
            <p className="mt-5 text-[12px] font-medium leading-6 text-[#48554c]">
              {tExplanation}
            </p>
          )}

          {tObjective && (
            <div className="mt-5 border-l-4 border-[#176b43] bg-[#f6f9f4] p-4">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#208653]">
                {language ===
                'hindi'
                  ? 'उद्देश्य'
                  : 'Objective'}
              </p>

              <p className="mt-2 text-[12px] font-semibold leading-6">
                {tObjective}
              </p>
            </div>
          )}

          {tText && (
            <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#132b20] p-5 font-mono text-[11px] leading-6 text-[#edf6eb]">
              {tText}
            </pre>
          )}

          <BulletList
            title={
              language ===
              'hindi'
                ? 'बोर्ड पर लिखें'
                : 'Board work'
            }
            items={
              tBoardWork
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'मुख्य बिंदु'
                : 'Key points'
            }
            items={
              tKeyPoints
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'अवधारणाएँ'
                : 'Concepts'
            }
            items={
              tConcepts
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'सामग्री'
                : 'Materials'
            }
            items={
              tMaterials
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'चरण'
                : 'Steps'
            }
            items={tSteps}
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'चित्र बनाने के चरण'
                : 'Drawing steps'
            }
            items={
              tDrawingSteps
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'छात्रों को क्या ध्यान देना चाहिए'
                : 'What students should notice'
            }
            items={
              tNotices
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'शिक्षक की गतिविधियाँ'
                : 'Teacher moves'
            }
            items={
              tTeacherMoves
            }
          />

          <BulletList
            title={
              language ===
              'hindi'
                ? 'पूछने वाले प्रश्न'
                : 'Questions to ask'
            }
            items={
              tQuestionsToAsk
            }
          />

          {translatedMisconceptions.length >
            0 && (
            <div className="mt-5 space-y-3">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#94672e]">
                {language ===
                'hindi'
                  ? 'सामान्य गलत धारणाएँ'
                  : 'Misconceptions'}
              </p>

              {translatedMisconceptions.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#eadcc9] bg-[#fff9ef] p-4"
                  >
                    <p className="text-[11px] font-bold">
                      {
                        item.misconception
                      }
                    </p>

                    <p className="mt-2 text-[11px] font-medium leading-5 text-[#5f655f]">
                      <strong className="text-[#176b43]">
                        {language ===
                        'hindi'
                          ? 'सही समझ: '
                          : 'Correction: '}
                      </strong>

                      {
                        item.correction
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
          )}

          {questions.length >
            0 && (
            <QuestionCards
              questions={
                questions
              }
              language={
                language
              }
            />
          )}

          {tSafety && (
            <div className="mt-5 rounded-xl border border-[#eadcc9] bg-[#fff9ef] p-4">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#94672e]">
                {language ===
                'hindi'
                  ? 'सुरक्षा'
                  : 'Safety'}
              </p>

              <p className="mt-2 text-[11px] font-medium leading-5">
                {tSafety}
              </p>
            </div>
          )}

          <SourcePages
            pages={pages}
            language={
              language
            }
            customized={teacherCustomized}
          />
        </div>
      </div>
    </section>
  )
}

function LessonReferenceView({
  lesson,
  lessonKey,
  language,
  durationMinutes,
  resourceLevel,
  sourceMode = 'textbook',
  formulas: providedFormulas,
  completedSections,
  onToggleComplete,
  expandAllByDefault = false,
}: Props) {
  const formulas =
    providedFormulas ??
    getFormulaCards(
      lessonKey,
    )

  const formulaTranslationInput =
    useMemo(
      () =>
        formulas.flatMap(
          (formula) => [
            formula.label,
            formula.note,
          ],
        ),
      [formulas],
    )

  const {
    texts: translatedFormulaTexts,
  } = useLessonTranslation(
    formulaTranslationInput,
    language,
  )

  let formulaTranslationCursor = 0
  const translatedFormulas =
    formulas.map(
      (formula) => ({
        ...formula,
        label:
          translatedFormulaTexts[
            formulaTranslationCursor++
          ] ?? formula.label,
        note:
          translatedFormulaTexts[
            formulaTranslationCursor++
          ] ?? formula.note,
      }),
    )

  const entries =
    getOrderedLessonSections(
      lesson,
      resourceLevel,
    )

  const flowItems =
    buildLessonFlowItems(
      durationMinutes,
    )

  const resourceStrategy =
    getResourceStrategy(
      resourceLevel,
      language,
      sourceMode,
    )

  function scrollTo(
    key: string,
  ) {
    const target =
      document.getElementById(
        `lesson-${key}`,
      )

    if (!target) {
      return
    }

    const stickyHeader =
      document.querySelector<HTMLElement>(
        'header.sticky',
      )
    const headerHeight =
      stickyHeader?.getBoundingClientRect().height ?? 0
    const top = Math.max(
      0,
      target.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        16,
    )

    // The previous smooth scroll could fight the sticky product shell/grid and
    // briefly paint a blank layout. A deterministic offset scroll is stable.
    window.scrollTo({
      top,
      behavior: 'auto',
    })
  }

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 print:block print:max-w-none print:px-0">
      <aside className="hidden lg:block print:hidden">
        <div className="sticky top-[145px] rounded-[22px] border border-[#dce4da] bg-[#fffef9] p-4">
          <p className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
            {language ===
            'hindi'
              ? 'पाठ प्रवाह'
              : 'Lesson flow'}
          </p>

          <div className="relative mt-4">
            {entries.length > 1 && (
              <span
                aria-hidden="true"
                className="absolute bottom-4 left-[16px] top-4 w-px bg-[#cfdccd]"
              />
            )}

            <div className="relative space-y-1">
              {entries.map(
                ([
                  key,
                ]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      scrollTo(
                        key,
                      )
                    }
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[10px] font-bold text-[#5d6961] hover:bg-[#edf5e9]"
                  >
                    <span
                      className={`relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        completedSections.has(
                          key,
                        )
                          ? 'border-[#176b43] bg-[#176b43] text-white'
                          : 'border-[#b8cbb9] bg-[#fffef9] group-hover:border-[#6fa27d]'
                      }`}
                    >
                      {completedSections.has(
                        key,
                      ) && (
                        <Check className="size-2.5" />
                      )}
                    </span>

                    {getSectionLabel(
                      key,
                      language,
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="rounded-[26px] border border-[#d8e4d6] bg-[#fffef9] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                {language ===
                'hindi'
                  ? 'लाइव कक्षा योजना'
                  : 'Live class plan'}
              </p>

              <h2 className="mt-1 text-xl font-extrabold">
                {language ===
                'hindi'
                  ? `आपकी ${durationMinutes}-मिनट की शिक्षण योजना`
                  : `Your ${durationMinutes}-minute teaching flow`}
              </h2>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#edf5e9] px-3 py-2 text-[9px] font-extrabold text-[#176b43]">
              <Clock3 className="size-3.5" />

              {durationMinutes} {language === 'hindi' ? 'मिनट' : 'min'}
            </span>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {flowItems.map(
              (
                item,
                index,
              ) => (
                <button
                  key={
                    item.key
                  }
                  type="button"
                  onClick={() =>
                    scrollTo(
                      item.key,
                    )
                  }
                  className="rounded-2xl border border-[#e0e6de] bg-[#fafbf8] p-4 text-left transition-all hover:-translate-y-1 hover:bg-white hover:shadow-md"
                >
                  <div className="flex justify-between">
                    <span className="font-bold text-[#176b43]">
                      {index + 1}
                    </span>

                    <span className="text-[9px] font-extrabold text-[#208653]">
                      {
                        item.minutes
                      }
                    </span>
                  </div>

                  <p className="mt-3 text-[12px] font-extrabold">
                    {getSectionLabel(
                      item.key,
                      language,
                    )}
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-[#778178]">
                    {language ===
                    'hindi'
                      ? hindiFlowDescriptions[
                          item.key
                        ] ??
                        item.description
                      : item.description}
                  </p>
                </button>
              ),
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#d8e4d6] bg-[#f7faf5] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
                {language ===
                'hindi'
                  ? 'कक्षा अनुकूलन'
                  : 'Classroom adaptation'}
              </p>

              <h2 className="mt-1 text-lg font-extrabold">
                {resourceStrategy.title}
              </h2>
            </div>

            <span className="rounded-full bg-[#e4efe2] px-3 py-1.5 text-[9px] font-extrabold text-[#176b43]">
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

          <p className="mt-3 text-[11px] font-medium leading-6 text-[#59655d]">
            {resourceStrategy.description}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {resourceStrategy.tips.map(
              (tip) => (
                <div
                  key={tip}
                  className="rounded-xl bg-white p-3 text-[10px] font-semibold leading-5 text-[#566159]"
                >
                  {tip}
                </div>
              ),
            )}
          </div>
        </section>

        {formulas.length >
          0 && (
          <section className="rounded-[26px] bg-[#0f5132] p-5 text-white sm:p-6">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#afd1b8]">
              {language ===
              'hindi'
                ? 'सूत्र'
                : 'Formula deck'}
            </p>

            <h2 className="mt-1 text-xl font-extrabold">
              {language ===
              'hindi'
                ? 'इन्हें बोर्ड पर रखें'
                : 'Keep these on the board'}
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {translatedFormulas.map(
                (
                  formula,
                ) => (
                  <div
                    key={
                      formula.label
                    }
                    className="rounded-2xl border border-white/15 bg-white/[0.08] p-4"
                  >
                    <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#b7d8bf]">
                      {
                        formula.label
                      }
                    </p>

                    <p className="mt-3 font-serif text-xl font-extrabold tracking-tight">
                      {
                        formatFormulaText(
                          formula.formula,
                        )
                      }
                    </p>

                    <p className="mt-2 text-[9px] text-[#c7ddcc]">
                      {
                        formatFormulaText(
                          formula.note,
                        )
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        {entries.map(
          ([
            key,
            value,
          ]) => (
            <SectionCard
              key={key}
              sectionKey={key}
              value={value}
              lessonKey={
                lessonKey
              }
              lesson={lesson}
              sourceMode={sourceMode}
              language={
                language
              }
              completed={completedSections.has(
                key,
              )}
              onToggleComplete={() =>
                onToggleComplete(
                  key,
                )
              }
              expandAllByDefault={expandAllByDefault}
            />
          ),
        )}
      </div>
    </div>
  )
}

export default LessonReferenceView