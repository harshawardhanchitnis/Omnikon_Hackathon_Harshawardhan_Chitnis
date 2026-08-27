import {
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  LoaderCircle,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react'
import {
  useMemo,
} from 'react'

import VoiceControls from '@/components/lesson/VoiceControls'
import {
  useLessonTranslation,
} from '@/hooks/useLessonTranslation'
import {
  asRecord,
  asRecordArray,
  asString,
  asStringArray,
  type JsonRecord,
} from '@/lib/lessonExperience'
import type {
  LessonLanguage,
} from '@/lib/lessonLanguage'
import {
  getClassroomActivity,
  getResourceStrategy,
  type LessonSourceMode,
  type ResourceLevel,
} from '@/lib/lessonPresentation'

type Props = {
  lesson: JsonRecord
  resourceLevel:
    ResourceLevel
  sourceMode?:
    LessonSourceMode
  language:
    LessonLanguage
}

type CheckItem = {
  question: string
  answer: string
}

function QuickTeachView({
  lesson,
  resourceLevel,
  sourceMode = 'textbook',
  language,
}: Props) {
  const content =
    useMemo(() => {
      const hook =
        asRecord(
          lesson.hook,
        )

      const quickIdeas =
        asRecord(
          lesson.quickIdeas,
        )

      const analogy =
        asRecord(
          quickIdeas
            ?.analogy,
        )

      const activity =
        getClassroomActivity(
          lesson,
          resourceLevel,
        )

      const resourceStrategy =
        getResourceStrategy(
          resourceLevel,
          'english',
          sourceMode,
        )

      const rawChecks =
        asRecordArray(
          quickIdeas
            ?.quickChecks,
        )

      const checks:
        CheckItem[] =
        rawChecks
          .map(
            (item) => {
              const question =
                asString(
                  item.question,
                )

              const answer =
                asString(
                  item
                    .expectedAnswer,
                )

              if (
                !question ||
                !answer
              ) {
                return null
              }

              return {
                question,
                answer,
              }
            },
          )
          .filter(
            (
              item,
            ): item is CheckItem =>
              item !== null,
          )

      return {
        hook:
          asString(
            hook
              ?.teacherPrompt,
          ) ?? '',

        hookResponse:
          asString(
            hook
              ?.expectedStudentResponse,
          ) ?? '',

        analogy:
          asString(
            analogy?.text,
          ) ?? '',

        activityTitle:
          asString(
            activity?.title,
          ) ??
          'Low-resource activity',

        activityObjective:
          asString(
            activity
              ?.objective,
          ) ?? '',

        activitySteps: [
          ...asStringArray(
            activity?.steps,
          ).slice(0, 4),
          ...resourceStrategy.tips
            .slice(0, 1)
            .map(
              (tip) =>
                `Resource adaptation: ${tip}`,
            ),
        ],

        checks,
      }
    }, [
      lesson,
      resourceLevel,
      sourceMode,
    ])

  const sourceTexts =
    useMemo(
      () => [
        content.hook,
        content.hookResponse,
        content.analogy,
        content.activityTitle,
        content.activityObjective,
        ...content.activitySteps,
        ...content.checks.flatMap(
          (item) => [
            item.question,
            item.answer,
          ],
        ),
      ],
      [content],
    )

  const {
    texts,
    translating,
    error,
  } =
    useLessonTranslation(
      sourceTexts,
      language,
    )

  const hook =
    texts[0] ??
    content.hook

  const hookResponse =
    texts[1] ??
    content.hookResponse

  const analogy =
    texts[2] ??
    content.analogy

  const activityTitle =
    texts[3] ??
    content.activityTitle

  const activityObjective =
    texts[4] ??
    content.activityObjective

  const stepsStart = 5

  const translatedSteps =
    texts.slice(
      stepsStart,
      stepsStart +
        content.activitySteps
          .length,
    )

  const checksStart =
    stepsStart +
    content.activitySteps
      .length

  const translatedChecks =
    content.checks.map(
      (
        item,
        index,
      ) => ({
        question:
          texts[
            checksStart +
              index * 2
          ] ??
          item.question,

        answer:
          texts[
            checksStart +
              index * 2 +
              1
          ] ??
          item.answer,
      }),
    )

  return (
    <div className="mx-auto max-w-[1050px] space-y-5 px-4 py-7 sm:px-6">
      <div className="rounded-[28px] border border-[#d8e4d6] bg-[#edf5e9] p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#176b43] text-white">
            <Sparkles className="size-5" />
          </div>

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
              {language ===
              'hindi'
                ? 'त्वरित तैयारी'
                : 'Quick Teach'}
            </p>

            <h2 className="mt-1 text-xl font-extrabold">
              {language ===
              'hindi'
                ? 'कक्षा के लिए जरूरी बातें'
                : 'The essentials at a glance'}
            </h2>
          </div>
        </div>

        {language ===
          'hindi' &&
          translating && (
          <div className="mt-4 flex items-center gap-2 text-[9px] font-extrabold text-[#176b43]">
            <LoaderCircle className="size-3.5 animate-spin" />
            हिंदी तैयार हो रही है…
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-[#ead5d0] bg-[#fff8f6] p-3 text-[9px] font-semibold text-[#92564b]">
            {error}
          </div>
        )}
      </div>

      {hook && (
        <section className="rounded-[24px] border border-[#e4d8bd] bg-[#fffaf1] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#946c31]">
            <Lightbulb className="size-4" />

            <p className="text-[9px] font-extrabold uppercase tracking-[0.13em]">
              {language ===
              'hindi'
                ? 'इससे शुरू करें'
                : 'Start with this'}
            </p>
          </div>

          <p className="mt-4 text-[15px] font-bold leading-7 text-[#41392e]">
            “{hook}”
          </p>

          {hookResponse && (
            <div className="mt-4 rounded-xl bg-white/70 p-4">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#8b7657]">
                {language ===
                'hindi'
                  ? 'छात्रों से यह सुनें'
                  : 'Listen for'}
              </p>

              <p className="mt-2 text-[11px] font-medium leading-5 text-[#625b51]">
                {
                  hookResponse
                }
              </p>
            </div>
          )}

          <div className="mt-4">
            <VoiceControls
              text={`${hook}. ${hookResponse}`}
              language={
                language
              }
            />
          </div>
        </section>
      )}

      {analogy && (
        <section className="rounded-[24px] border border-[#d7dfec] bg-[#f5f8fd] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#486b87]">
            <MessageCircleQuestion className="size-4" />

            <p className="text-[9px] font-extrabold uppercase tracking-[0.13em]">
              {language ===
              'hindi'
                ? 'सरल उदाहरण'
                : 'Use this analogy'}
            </p>
          </div>

          <p className="mt-4 text-[13px] font-semibold leading-7 text-[#44525e]">
            {analogy}
          </p>

          <div className="mt-4">
            <VoiceControls
              text={analogy}
              language={
                language
              }
            />
          </div>
        </section>
      )}

      {activityTitle && (
        <section className="rounded-[24px] border border-[#cfe0d2] bg-[#f4f9f2] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#176b43]">
            <FlaskConical className="size-4" />

            <p className="text-[9px] font-extrabold uppercase tracking-[0.13em]">
              {resourceLevel ===
              'low'
                ? language ===
                  'hindi'
                  ? 'कम संसाधन गतिविधि'
                  : 'Low-resource activity'
                : resourceLevel ===
                    'well'
                  ? language ===
                    'hindi'
                    ? 'सुविधा-संपन्न गतिविधि'
                    : 'Well-equipped activity'
                  : language ===
                      'hindi'
                    ? 'कक्षा गतिविधि'
                    : 'Classroom activity'}
            </p>
          </div>

          <p className="mt-3 rounded-xl bg-white/75 p-3 text-[10px] font-semibold leading-5 text-[#5b675f]">
            {
              getResourceStrategy(
                resourceLevel,
                language,
                sourceMode,
              ).description
            }
          </p>

          <h3 className="mt-3 text-lg font-extrabold">
            {
              activityTitle
            }
          </h3>

          {activityObjective && (
            <p className="mt-2 text-[12px] font-medium leading-6 text-[#5b675f]">
              {
                activityObjective
              }
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {translatedSteps.map(
              (
                step,
                index,
              ) => (
                <div
                  key={`${step}-${index}`}
                  className="flex gap-3 rounded-xl bg-white p-4"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#e4efe2] text-[9px] font-extrabold text-[#176b43]">
                    {index + 1}
                  </span>

                  <p className="text-[11px] font-medium leading-5 text-[#59655d]">
                    {step}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-4">
            <VoiceControls
              text={[
                activityTitle,
                activityObjective,
                ...translatedSteps,
              ].join('. ')}
              language={
                language
              }
            />
          </div>
        </section>
      )}

      {translatedChecks.length >
        0 && (
        <section className="rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[#176b43]" />

            <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#176b43]">
              {language ===
              'hindi'
                ? 'त्वरित जाँच'
                : 'Quick checks'}
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            {translatedChecks.map(
              (
                check,
                index,
              ) => (
                <details
                  key={`${check.question}-${index}`}
                  className="rounded-xl border border-[#dfe6dc] bg-[#fafbf8] p-4"
                >
                  <summary className="cursor-pointer text-[12px] font-bold leading-6">
                    {index + 1}.{' '}
                    {check.question}
                  </summary>

                  <p className="mt-3 rounded-xl bg-white p-3 text-[11px] font-medium leading-5 text-[#5b675f]">
                    {check.answer}
                  </p>
                </details>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default QuickTeachView