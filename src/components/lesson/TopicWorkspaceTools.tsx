import {
  Check,
  Copy,
  Download,
  FilePenLine,
  NotebookPen,
} from 'lucide-react'
import {
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router-dom'

import {
  buildTopicLessonPlainText,
  loadTopicTeacherNotes,
  saveTopicDraft,
  saveTopicTeacherNotes,
  type TopicLessonBundle,
} from '@/lib/topicMode'
import type {
  LessonLanguage,
} from '@/lib/lessonLanguage'
import type {
  JsonRecord,
} from '@/lib/lessonExperience'

type Props = {
  bundle: TopicLessonBundle
  lesson?: JsonRecord
  language: LessonLanguage
}

function TopicWorkspaceTools({
  bundle,
  lesson,
  language,
}: Props) {
  const navigate = useNavigate()
  const [copied, setCopied] =
    useState(false)
  const [notes, setNotes] =
    useState(() =>
      loadTopicTeacherNotes(
        bundle.generationId,
      ),
    )
  const exportBundle = lesson
    ? {
        ...bundle,
        lesson,
      }
    : bundle

  async function copyPlan() {
    const text =
      buildTopicLessonPlainText(
        exportBundle,
      )

    try {
      await navigator.clipboard.writeText(
        text,
      )
      setCopied(true)
      window.setTimeout(
        () => setCopied(false),
        1800,
      )
    } catch {
      setCopied(false)
    }
  }

  function downloadPlan() {
    const text =
      buildTopicLessonPlainText(
        exportBundle,
      )
    const blob = new Blob(
      [text],
      {
        type: 'text/plain;charset=utf-8',
      },
    )
    const href =
      URL.createObjectURL(blob)
    const anchor =
      document.createElement('a')

    anchor.href = href
    anchor.download =
      `chalkbox-topic-${bundle.generationId.slice(0, 8)}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(href)
  }

  function editRequest() {
    saveTopicDraft({
      classLevel:
        bundle.request.classLevel,
      requestMode:
        bundle.request.requestMode,
      teacherRequest:
        bundle.request.teacherRequest,
      durationMinutes:
        bundle.request.durationMinutes,
      resourceLevel:
        bundle.request.resourceLevel,
      language:
        bundle.request.language,
      classroomContext:
        bundle.request.classroomContext,
    })
    navigate('/topic')
  }

  function updateNotes(
    value: string,
  ) {
    setNotes(value)
    saveTopicTeacherNotes(
      bundle.generationId,
      value,
    )
  }

  return (
    <section className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8 print:hidden">
      <div className="rounded-[22px] border border-[#dce4da] bg-[#fffef9] p-4 shadow-[0_6px_20px_rgba(22,66,39,0.035)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={editRequest}
            className="inline-flex items-center gap-2 rounded-xl bg-[#edf5e9] px-3.5 py-2.5 text-[9px] font-extrabold text-[#176b43] hover:bg-[#e2eee0]"
          >
            <FilePenLine className="size-3.5" />
            {language === 'hindi'
              ? 'अनुरोध बदलें / फिर बनाएँ'
              : 'Edit / regenerate'}
          </button>

          <button
            type="button"
            onClick={copyPlan}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2d6] bg-white px-3.5 py-2.5 text-[9px] font-extrabold text-[#59665e] hover:bg-[#f7faf5]"
          >
            {copied ? (
              <Check className="size-3.5 text-[#176b43]" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied
              ? language === 'hindi'
                ? 'कॉपी हुआ'
                : 'Copied'
              : language === 'hindi'
                ? 'प्लान कॉपी करें'
                : 'Copy plan'}
          </button>

          <button
            type="button"
            onClick={downloadPlan}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2d6] bg-white px-3.5 py-2.5 text-[9px] font-extrabold text-[#59665e] hover:bg-[#f7faf5]"
          >
            <Download className="size-3.5" />
            {language === 'hindi'
              ? 'TXT सेव करें'
              : 'Save TXT'}
          </button>

        </div>



        <div className="mt-4 border-t border-[#e5eae3] pt-4">
          <label
            htmlFor="topic-teacher-notes"
            className="flex items-center gap-2 text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#66736b]"
          >
            <NotebookPen className="size-3.5 text-[#176b43]" />
            {language === 'hindi'
              ? 'मेरे शिक्षक नोट्स'
              : 'My teacher notes'}
          </label>
          <textarea
            id="topic-teacher-notes"
            value={notes}
            onChange={(event) =>
              updateNotes(
                event.target.value,
              )
            }
            rows={2}
            maxLength={1600}
            placeholder={
              language === 'hindi'
                ? 'कक्षा के लिए अपने बदलाव, उदाहरण या याद रखने वाली बातें लिखें…'
                : 'Add your own classroom changes, examples or reminders…'
            }
            className="mt-2 w-full resize-y rounded-xl border border-[#d9e2d6] bg-[#fafbf8] px-3 py-3 text-[10px] font-medium leading-5 text-[#435048] outline-none focus:border-[#76a584] focus:ring-2 focus:ring-[#e9f1e6]"
          />
          <p className="mt-1 text-[8px] font-semibold text-[#929b94]">
            {language === 'hindi'
              ? 'नोट्स केवल इसी ब्राउज़र में सेव होते हैं और AI को नहीं भेजे जाते।'
              : 'Notes stay in this browser and are never sent to the AI.'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default TopicWorkspaceTools
