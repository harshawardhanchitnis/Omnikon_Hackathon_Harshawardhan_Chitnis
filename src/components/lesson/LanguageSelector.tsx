import {
  Check,
  Languages,
} from 'lucide-react'

import {
  supportsHindiTranslation,
  type LessonLanguage,
} from '@/lib/lessonLanguage'

type Props = {
  language: LessonLanguage
  onLanguageChange: (language: LessonLanguage) => void
}

function LanguageSelector({
  language,
  onLanguageChange,
}: Props) {
  const hindiAvailable = supportsHindiTranslation()

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-xl border border-[#d5dfd2] bg-white p-1">
        <div className="flex size-8 items-center justify-center text-[#176b43]">
          <Languages className="size-4" />
        </div>

        <button
          type="button"
          onClick={() => onLanguageChange('english')}
          className={`rounded-lg px-3 py-2 text-[9px] font-extrabold transition-all ${
            language === 'english'
              ? 'bg-[#176b43] text-white'
              : 'text-[#657168] hover:bg-[#edf5e9]'
          }`}
        >
          English
        </button>

        <button
          type="button"
          onClick={() => {
            if (hindiAvailable) onLanguageChange('hindi')
          }}
          disabled={!hindiAvailable}
          title={
            hindiAvailable
              ? 'Show this lesson in Hindi'
              : 'Hindi translation is temporarily unavailable.'
          }
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            language === 'hindi'
              ? 'bg-[#176b43] text-white'
              : 'text-[#657168] hover:bg-[#edf5e9]'
          }`}
        >
          {language === 'hindi' ? <Check className="size-3" /> : null}
          हिंदी
        </button>
      </div>
    </div>
  )
}

export default LanguageSelector
