import {
  useEffect,
  useState,
} from 'react'

import {
  translateTextsToHindi,
  type LessonLanguage,
} from '@/lib/lessonLanguage'

type TranslationResult = {
  texts: string[]
  translating: boolean
  error: string | null
}

export function useLessonTranslation(
  sourceTexts: string[],
  language: LessonLanguage,
): TranslationResult {
  const serialized = JSON.stringify(sourceTexts)

  const [result, setResult] = useState<TranslationResult>({
    texts: sourceTexts,
    translating: false,
    error: null,
  })

  useEffect(() => {
    const texts = JSON.parse(serialized) as string[]

    if (language === 'english') {
      setResult({ texts, translating: false, error: null })
      return
    }

    let cancelled = false
    setResult({ texts, translating: true, error: null })

    async function run() {
      try {
        const translated = await translateTextsToHindi(texts)
        if (cancelled) return
        setResult({ texts: translated, translating: false, error: null })
      } catch (error: unknown) {
        if (cancelled) return
        setResult({
          texts,
          translating: false,
          error:
            error instanceof Error
              ? error.message
              : 'Hindi translation failed.',
        })
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [language, serialized])

  return result
}
