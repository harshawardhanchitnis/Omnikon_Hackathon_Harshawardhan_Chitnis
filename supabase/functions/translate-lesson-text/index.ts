import {
  asRecord,
  asString,
  corsHeaders,
  geminiJsonFallback,
  json,
} from '../_shared/product.ts'

const models = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]

function normalizeTexts(value: unknown) {
  if (!Array.isArray(value)) return null
  const texts = value.filter((item): item is string => typeof item === 'string')
  if (texts.length !== value.length || texts.length === 0 || texts.length > 80) return null
  if (texts.reduce((total, text) => total + text.length, 0) > 30000) return null
  return texts
}

const hindiCleanupRules: Array<[RegExp, string]> = [
  [/क्योंकिक्यों/g, 'क्योंकि'],
  [/चकाचौंधचौं/g, 'चकाचौंध'],
  [/बेसों\)सों/g, 'बेस)'],
  [/हाइड्रॉ\s+क्साइड/g, 'हाइड्रॉक्साइड'],
  [/हाइड्रो\s+जन/g, 'हाइड्रोजन'],
  [/नाइट्रो\s+जन/g, 'नाइट्रोजन'],
  [/विद्यु\s+त/g, 'विद्युत'],
  [/शामि\s+ल/g, 'शामिल'],
  [/परमाणوي/g, 'परमाणवीय'],
  [/प्रकीर्णनर्ण/g, 'प्रकीर्णन'],
  [/परमाणुओंणु(?:\s*ओं)?/g, 'परमाणुओं'],
  [/गेंदेंगेंदें/g, 'गेंदें'],
  [/खींचेंखीं(?:\s*चें)?/g, 'खींचें'],
  [/खींचिखीं(?:\s*ए)?/g, 'खींचिए'],
  [/पेंसिपें\s*ल/g, 'पेंसिल'],
  [/नहीं!हीं/g, 'नहीं!'],
  [/उन्होंनेन्हों(?:\s*ने)?/g, 'उन्होंने'],
  [/ईंटईं/g, 'ईंट'],
  [/दा\s+गकर/g, 'दागकर'],
  [/क्यों\?\s*क्यों\s+क्योंकि(?:क्यों)?/g, 'क्यों? क्योंकि'],
  [/अल्\s*pha/gi, 'अल्फा'],
  [/ना\s+भिक/g, 'नाभिक'],
  [/स्थिरवैद्यु\s+त/g, 'स्थिरवैद्युत'],
  [/इलेक्ट्रॉ\s+नों/g, 'इलेक्ट्रॉनों'],
  [/इलेक्ट्रॉ\s+न/g, 'इलेक्ट्रॉन'],
  [/शि\s+क्ष\s+ण/g, 'शिक्षण'],
  [/थॉमस(?=\s+(?:मॉडल|के|का|की))/g, 'थॉमसन'],
]

function cleanHindiTranslation(text: string) {
  let cleaned = text

  for (const [pattern, replacement] of hindiCleanupRules) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  return cleaned.replace(
    /([\p{L}\p{M}]{3,})(?:\s+\1)+/gu,
    '$1',
  )
}

function hasKnownMalformedHindi(text: string) {
  // Keep this detector deliberately conservative. The previous grapheme-level
  // heuristic treated valid Hindi words that naturally repeat a matra/grapheme
  // as malformed and caused whole lesson sections to fail translation.
  return /क्योंकिक्यों|क्यों\?\s*क्यों|चकाचौंधचौं|प्रकीर्णनर्ण|परमाणुओंणु|गेंदेंगेंदें|खींचेंखीं|खींचिखीं|पेंसिपें|नहीं!हीं|उन्होंनेन्हों|ईंटईं|दा\s+गकर|अल्\s*pha|ना\s+भिक|स्थिरवैद्यु\s+त|इलेक्ट्रॉ\s+न|थॉमस(?=\s+(?:मॉडल|के|का|की))/gi.test(text)
}

