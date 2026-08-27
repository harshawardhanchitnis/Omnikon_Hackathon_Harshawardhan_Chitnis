import {
  Check,
  Languages,
  LoaderCircle,
} from 'lucide-react'
import {
  useState,
} from 'react'

import {
  prepareHindiTranslator,
  supportsHindiTranslation,
  type LessonLanguage,
} from '@/lib/lessonLanguage'

type Props = {
  language:
    LessonLanguage

  onLanguageChange: (
    language:
      LessonLanguage,
  ) => void
}

function LanguageSelector({
  language,
  onLanguageChange,
}: Props) {
  const [
    preparing,
    setPreparing,
  ] =
    useState(false)

  const [
    progress,
    setProgress,
  ] =
    useState<number | null>(
      null,
    )

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    )

  function chooseEnglish() {
    setError(null)

    onLanguageChange(
      'english',
    )
  }

  function chooseHindi() {
    setError(null)

    if (
      !supportsHindiTranslation()
    ) {
      setError(
        'Hindi translation needs Chrome desktop with the built-in Translator API.',
      )

      return
    }

    setPreparing(true)

    /*
     * This must originate from
     * the button click because
     * Translator.create() requires
     * user activation.
     */
    const translatorPromise =
      prepareHindiTranslator(
        (value) => {
          setProgress(
            value,
          )
        },
      )

    onLanguageChange(
      'hindi',
    )

    void translatorPromise
      .then(() => {
        setPreparing(false)
        setProgress(null)
      })
      .catch(
        (
          translationError:
            unknown,
        ) => {
          setPreparing(false)
          setProgress(null)

          setError(
            translationError instanceof
            Error
              ? translationError.message
              : 'Hindi translation could not be initialized.',
          )

          onLanguageChange(
            'english',
          )
        },
      )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1 rounded-xl border border-[#d5dfd2] bg-white p-1">
        <div className="flex size-8 items-center justify-center text-[#176b43]">
          <Languages className="size-4" />
        </div>

        <button
          type="button"
          onClick={
            chooseEnglish
          }
          className={`rounded-lg px-3 py-2 text-[9px] font-extrabold transition-all ${
            language ===
            'english'
              ? 'bg-[#176b43] text-white'
              : 'text-[#657168] hover:bg-[#edf5e9]'
          }`}
        >
          English
        </button>

        <button
          type="button"
          onClick={
            chooseHindi
          }
          disabled={
            preparing
          }
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[9px] font-extrabold transition-all disabled:opacity-70 ${
            language ===
            'hindi'
              ? 'bg-[#176b43] text-white'
              : 'text-[#657168] hover:bg-[#edf5e9]'
          }`}
        >
          {preparing ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : language ===
            'hindi' ? (
            <Check className="size-3" />
          ) : null}

          हिंदी
        </button>
      </div>

      {preparing &&
        progress !==
          null && (
          <div className="absolute right-0 top-[48px] z-[100] w-[230px] rounded-xl border border-[#dce4da] bg-white p-3 shadow-xl">
            <p className="text-[9px] font-bold text-[#5f6c63]">
              Preparing Hindi…
              {' '}
              {progress}%
            </p>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6ece3]">
              <div
                className="h-full bg-[#176b43] transition-all"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[8px] leading-4 text-[#89948c]">
              First use may download Chrome&apos;s local translation model.
            </p>
          </div>
        )}

      {error && (
        <div className="absolute right-0 top-[48px] z-[100] w-[270px] rounded-xl border border-[#ead5d0] bg-[#fff8f6] p-3 text-[9px] font-semibold leading-4 text-[#92564b] shadow-xl">
          {error}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector