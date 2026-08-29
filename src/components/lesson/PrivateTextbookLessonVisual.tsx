import TopicLessonVisual from '@/components/lesson/TopicLessonVisual'
import { useLessonTranslation } from '@/hooks/useLessonTranslation'
import {
  asRecord,
  asString,
  asStringArray,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'

type Props = {
  lesson: JsonRecord
  presentation?: boolean
  language?: LessonLanguage
}

function ThermalTransferVisual({ lesson, presentation = false, language = 'english' }: Props) {
  const fullLesson = asRecord(lesson.fullLesson) ?? {}
  const visualize = asRecord(fullLesson.visualize) ?? {}
  const sourceNotices = asStringArray(visualize.whatStudentsShouldNotice).slice(0, 3)
  const sourceTitle = asString(lesson.title) ?? 'Thermal energy transfer'
  const { texts: translated } = useLessonTranslation([sourceTitle, ...sourceNotices], language)
  const title = translated[0] ?? sourceTitle
  const notices = sourceNotices.map((notice, index) => translated[index + 1] ?? notice)
  const hindi = language === 'hindi'

  return (
    <figure className={`overflow-hidden rounded-[24px] border border-[#cfd9cc] bg-[#102d21] shadow-[0_10px_30px_rgba(16,45,33,0.12)] ${presentation ? 'mx-auto w-full max-w-[1080px]' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 text-white">
        <div>
          <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#a8cbb1]">{hindi ? 'बोर्ड दृश्य' : 'Generated board visual'}</p>
          <h3 className="mt-1 text-sm font-extrabold">{title}</h3>
        </div>
        <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[8px] font-bold text-[#d5e7d8]">{hindi ? 'गर्म → ठंडा → संतुलन' : 'Hot → Cold → Equilibrium'}</span>
      </div>

      <div className="overflow-x-auto p-4 sm:p-6">
        <svg viewBox="0 0 940 520" className="min-w-[720px]" role="img" aria-label="Thermal energy transfers from a hotter object to a colder object until thermal equilibrium">
          <defs>
            <marker id="thermal-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L7,3 z" fill="#f3c96b" />
            </marker>
          </defs>

          <text x="470" y="35" textAnchor="middle" fill="#d9eadc" fontSize="16" fontWeight="700">{hindi ? 'संतुलन से पहले' : 'Before equilibrium'}</text>

          <rect x="90" y="85" width="280" height="210" rx="24" fill="#183e2e" stroke="#78b88e" strokeWidth="3" />
          <text x="230" y="122" textAnchor="middle" fill="#f3c96b" fontSize="20" fontWeight="800">{hindi ? 'वस्तु A · अधिक गर्म' : 'OBJECT A · HOTTER'}</text>
          <text x="230" y="151" textAnchor="middle" fill="#b7d1bd" fontSize="13">{hindi ? 'अधिक औसत गतिज ऊर्जा' : 'Higher average kinetic energy'}</text>

          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => {
            const x = 135 + (index % 4) * 64
            const y = 190 + Math.floor(index / 4) * 42
            return <circle key={`hot-${index}`} cx={x} cy={y} r="9" fill="#f3c96b" />
          })}

          <rect x="570" y="85" width="280" height="210" rx="24" fill="#183e2e" stroke="#78b88e" strokeWidth="3" />
          <text x="710" y="122" textAnchor="middle" fill="#eaf3e8" fontSize="20" fontWeight="800">{hindi ? 'वस्तु B · अधिक ठंडी' : 'OBJECT B · COLDER'}</text>
          <text x="710" y="151" textAnchor="middle" fill="#b7d1bd" fontSize="13">{hindi ? 'कम औसत गतिज ऊर्जा' : 'Lower average kinetic energy'}</text>

          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
            const x = 620 + (index % 4) * 60
            const y = 200 + Math.floor(index / 4) * 56
            return <circle key={`cold-${index}`} cx={x} cy={y} r="7" fill="#a8cbb1" />
          })}

          {[170, 205, 240].map((y) => (
            <line key={y} x1="392" y1={y} x2="548" y2={y} stroke="#f3c96b" strokeWidth="5" markerEnd="url(#thermal-arrow)" />
          ))}
          <text x="470" y="155" textAnchor="middle" fill="#f3c96b" fontSize="15" fontWeight="800">{hindi ? 'ऊष्मीय ऊर्जा' : 'THERMAL ENERGY'}</text>
          <text x="470" y="276" textAnchor="middle" fill="#b7d1bd" fontSize="12">{hindi ? 'तापमान अलग होने तक शुद्ध ऊर्जा स्थानांतरण' : 'Net transfer while temperatures differ'}</text>

          <line x1="80" y1="335" x2="860" y2="335" stroke="#426b53" strokeWidth="2" strokeDasharray="8 8" />
          <text x="470" y="372" textAnchor="middle" fill="#d9eadc" fontSize="16" fontWeight="700">{hindi ? 'पर्याप्त समय के बाद' : 'After sufficient time'}</text>

          <rect x="205" y="395" width="530" height="80" rx="22" fill="#183e2e" stroke="#78b88e" strokeWidth="3" />
          <text x="470" y="428" textAnchor="middle" fill="#eaf3e8" fontSize="19" fontWeight="800">{hindi ? 'ऊष्मीय संतुलन' : 'THERMAL EQUILIBRIUM'}</text>
          <text x="470" y="455" textAnchor="middle" fill="#b7d1bd" fontSize="14">{hindi ? 'समान तापमान · शुद्ध ऊष्मीय ऊर्जा स्थानांतरण नहीं' : 'Same temperature · no net thermal-energy transfer'}</text>
        </svg>
      </div>

      {!presentation && notices.length > 0 && (
        <div className="grid gap-2 border-t border-white/10 px-5 py-4 sm:grid-cols-2">
          {notices.map((notice) => (
            <div key={notice} className="rounded-xl bg-white/[0.06] px-3 py-2 text-[10px] font-semibold leading-5 text-[#dceadf]">{notice}</div>
          ))}
        </div>
      )}
    </figure>
  )
}

export default function PrivateTextbookLessonVisual({ lesson, presentation = false, language = 'english' }: Props) {
  const fullLesson = asRecord(lesson.fullLesson) ?? {}
  const visualize = asRecord(fullLesson.visualize) ?? {}
  const combined = [
    asString(lesson.title) ?? '',
    asString(visualize.teacherInstructions) ?? '',
    ...asStringArray(visualize.boardDrawingSteps),
    ...asStringArray(visualize.whatStudentsShouldNotice),
  ].join(' ')

  const thermalTransfer =
    /\bthermal\b/i.test(combined) &&
    /\b(hot|hotter|cold|colder|temperature|equilibrium)\b/i.test(combined)

  if (thermalTransfer) {
    return <ThermalTransferVisual lesson={lesson} presentation={presentation} language={language} />
  }

  return <TopicLessonVisual lesson={lesson} presentation={presentation} language={language} />
}
