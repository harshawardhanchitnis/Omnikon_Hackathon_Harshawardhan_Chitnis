import type {
  LessonLanguage,
} from '@/lib/lessonExperience'

export type {
  LessonLanguage,
}

type TranslationProgressEvent = {
  loaded: number
}

type TranslationMonitor = {
  addEventListener: (
    type:
      'downloadprogress',
    listener: (
      event:
        TranslationProgressEvent,
    ) => void,
  ) => void
}

type BrowserTranslator = {
  translate: (
    input: string,
  ) => Promise<string>
}

type BrowserTranslatorStatic = {
  create: (
    options: {
      sourceLanguage:
        string
      targetLanguage:
        string
      monitor?: (
        monitor:
          TranslationMonitor,
      ) => void
    },
  ) =>
    Promise<BrowserTranslator>
}

type TranslatorGlobal =
  typeof globalThis & {
    Translator?:
      BrowserTranslatorStatic
  }

let hindiTranslatorPromise:
  Promise<BrowserTranslator> |
  null = null

const translationCache =
  new Map<
    string,
    string
  >()

function translatorApi() {
  return (
    globalThis as
      TranslatorGlobal
  ).Translator
}

export function supportsHindiTranslation() {
  return Boolean(
    translatorApi(),
  )
}

export function prepareHindiTranslator(
  onProgress?: (
    progress:
      number,
  ) => void,
) {
  if (
    hindiTranslatorPromise
  ) {
    return hindiTranslatorPromise
  }

  const api =
    translatorApi()

  if (!api) {
    throw new Error(
      'Hindi translation is unavailable in this browser. Use current Chrome desktop.',
    )
  }

  const created =
    api.create({
      sourceLanguage:
        'en',

      targetLanguage:
        'hi',

      monitor(
        monitor,
      ) {
        monitor.addEventListener(
          'downloadprogress',
          (event) => {
            onProgress?.(
              Math.round(
                event.loaded *
                  100,
              ),
            )
          },
        )
      },
    })

  hindiTranslatorPromise =
    created.catch(
      (
        error:
          unknown,
      ) => {
        hindiTranslatorPromise =
          null

        throw error
      },
    )

  return hindiTranslatorPromise
}

export async function translateToHindi(
  text: string,
) {
  const trimmed =
    text.trim()

  if (!trimmed) {
    return text
  }

  const cached =
    translationCache.get(
      trimmed,
    )

  if (cached) {
    return cached
  }

  if (
    !hindiTranslatorPromise
  ) {
    throw new Error(
      'Hindi translator has not been prepared. Choose Hindi from the language selector first.',
    )
  }

  const translator =
    await hindiTranslatorPromise

  const translated =
    await translator.translate(
      trimmed,
    )

  translationCache.set(
    trimmed,
    translated,
  )

  return translated
}