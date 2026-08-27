import {
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getCustomizationFields,
  type CustomizableSectionKey,
  type LessonCustomizations,
} from '@/lib/lessonCustomization'
import type {
  JsonRecord,
  LessonLanguage,
} from '@/lib/lessonExperience'

type Props = {
  originalLesson: JsonRecord
  customizations: LessonCustomizations
  language: LessonLanguage
  onSave: (
    key: CustomizableSectionKey,
    text: string,
  ) => void
  onReset: (
    key: CustomizableSectionKey,
  ) => void
  onResetAll: () => void
  onDone: () => void
  sourceMode?: 'textbook' | 'topic'
}

function CustomizePlanPanel({
  originalLesson,
  customizations,
  language,
  onSave,
  onReset,
  onResetAll,
  onDone,
  sourceMode = 'textbook',
}: Props) {
  const fields = useMemo(
    () =>
      getCustomizationFields(
        originalLesson,
      ),
    [originalLesson],
  )

  const [activeKey, setActiveKey] =
    useState<CustomizableSectionKey>(
      fields[0]?.key ?? 'hook',
    )
  const activeField =
    fields.find(
      (field) =>
        field.key === activeKey,
    ) ?? fields[0]

  const [draft, setDraft] =
    useState('')

  useEffect(() => {
    if (!activeField) {
      setDraft('')
      return
    }

    setDraft(
      customizations[
        activeField.key
      ] ?? activeField.originalText,
    )
  }, [activeField, customizations])

  if (!activeField) {
    return null
  }

  const activeCustomized =
    Boolean(
      customizations[
        activeField.key
      ],
    )
  const totalCustomized =
    Object.keys(customizations).length

  return (
    <section className="mx-auto max-w-[1220px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-[#d6e1d4] bg-[#fffef9] shadow-[0_12px_36px_rgba(19,54,34,0.06)]">
        <div className="border-b border-[#e1e8df] bg-[#eef5eb] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#176b43]">
                <ShieldCheck className="size-4" />
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em]">
                  {language === 'hindi'
                    ? 'शिक्षक नियंत्रण'
                    : 'Teacher control'}
                </p>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                {language === 'hindi'
                  ? 'अपनी कक्षा की कॉपी बदलें'
                  : 'Customize your classroom copy'}
              </h2>
              <p className="mt-2 max-w-3xl text-[12px] font-medium leading-6 text-[#617067]">
                {language === 'hindi'
                  ? 'केवल उन्हीं हिस्सों को बदलें जिन्हें आप कक्षा में अलग तरह से कहना या दिखाना चाहते हैं। बदलाव इसी ब्राउज़र में सेव होते हैं और कोई AI कॉल नहीं करते।'
                  : 'Edit only the parts you want to say or show differently. Changes are saved in this browser and use zero AI calls.'}
              </p>
              {sourceMode === 'textbook' && (
                <p className="mt-2 text-[10px] font-bold leading-5 text-[#176b43]">
                  {language === 'hindi'
                    ? 'स्रोत-सत्यापित मूल पाठ नहीं बदलता। आपके बदलाव एक अलग शिक्षक कॉपी के रूप में सेव होते हैं।'
                    : 'The source-verified textbook original stays unchanged. Your edits are stored as a separate teacher copy.'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {totalCustomized > 0 && (
                <button
                  type="button"
                  onClick={onResetAll}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7e1d4] bg-white px-4 text-[10px] font-extrabold text-[#667269] hover:bg-[#f4f7f2]"
                >
                  <RotateCcw className="size-3.5" />
                  {language === 'hindi'
                    ? 'सब रीसेट करें'
                    : 'Reset all'}
                </button>
              )}
              <button
                type="button"
                onClick={onDone}
                className="inline-flex h-10 items-center rounded-xl bg-[#0f5132] px-4 text-[10px] font-extrabold text-white hover:bg-[#0b4329]"
              >
                {language === 'hindi'
                  ? 'कस्टमाइज़ पूरा'
                  : 'Done customizing'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-[#e1e8df] p-4 lg:border-b-0 lg:border-r">
            <p className="px-2 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#7d8981]">
              {language === 'hindi'
                ? 'बदलने योग्य शिक्षण खंड'
                : 'Editable teaching blocks'}
            </p>
            <div className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {fields.map((field) => {
                const selected =
                  field.key ===
                  activeField.key
                const changed = Boolean(
                  customizations[field.key],
                )

                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() =>
                      setActiveKey(field.key)
                    }
                    className={`flex items-center justify-between rounded-xl px-3 py-3 text-left text-[11px] font-bold transition-colors ${
                      selected
                        ? 'bg-[#0f5132] text-white'
                        : 'text-[#536159] hover:bg-[#eef5eb]'
                    }`}
                  >
                    <span>{field.label}</span>
                    {changed && (
                      <span
                        className={`size-2 rounded-full ${
                          selected
                            ? 'bg-[#f4c95d]'
                            : 'bg-[#208653]'
                        }`}
                        aria-label="Customized"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold">
                    {activeField.label}
                  </h3>
                  {activeCustomized && (
                    <span className="rounded-full bg-[#e7f3e5] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#176b43]">
                      {language === 'hindi'
                        ? 'शिक्षक बदलाव'
                        : 'Teacher customized'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-medium leading-5 text-[#718077]">
                  {activeField.description}
                </p>
              </div>

              {activeCustomized && (
                <button
                  type="button"
                  onClick={() =>
                    onReset(activeField.key)
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#d7e1d4] px-3 text-[9px] font-extrabold text-[#617067] hover:bg-[#f5f7f3]"
                >
                  <RotateCcw className="size-3" />
                  {language === 'hindi'
                    ? 'यह खंड रीसेट करें'
                    : 'Reset this block'}
                </button>
              )}
            </div>

            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(
                  event.target.value,
                )
              }
              rows={12}
              className="mt-5 w-full resize-y rounded-2xl border border-[#cfdccc] bg-white px-4 py-4 text-[13px] font-medium leading-7 text-[#26332b] outline-none transition focus:border-[#5b9a6d] focus:ring-4 focus:ring-[#dfeee0]"
              aria-label={`Edit ${activeField.label}`}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] font-semibold text-[#89948d]">
                {language === 'hindi'
                  ? 'आपके बदलाव हिंदी प्रस्तुति में भी अनुवादित किए जाएंगे।'
                  : 'Your custom text will also be used by Start Class and Present Mode.'}
              </p>

              <button
                type="button"
                onClick={() =>
                  onSave(
                    activeField.key,
                    draft,
                  )
                }
                disabled={
                  draft.trim().length === 0
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0f5132] px-5 text-[10px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="size-3.5" />
                {language === 'hindi'
                  ? 'शिक्षक बदलाव सेव करें'
                  : 'Save teacher edit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CustomizePlanPanel
