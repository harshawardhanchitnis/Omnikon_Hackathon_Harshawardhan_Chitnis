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
    type: 'downloadprogress',
    listener: (event: TranslationProgressEvent) => void,
  ) => void
}

type BrowserTranslator = {
  translate: (input: string) => Promise<string>
}

type BrowserTranslatorStatic = {
  create: (options: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (monitor: TranslationMonitor) => void
  }) => Promise<BrowserTranslator>
}

type TranslatorGlobal = typeof globalThis & {
  Translator?: BrowserTranslatorStatic
}

let hindiTranslatorPromise: Promise<BrowserTranslator> | null = null

const translationCache = new Map<string, string>()
const inFlightTranslations = new Map<string, Promise<string>>()

type QueueItem = {
  text: string
  resolve: (value: string) => void
  reject: (reason: unknown) => void
}

let remoteQueue: QueueItem[] = []
let remoteFlushTimer: ReturnType<typeof setTimeout> | null = null

const fixedHindiLabels: Record<string, string> = {
  Science: 'विज्ञान',
  Hook: 'शुरुआत',
  Define: 'परिभाषाएँ',
  Explain: 'समझाएँ',
  Visualize: 'दृश्य रूप',
  Example: 'उदाहरण',
  Activity: 'गतिविधि',
  Practice: 'अभ्यास',
  'Exit Check': 'समझ की जाँच',
  'Quick Check': 'त्वरित जाँच',
  'Check Understanding': 'समझ की जाँच',
  'How to Teach': 'कैसे पढ़ाएँ',
  'Lesson Materials': 'पाठ सामग्री',
  'Board Plan': 'बोर्ड योजना',
  'Key Formulas': 'मुख्य सूत्र',
  Essential: 'आवश्यक',
  ESSENTIAL: 'आवश्यक',
  Mixed: 'मिश्रित',
  MIXED: 'मिश्रित',
  'Source grounded': 'स्रोत-आधारित',
  'SOURCE GROUNDED': 'स्रोत-आधारित',
  'Board visual': 'बोर्ड दृश्य',
  'BOARD VISUAL': 'बोर्ड दृश्य',
  'Generated board visual': 'बोर्ड दृश्य',
}

function fixedHindiTranslation(text: string) {
  const direct = fixedHindiLabels[text]
  if (direct) return direct

  const textbookPage = /^Textbook page\s+(\d+)$/i.exec(text)
  if (textbookPage) return `पाठ्यपुस्तक पृष्ठ ${textbookPage[1]}`

  const sourcePage = /^Source pages?\s+(\d+)$/i.exec(text)
  if (sourcePage) return `स्रोत पृष्ठ ${sourcePage[1]}`

  return null
}

function translatorApi() {
  return (globalThis as TranslatorGlobal).Translator
}

export function supportsHindiTranslation() {
  // Classroom Hindi uses the audited server translation path. We deliberately
  // do not advertise the browser Translator API as a fallback because browser
  // output bypasses ChalkBox's Hindi quality gate.
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  return Boolean(supabaseUrl)
}

export function prepareHindiTranslator(
  onProgress?: (progress: number) => void,
) {
  if (hindiTranslatorPromise) return hindiTranslatorPromise

  const api = translatorApi()
  if (!api) {
    throw new Error(
      'The on-device Hindi translator is unavailable in this browser.',
    )
  }

  const created = api.create({
    sourceLanguage: 'en',
    targetLanguage: 'hi',
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        onProgress?.(Math.round(event.loaded * 100))
      })
    },
  })

  hindiTranslatorPromise = created.catch((error: unknown) => {
    hindiTranslatorPromise = null
    throw error
  })

  return hindiTranslatorPromise
}

function translationEndpoint() {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  if (!supabaseUrl) return null
  return `${supabaseUrl}/functions/v1/translate-lesson-text`
}

async function translateRemoteBatch(texts: string[]) {
  const endpoint = translationEndpoint()
  if (!endpoint) {
    throw new Error('ChalkBox Hindi translation service is not configured.')
  }

  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const publicKey = String(
    anonKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  ).trim()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (publicKey) {
    headers.apikey = publicKey
    headers.Authorization = `Bearer ${publicKey}`
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ texts }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { translations?: unknown; message?: unknown }
    | null

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === 'string'
        ? payload.message
        : 'ChalkBox Hindi translation is temporarily unavailable.',
    )
  }

  if (
    !Array.isArray(payload?.translations) ||
    payload.translations.length !== texts.length ||
    !payload.translations.every((value) => typeof value === 'string')
  ) {
    throw new Error('ChalkBox Hindi translation returned an invalid response.')
  }

  return payload.translations as string[]
}

async function flushRemoteQueue() {
  remoteFlushTimer = null
  if (remoteQueue.length === 0) return

  // Keep one request small enough for a fast Edge Function response while
  // still coalescing the many section-level translation hooks on a lesson.
  const batch: QueueItem[] = []
  let characters = 0

  while (remoteQueue.length > 0 && batch.length < 80) {
    const next = remoteQueue[0]
    if (batch.length > 0 && characters + next.text.length > 30000) break
    remoteQueue.shift()
    batch.push(next)
    characters += next.text.length
  }

  try {
    const translations = await translateRemoteBatch(batch.map((item) => item.text))
    batch.forEach((item, index) => {
      const translated = translations[index]?.trim() || item.text
      translationCache.set(item.text, translated)
      item.resolve(translated)
    })
  } catch (remoteError) {
    // Never bypass the audited server quality gate with an unreviewed browser
    // translation. If Hindi cannot be quality-checked, surface the translation
    // error instead of publishing malformed classroom content.
    batch.forEach((item) => item.reject(remoteError))
  }

  if (remoteQueue.length > 0 && remoteFlushTimer === null) {
    remoteFlushTimer = setTimeout(() => void flushRemoteQueue(), 25)
  }
}

function queueHindiTranslation(text: string) {
  const fixed = fixedHindiTranslation(text)
  if (fixed) {
    translationCache.set(text, fixed)
    return Promise.resolve(fixed)
  }

  const cached = translationCache.get(text)
  if (cached) return Promise.resolve(cached)

  const inFlight = inFlightTranslations.get(text)
  if (inFlight) return inFlight

  const promise = new Promise<string>((resolve, reject) => {
    remoteQueue.push({ text, resolve, reject })
    if (remoteFlushTimer === null) {
      remoteFlushTimer = setTimeout(() => void flushRemoteQueue(), 25)
    }
  }).finally(() => {
    inFlightTranslations.delete(text)
  })

  inFlightTranslations.set(text, promise)
  return promise
}

export async function translateTextsToHindi(texts: string[]) {
  return Promise.all(
    texts.map(async (text) => {
      const trimmed = text.trim()
      if (!trimmed) return text
      return queueHindiTranslation(trimmed)
    }),
  )
}

export async function translateToHindi(text: string) {
  const [translated] = await translateTextsToHindi([text])
  return translated ?? text
}