function hasForeignScriptContamination(text: string) {
  // Hindi classroom prose may legitimately contain Latin scientific symbols,
  // but Arabic/Persian-script letters are never expected in a Hindi lesson.
  return /\p{Script=Arabic}/u.test(text)
}

function needsHindiProofread(text: string) {
  return (
    hasKnownMalformedHindi(text) ||
    hasForeignScriptContamination(text)
  )
}

function readTranslations(value: unknown, expected: number) {
  if (!Array.isArray(value)) return null

  const translations = value.map((item) =>
    cleanHindiTranslation(asString(item) ?? ''),
  )

  if (
    translations.length !== expected ||
    translations.some((item) => !item.trim())
  ) {
    return null
  }

  return translations
}

function translationPrompt(texts: string[]) {
  return `Translate each item in the JSON array from English into clear, natural Hindi suitable for an Indian Class 8-10 Science teacher. Return JSON only: {"translations":["..."]}.

STRICT RULES:
- Return exactly ${texts.length} translations in the same order.
- Preserve scientific meaning and age-appropriate teaching language.
- Preserve mathematical formulas, variable symbols, chemical formulae/equations, units, numbers, URLs and page numbers EXACTLY.
- Hindi prose must use Devanagari. Never introduce Arabic/Persian-script letters into Hindi words.
- Preserve scientist names correctly: J. J. Thomson / Thomson model must be जे. जे. थॉमसन / थॉमसन मॉडल, never थॉमस.
- Proofread every item; do not duplicate words, syllables or fragments and do not insert spaces inside ordinary Hindi science words.
- Do not add explanations or commentary.

INPUT:
${JSON.stringify(texts)}`
}

async function translateWithSalvage(texts: string[]) {
  try {
    const result = await geminiJsonFallback([{ text: translationPrompt(texts) }], models)
    const exact = readTranslations(result.value.translations, texts.length)
    if (exact) return exact
  } catch {
    // A large batch may fail even when smaller translations are healthy.
  }

  const output: string[] = []
  for (let offset = 0; offset < texts.length; offset += 6) {
    const chunk = texts.slice(offset, offset + 6)
    try {
      const chunkResult = await geminiJsonFallback([{ text: translationPrompt(chunk) }], models)
      const translatedChunk = readTranslations(chunkResult.value.translations, chunk.length)
      if (translatedChunk) {
        output.push(...translatedChunk)
        continue
      }
    } catch {
      // Fall through to per-item salvage.
    }

    for (const source of chunk) {
      try {
        const itemResult = await geminiJsonFallback([{ text: translationPrompt([source]) }], models)
        const translatedItem = readTranslations(itemResult.value.translations, 1)
        output.push(translatedItem?.[0] ?? source)
      } catch {
        output.push(source)
      }
    }
  }

  return output
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, message: 'POST required.' }, 405)

  try {
    const body = asRecord(await req.json())
    const texts = normalizeTexts(body?.texts)
    if (!texts) {
      return json({ ok: false, message: 'Invalid Hindi translation request.' }, 400)
    }

    let translations = await translateWithSalvage(texts)

    if (translations.some(needsHindiProofread)) {
      translations = translations.map(cleanHindiTranslation)
      const badIndexes = translations
        .map((item, index) => (needsHindiProofread(item) ? index : -1))
        .filter((index) => index >= 0)

      for (const originalIndex of badIndexes) {
        const source = texts[originalIndex]
        try {
          const repairedResult = await geminiJsonFallback(
            [{ text: translationPrompt([source]) }],
            models,
          )
          const repaired = readTranslations(
            repairedResult.value.translations,
            1,
          )?.[0]

          if (repaired && !needsHindiProofread(repaired)) {
            translations[originalIndex] = repaired
            continue
          }
        } catch {
          // Fall back only this item; never collapse the entire lesson batch.
        }

        translations[originalIndex] = source
      }
    }

    return json({ ok: true, translations })
  } catch {
    return json(
      { ok: false, message: 'Hindi translation is temporarily unavailable. Please retry.' },
      503,
    )
  }
})
