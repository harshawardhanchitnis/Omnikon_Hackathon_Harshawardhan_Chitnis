import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  MessageCircleQuestion,
  RefreshCcw,
  Target,
} from 'lucide-react'
import { useMemo } from 'react'

import LessonVisual from '@/components/lesson/LessonVisual'
import VoiceControls from '@/components/lesson/VoiceControls'
import { useLessonTranslation } from '@/hooks/useLessonTranslation'
import {
  asRecord,
  asString,
  asStringArray,
  type JsonRecord,
} from '@/lib/lessonExperience'
import type { LessonLanguage } from '@/lib/lessonLanguage'

type Props = {
  lesson: JsonRecord
  lessonKey: string
  language: LessonLanguage
}

type FocusedContent = {
  teachingGoal: string
  boardPlan: string
  explainSimply: string
  visualOrAnalogy: string
  example: string
  activity: string
  misconception: string
  correction: string
  quickQuestion: string
  quickAnswer: string
  reteachSteps: string[]
}

function buildFocusedContent(
  lesson: JsonRecord,
): FocusedContent {
  const focused =
    asRecord(lesson.focusedHelp) ?? {}
  const fullLesson =
    asRecord(lesson.fullLesson) ?? {}
  const boardPlan =
    asRecord(fullLesson.boardPlan) ?? {}
  const explain =
    asRecord(fullLesson.explain) ?? {}
  const visualize =
    asRecord(fullLesson.visualize) ?? {}
  const example =
    asRecord(fullLesson.example) ?? {}
  const activity =
    asRecord(fullLesson.activity) ?? {}
  const howToTeach =
    asRecord(fullLesson.howToTeach) ?? {}
  const check =
    asRecord(fullLesson.checkUnderstanding) ?? {}

  const misconceptionItems = Array.isArray(
    howToTeach.misconceptions,
  )
    ? howToTeach.misconceptions
    : []
  const firstMisconception =
    asRecord(misconceptionItems[0]) ?? {}

  const questions = Array.isArray(
    check.questions,
  )
    ? check.questions
    : []
  const firstQuestion =
    asRecord(questions[0]) ?? {}

  const objectives =
    asStringArray(lesson.learningObjectives)

  return {
    teachingGoal:
      asString(focused.teachingGoal) ??
      objectives[0] ??
      'Clarify the requested Science concept.',
    boardPlan:
      asString(focused.boardPlan) ??
      asString(boardPlan.text) ??
      '',
    explainSimply:
      asString(focused.explainSimply) ??
      asString(explain.teacherScript) ??
      '',
    visualOrAnalogy:
      asString(focused.visualOrAnalogy) ??
      asString(visualize.teacherInstructions) ??
      '',
    example:
      asString(focused.example) ??
      asString(example.explanation) ??
      asString(example.title) ??
      '',
    activity:
      asString(focused.activity) ??
      asString(activity.objective) ??
      asString(activity.title) ??
      '',
    misconception:
      asString(
        asRecord(focused.commonMisconception)
          ?.misconception,
      ) ??
      asString(firstMisconception.misconception) ??
      '',
    correction:
      asString(
        asRecord(focused.commonMisconception)
          ?.correction,
      ) ??
      asString(firstMisconception.correction) ??
      '',
    quickQuestion:
      asString(
        asRecord(focused.quickCheck)
          ?.question,
      ) ??
      asString(firstQuestion.question) ??
      '',
    quickAnswer:
      asString(
        asRecord(focused.quickCheck)
          ?.expectedAnswer,
      ) ??
      asString(firstQuestion.expectedAnswer) ??
      '',
    reteachSteps:
      asStringArray(focused.reteachSteps).length > 0
        ? asStringArray(focused.reteachSteps).slice(0, 4)
        : asStringArray(howToTeach.teacherMoves).slice(0, 4),
  }
}

