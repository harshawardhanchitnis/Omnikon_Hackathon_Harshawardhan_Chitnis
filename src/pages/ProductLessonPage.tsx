import { ArrowLeft, CheckCircle2, Lightbulb, MessageSquareText, MonitorUp, Printer, SlidersHorizontal, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import '@/styles/product-print-final.css'

import CustomizePlanPanel from '@/components/lesson/CustomizePlanPanel'
import FocusedTeachingView from '@/components/lesson/FocusedTeachingView'
import LessonFlashcards from '@/components/lesson/LessonFlashcards'
import LessonReferenceView from '@/components/lesson/LessonReferenceView'
import PresentMode from '@/components/lesson/PresentMode'
import QuickTeachView from '@/components/lesson/QuickTeachView'
import TeachMode from '@/components/lesson/TeachMode'
import ProductShell from '@/components/product/ProductShell'
import { useLessonCustomizations } from '@/hooks/useLessonCustomizations'
import { useLessonTranslation } from '@/hooks/useLessonTranslation'
import {
  asRecord,
  asString,
  type FormulaLike,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'
import type { ResourceLevel } from '@/lib/lessonPresentation'
import { getCloudPlan, type CloudPlan } from '@/lib/productCloud'

type Mode = 'full' | 'teach' | 'quick' | 'flashcards' | 'customize'
const empty: JsonRecord = {}

function arrayFormulas(value: unknown): FormulaLike[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is FormulaLike => {
    const row = asRecord(item)
    return Boolean(row && asString(row.label) && asString(row.formula) && asString(row.note))
  })
}

export default function ProductLessonPage() {
  const { planId = '' } = useParams()
  const [plan, setPlan] = useState<CloudPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('full')
  const [presenting, setPresenting] = useState(false)
  const [completedSections, setCompletedSections] = useState<Set<string>>(() => new Set())

  useEffect(() => { getCloudPlan(planId).then(setPlan).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load lesson.')) }, [planId])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [planId])

  const originalLesson = useMemo(() => asRecord(plan?.payload.lesson) ?? empty, [plan])
  const formulas = useMemo(() => arrayFormulas(plan?.payload.formulaCards), [plan])
  const request = useMemo(() => asRecord(plan?.payload.request) ?? {}, [plan])
  const language = (asString(request.language) === 'hindi' ? 'hindi' : 'english') as LessonLanguage
  const resourceLevel = (['low', 'standard', 'well'].includes(asString(request.resourceLevel) ?? '') ? asString(request.resourceLevel) : 'low') as ResourceLevel
  const duration = typeof request.durationMinutes === 'number' ? request.durationMinutes : plan?.duration_minutes ?? 40
  const lessonKey = `cloud-${planId}`

  const {
    lesson,
    customizations,
    customized,
    saveSection,
    resetSection,
    resetAll,
  } = useLessonCustomizations(lessonKey, originalLesson)

  const rawTitle = asString(lesson.title) ?? plan?.title ?? 'Lesson Plan'
  const rawSubject = plan?.subject ?? 'Science'
  const { texts: translatedHeaderTexts } = useLessonTranslation(
    plan ? [rawTitle, rawSubject] : [],
    language,
  )
  const sourceMode = plan?.source_mode === 'topic' ? 'topic' : 'textbook'
  const focusedMode = sourceMode === 'topic' && asString(request.requestMode) === 'focused'

  if (error) return <ProductShell><div className="mx-auto max-w-3xl p-8 text-sm font-bold text-[#8c3027]">{error}</div></ProductShell>
  if (!plan) return <ProductShell><div className="mx-auto max-w-3xl p-8 text-sm font-bold text-[#68746c]">Loading lesson...</div></ProductShell>

  const title = translatedHeaderTexts[0] ?? rawTitle
  const subject = translatedHeaderTexts[1] ?? rawSubject

  function toggleCompleted(key: string) {
    setCompletedSections((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <ProductShell>
      <section className="border-b border-[#dfe5dc] bg-[#fffef9]">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-7 lg:px-10">
          <Link to="/app/library" className="inline-flex items-center gap-2 text-[10px] font-extrabold text-[#176b43]"><ArrowLeft className="size-4" /> {language === 'hindi' ? 'लाइब्रेरी' : 'Library'}</Link>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2 print:hidden"><span className="rounded-full bg-[#e8f2e5] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#176b43]">{sourceMode === 'textbook' ? (language === 'hindi' ? 'निजी पाठ्यपुस्तक' : 'Private textbook') : (language === 'hindi' ? 'टॉपिक मोड' : 'Topic Mode')}</span>{customized && <span className="rounded-full bg-[#fff2c7] px-2.5 py-1 text-[9px] font-extrabold text-[#7a5b12]">{language === 'hindi' ? 'शिक्षक द्वारा बदला गया' : 'Teacher customized'}</span>}</div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>
              <p className="mt-1 text-xs font-semibold text-[#6e7a72]">{plan.class_level ? `${language === 'hindi' ? 'कक्षा' : 'Class'} ${plan.class_level} · ` : ''}{subject} · {duration} {language === 'hindi' ? 'मिनट' : 'min'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!focusedMode && (
                <>
                  <button data-chalkbox-print-hide="" onClick={() => setMode('customize')} className="inline-flex items-center gap-2 rounded-xl border border-[#ccd8ca] bg-white px-3.5 py-2 text-xs font-extrabold text-[#176b43]"><SlidersHorizontal className="size-4" /> {language === 'hindi' ? 'कस्टमाइज़' : 'Customize'}</button>
                  <button data-chalkbox-print-hide="" onClick={() => setPresenting(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#0f5132] px-3.5 py-2 text-xs font-extrabold text-white"><MonitorUp className="size-4" /> {language === 'hindi' ? 'प्रस्तुत करें' : 'Present'}</button>
                </>
              )}
              {(focusedMode || mode === 'full') && <button data-chalkbox-print-hide="" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-[#ccd8ca] bg-white px-3.5 py-2 text-xs font-extrabold text-[#176b43]"><Printer className="size-4" /> {language === 'hindi' ? 'प्रिंट' : 'Print'}</button>}
            </div>
          </div>
        </div>
      </section>

      <nav className="border-b border-[#dfe5dc] bg-[#fffef9] print:hidden">
        <div className="mx-auto flex max-w-[1360px] gap-2 overflow-x-auto px-4 py-3 sm:px-7 lg:px-10">
          {focusedMode ? (
            <span className="flex shrink-0 items-center gap-2 rounded-xl bg-[#0f5132] px-4 py-2.5 text-[10px] font-extrabold text-white">
              <MessageSquareText className="size-3.5" />
              {language === 'hindi' ? 'केंद्रित शिक्षण सहायता' : 'Focused Teaching Help'}
            </span>
          ) : (
            ([['full', language === 'hindi' ? 'पूरा पाठ' : 'Full Lesson',CheckCircle2],['teach', language === 'hindi' ? 'कक्षा शुरू करें' : 'Start Class',MonitorUp],['quick', language === 'hindi' ? 'त्वरित पढ़ाएँ' : 'Quick Teach',Zap],['flashcards', language === 'hindi' ? 'फ्लैशकार्ड' : 'Flashcards',Lightbulb]] as const).map(([key,label,Icon]) => <button key={key} onClick={() => setMode(key)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold ${mode === key ? 'bg-[#0f5132] text-white' : 'bg-[#f0f4ee] text-[#5e6b62]'}`}><Icon className="size-3.5" />{label}</button>)
          )}
        </div>
      </nav>

      {focusedMode && <FocusedTeachingView lesson={lesson} lessonKey={lessonKey} language={language} />}
      {!focusedMode && mode === 'customize' && <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6"><CustomizePlanPanel originalLesson={originalLesson} customizations={customizations} language={language} onSave={saveSection} onReset={resetSection} onResetAll={resetAll} onDone={() => setMode('full')} sourceMode={sourceMode} /></div>}
      {!focusedMode && mode === 'full' && <LessonReferenceView lesson={lesson} lessonKey={lessonKey} language={language} durationMinutes={duration} resourceLevel={resourceLevel} sourceMode={sourceMode} formulas={formulas} completedSections={completedSections} onToggleComplete={toggleCompleted} expandAllByDefault />}
      {!focusedMode && mode === 'teach' && <TeachMode lesson={lesson} lessonKey={lessonKey} durationMinutes={duration} resourceLevel={resourceLevel} sourceMode={sourceMode} language={language} />}
      {!focusedMode && mode === 'quick' && <QuickTeachView lesson={lesson} resourceLevel={resourceLevel} sourceMode={sourceMode} language={language} />}
      {!focusedMode && mode === 'flashcards' && <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6"><LessonFlashcards lesson={lesson} formulas={formulas} language={language} /></div>}

      {!focusedMode && presenting && <PresentMode lesson={lesson} lessonKey={lessonKey} title={title} durationMinutes={duration} resourceLevel={resourceLevel} language={language} sourceMode={sourceMode} formulas={formulas} customized={customized} onClose={() => setPresenting(false)} />}
    </ProductShell>
  )
}
