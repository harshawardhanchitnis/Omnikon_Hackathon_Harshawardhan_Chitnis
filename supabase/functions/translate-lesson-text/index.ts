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
  return /क्योंकिक्यों|चकाचौंधचौं|प्रकीर्णनर्ण|परमाणुओंणु|गेंदेंगेंदें|खींचेंखीं|खींचिखीं|पेंसिपें|नहीं!हीं|उन्होंनेन्हों|ईंटईं|दा\s+गकर/g.test(text)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, message: 'POST required.' }, 405)

  try {
    const body = asRecord(await req.json())
    const texts = normalizeTexts(body?.texts)
    if (!texts) {
      return json({ ok: false, message: 'Invalid Hindi translation request.' }, 400)
    }

    const prompt = `Translate each item in the JSON array from English into clear, natural Hindi suitable for an Indian Class 8-10 Science teacher. Return JSON only: {"translations":["..."]}.

STRICT RULES:
- Return exactly ${texts.length} translations in the same order.
- Preserve scientific meaning and age-appropriate teaching language.
- Preserve mathematical formulas, variable symbols, chemical formulae/equations, units, numbers, URLs and page numbers EXACTLY. Never transliterate variables such as F, m, a, V, I, R, HCl, NaOH, H2SO4, CO2, O2, mm, µm, N, J, W, V, A or Ω.
- Translate instructional prose, diagram labels and classroom wording naturally; do not translate a short English teaching-stage label into an unrelated literal word.
- Proofread every Hindi item before returning it. Do not duplicate words/syllables (for example क्योंकिक्यों), and do not insert spaces inside ordinary Hindi science words such as हाइड्रॉक्साइड, हाइड्रोजन, नाइट्रोजन or विद्युत.
- Hindi prose must use Devanagari. Never introduce Arabic/Persian-script letters into Hindi words.
- Do not add explanations or commentary.

INPUT:
${JSON.stringify(texts)}`

    const result = await geminiJsonFallback([{ text: prompt }], models)
    let translations = readTranslations(
      result.value.translations,
      texts.length,
    )

    if (!translations) {
      return json({ ok: false, message: 'Hindi translation returned an incomplete result.' }, 502)
    }

    if (translations.some(needsHindiProofread)) {
      const proofreadPrompt = `Proofread the following Hindi translations for an Indian Class 8-10 Science teacher. Return JSON only: {"translations":["..."]}.

STRICT RULES:
- Return exactly ${texts.length} items in the same order.
- Fix malformed or duplicated Devanagari words/syllables, accidental word fragments, spacing corruption, and any accidental Arabic/Persian-script characters inside Hindi prose.
- Hindi prose must use Devanagari. If a mixed-script word appears, rewrite that word in correct natural Hindi.
- Preserve the original scientific meaning. Do not add new facts or explanations.
- Preserve mathematical formulas, variable symbols, chemical formulae/equations, units, numbers, URLs and page numbers EXACTLY.
- Do not convert a scientifically cautious statement into a stronger or absolute claim.

HINDI TO PROOFREAD:
${JSON.stringify(translations)}`

      const proofread = await geminiJsonFallback(
        [{ text: proofreadPrompt }],
        models,
      )
      translations = readTranslations(
        proofread.value.translations,
        texts.length,
      )

      if (
        !translations ||
        translations.some(needsHindiProofread)
      ) {
        const retryPrompt = `Translate the ORIGINAL English items again into clean, natural Hindi for an Indian Class 8-10 Science teacher. Return JSON only: {"translations":["..."]}.

STRICT QUALITY GATE:
- Return exactly ${texts.length} items in the same order.
- Use Devanagari Hindi for Hindi prose. Do not use Arabic/Persian-script letters.
- Do not duplicate syllables, graphemes or word fragments.
- Preserve formulas, variables, chemical equations, units, numbers, URLs and page numbers EXACTLY.
- Preserve scientific meaning and cautious wording. Do not add facts.

ORIGINAL ENGLISH:
${JSON.stringify(texts)}`

        const retried = await geminiJsonFallback(
          [{ text: retryPrompt }],
          models,
        )
        translations = readTranslations(
          retried.value.translations,
          texts.length,
        )

        if (!translations) {
          return json(
            {
              ok: false,
              message:
                'Hindi translation returned an incomplete result. Please retry.',
            },
            502,
          )
        }

        // Never fail an entire lesson because one item in a large translation
        // batch is malformed. Repair only the remaining bad items and preserve
        // every translation that already passed the quality gate.
        translations = translations.map(cleanHindiTranslation)
        const badIndexes = translations
          .map((item, index) => (needsHindiProofread(item) ? index : -1))
          .filter((index) => index >= 0)

        if (badIndexes.length > 0) {
          const repairTexts = badIndexes.map((index) => texts[index])
          const itemRepairPrompt = `Translate these ORIGINAL English items into clean, natural Hindi for an Indian Class 8-10 Science teacher. Return JSON only: {"translations":["..."]}.

STRICT QUALITY GATE:
- Return exactly ${badIndexes.length} items in the same order.
- Hindi prose must use Devanagari only. Never use Arabic/Persian-script letters.
- Do not duplicate syllables, word fragments or graphemes.
- Preserve formulas, variables, chemical equations, units, numbers, URLs and page numbers EXACTLY.
- Preserve scientific meaning and cautious wording. Do not add facts.

ORIGINAL ENGLISH ITEMS:
${JSON.stringify(repairTexts)}`

          try {
            const itemRepair = await geminiJsonFallback(
              [{ text: itemRepairPrompt }],
              models,
            )
            const repairedItems = readTranslations(
              itemRepair.value.translations,
              badIndexes.length,
            )

            if (repairedItems) {
              badIndexes.forEach((originalIndex, repairIndex) => {
                const repaired = cleanHindiTranslation(
                  repairedItems[repairIndex] ?? '',
                )
                if (repaired.trim() && !needsHindiProofread(repaired)) {
                  translations![originalIndex] = repaired
                }
              })
            }
          } catch {
            // Keep the already-good items. Residual bad items are handled below.
          }
        }

        // A single stubborn translation must never collapse Board Plan, Hook,
        // Visualize and every other item that shared its batch. If an item still
        // fails after targeted repair, fall back only that item to the canonical
        // English source while the rest of the Hindi lesson remains usable.
        translations = translations.map((item, index) =>
          needsHindiProofread(item) ? texts[index] : item,
        )
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