function FocusedTeachingView({
  lesson,
  lessonKey,
  language,
}: Props) {
  const content = useMemo(
    () => buildFocusedContent(lesson),
    [lesson],
  )

  const sourceTexts = useMemo(
    () => [
      content.teachingGoal,
      content.boardPlan,
      content.explainSimply,
      content.visualOrAnalogy,
      content.example,
      content.activity,
      content.misconception,
      content.correction,
      content.quickQuestion,
      content.quickAnswer,
      ...content.reteachSteps,
    ],
    [content],
  )

  const { texts, translating, error } =
    useLessonTranslation(
      sourceTexts,
      language,
    )

  let cursor = 0
  const teachingGoal = texts[cursor++] ?? content.teachingGoal
  const boardPlan = texts[cursor++] ?? content.boardPlan
  const explainSimply = texts[cursor++] ?? content.explainSimply
  const visualOrAnalogy = texts[cursor++] ?? content.visualOrAnalogy
  const example = texts[cursor++] ?? content.example
  const activity = texts[cursor++] ?? content.activity
  const misconception = texts[cursor++] ?? content.misconception
  const correction = texts[cursor++] ?? content.correction
  const quickQuestion = texts[cursor++] ?? content.quickQuestion
  const quickAnswer = texts[cursor++] ?? content.quickAnswer
  const reteachSteps = content.reteachSteps.map(
    (item) => texts[cursor++] ?? item,
  )

  const voiceText = [
    teachingGoal,
    explainSimply,
    visualOrAnalogy,
    example,
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 px-4 py-7 sm:px-6">
      <section className="rounded-[28px] border border-[#cfe0cd] bg-[#edf5e9] p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[760px]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
              {language === 'hindi'
                ? 'केंद्रित शिक्षण सहायता'
                : 'Focused teaching help'}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
              {language === 'hindi'
                ? 'एक शिक्षण समस्या, सीधा समाधान'
                : 'One teaching problem, solved directly'}
            </h2>
            <p className="mt-3 text-[12px] font-medium leading-6 text-[#526057]">
              {language === 'hindi'
                ? 'यह पूरा अध्याय नहीं है। यह आपके चुने हुए कॉन्सेप्ट या गलतफहमी पर केंद्रित है।'
                : 'This is intentionally compact: it stays on the exact concept, misconception or explanation you asked for.'}
            </p>
          </div>

          <VoiceControls
            text={voiceText}
            language={language}
          />
        </div>

        {language === 'hindi' && translating && (
          <p className="mt-4 text-[9px] font-extrabold text-[#176b43]">
            हिंदी तैयार हो रही है…
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-[#ead5d0] bg-[#fff8f6] p-3 text-[9px] font-semibold text-[#92564b]">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5">
          <div className="flex items-center gap-2 text-[#176b43]">
            <Target className="size-4" />
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
              {language === 'hindi' ? 'शिक्षण लक्ष्य' : 'Teaching goal'}
            </p>
          </div>
          <p className="mt-3 text-[14px] font-semibold leading-7 text-[#39463e]">
            {teachingGoal}
          </p>
        </article>

        <article className="rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5">
          <div className="flex items-center gap-2 text-[#176b43]">
            <Lightbulb className="size-4" />
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
              {language === 'hindi' ? 'बोर्ड योजना' : 'Board plan'}
            </p>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-[#132b20] p-4 font-mono text-[10px] leading-5 text-[#edf6eb]">
            {boardPlan}
          </pre>
        </article>
      </section>

      <section className="rounded-[26px] border border-[#dce4da] bg-[#fffef9] p-5 sm:p-6">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
          {language === 'hindi' ? 'सरल तरीके से समझाएँ' : 'Explain simply'}
        </p>
        <p className="mt-3 whitespace-pre-line text-[15px] font-semibold leading-8 text-[#344139]">
          {explainSimply}
        </p>
      </section>

      <section className="space-y-4 rounded-[26px] border border-[#dce4da] bg-[#fffef9] p-5 sm:p-6">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
            {language === 'hindi' ? 'दृश्य / उपमा' : 'Visual / analogy'}
          </p>
          {visualOrAnalogy && (
            <p className="mt-3 text-[12px] font-medium leading-6 text-[#526057]">
              {visualOrAnalogy}
            </p>
          )}
        </div>

        <LessonVisual
          lessonKey={lessonKey}
          lesson={lesson}
          sourceMode="topic"
          language={language}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
            {language === 'hindi' ? 'उदाहरण' : 'Example'}
          </p>
          <p className="mt-3 text-[12px] font-medium leading-6 text-[#455249]">
            {example}
          </p>
        </article>

        <article className="rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
            {language === 'hindi' ? 'त्वरित गतिविधि' : 'Quick activity'}
          </p>
          <p className="mt-3 text-[12px] font-medium leading-6 text-[#455249]">
            {activity}
          </p>
        </article>
      </section>

      {(misconception || correction) && (
        <section className="rounded-[24px] border border-[#eadcc9] bg-[#fff9ef] p-5">
          <div className="flex items-center gap-2 text-[#94672e]">
            <AlertCircle className="size-4" />
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
              {language === 'hindi' ? 'सामान्य गलतफहमी' : 'Common misconception'}
            </p>
          </div>
          <p className="mt-3 text-[13px] font-bold leading-6">{misconception}</p>
          {correction && (
            <p className="mt-2 text-[12px] font-medium leading-6 text-[#596159]">
              <strong className="text-[#176b43]">
                {language === 'hindi' ? 'सही समझ: ' : 'Correction: '}
              </strong>
              {correction}
            </p>
          )}
        </section>
      )}

      {(quickQuestion || quickAnswer) && (
        <section className="rounded-[24px] border border-[#d6e4d3] bg-[#f1f7ee] p-5">
          <div className="flex items-center gap-2 text-[#176b43]">
            <MessageCircleQuestion className="size-4" />
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
              {language === 'hindi' ? 'त्वरित जाँच' : 'Quick check'}
            </p>
          </div>
          <p className="mt-3 text-[14px] font-extrabold leading-7">{quickQuestion}</p>
          {quickAnswer && (
            <p className="mt-3 rounded-xl bg-white p-4 text-[11px] font-medium leading-6 text-[#526057]">
              <strong className="text-[#176b43]">
                {language === 'hindi' ? 'अपेक्षित उत्तर: ' : 'Expected answer: '}
              </strong>
              {quickAnswer}
            </p>
          )}
        </section>
      )}

      {reteachSteps.length > 0 && (
        <section className="rounded-[24px] border border-[#dce4da] bg-[#fffef9] p-5">
          <div className="flex items-center gap-2 text-[#176b43]">
            <RefreshCcw className="size-4" />
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]">
              {language === 'hindi'
                ? 'अगर फिर भी समझ न आए'
                : "If they still don't get it"}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reteachSteps.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex gap-3 rounded-xl bg-[#f7faf5] p-4 text-[11px] font-medium leading-6 text-[#526057]"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#176b43] text-[9px] font-extrabold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 rounded-xl bg-[#edf5e9] px-4 py-3 text-[9px] font-bold text-[#176b43]">
        <CheckCircle2 className="size-4" />
        {language === 'hindi'
          ? 'केंद्रित सहायता तैयार — यह जानबूझकर एक ही शिक्षण समस्या पर केंद्रित है।'
          : 'Focused help ready — intentionally limited to the one teaching problem you asked about.'}
      </div>
    </div>
  )
}

export default FocusedTeachingView
