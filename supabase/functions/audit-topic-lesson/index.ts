const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

type ResourceLevel =
  | 'low'
  | 'standard'
  | 'well'

type RequestMode =
  | 'complete'
  | 'focused'

type LessonLanguage =
  | 'english'
  | 'hindi'

type TopicRequest = {
  classLevel: 8 | 9 | 10
  subject: 'Science'
  requestMode: RequestMode
  teacherRequest: string
  durationMinutes: number
  resourceLevel: ResourceLevel
  language: LessonLanguage
  classroomContext: string
}

type JsonRecord =
  Record<string, unknown>

type AuditResult = {
  pass: boolean
  scienceAccuracy: number
  ageAppropriateness: number
  requestFit: number
  classroomFeasibility: number
  safety: number
  issues: string[]
}

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type':
          'application/json',
      },
    },
  )
}

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function asString(
  value: unknown,
) {
  return typeof value ===
    'string'
    ? value
    : null
}

function asNumber(
  value: unknown,
) {
  return typeof value ===
      'number' &&
    Number.isFinite(value)
    ? value
    : null
}

function asStringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item ===
      'string',
  )
}

function normalizeRequest(
  value: unknown,
): TopicRequest | null {
  if (!isRecord(value)) {
    return null
  }

  const classLevel =
    asNumber(value.classLevel)
  const subject =
    asString(value.subject)
  const requestMode =
    asString(value.requestMode)
  const teacherRequest =
    asString(
      value.teacherRequest,
    )?.trim()
  const durationMinutes =
    asNumber(
      value.durationMinutes,
    )
  const resourceLevel =
    asString(
      value.resourceLevel,
    )
  const language =
    asString(value.language)
  const classroomContext =
    asString(
      value.classroomContext,
    )?.trim() ?? ''

  if (
    ![
      8,
      9,
      10,
    ].includes(
      classLevel ?? -1,
    ) ||
    subject !== 'Science' ||
    ![
      'complete',
      'focused',
    ].includes(
      requestMode ?? '',
    ) ||
    !teacherRequest ||
    teacherRequest.length < 12 ||
    teacherRequest.length > 1200 ||
    !durationMinutes ||
    durationMinutes < 20 ||
    durationMinutes > 60 ||
    ![
      'low',
      'standard',
      'well',
    ].includes(
      resourceLevel ?? '',
    ) ||
    ![
      'english',
      'hindi',
    ].includes(
      language ?? '',
    ) ||
    classroomContext.length > 400
  ) {
    return null
  }

  return {
    classLevel:
      classLevel as 8 | 9 | 10,
    subject: 'Science',
    requestMode:
      requestMode as RequestMode,
    teacherRequest,
    durationMinutes,
    resourceLevel:
      resourceLevel as ResourceLevel,
    language:
      language as LessonLanguage,
    classroomContext,
  }
}

function extractGeminiText(
  payload: unknown,
) {
  if (!isRecord(payload)) {
    return null
  }

  const candidates =
    Array.isArray(
      payload.candidates,
    )
      ? payload.candidates
      : []
  const first =
    isRecord(candidates[0])
      ? candidates[0]
      : null
  const content =
    isRecord(first?.content)
      ? first.content
      : null
  const parts =
    Array.isArray(content?.parts)
      ? content.parts
      : []

  return parts
    .map((part) =>
      isRecord(part)
        ? asString(part.text) ?? ''
        : '',
    )
    .join('')
    .trim() || null
}

async function callGemini(
  model: string,
  apiKey: string,
  prompt: string,
) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  const response =
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType:
            'application/json',
          temperature: 0.1,
          maxOutputTokens: 1400,
        },
      }),
    })

  const payload: unknown =
    await response
      .json()
      .catch(() => null)

  if (!response.ok) {
    const providerMessage =
      isRecord(payload) &&
      isRecord(payload.error)
        ? asString(
            payload.error.message,
          )
        : null

    const error = new Error(
      providerMessage ??
        `Gemini audit failed with HTTP ${response.status}.`,
    ) as Error & {
      status?: number
    }
    error.status =
      response.status
    throw error
  }

  const text =
    extractGeminiText(payload)

  if (!text) {
    throw new Error(
      'Gemini returned no usable audit JSON.',
    )
  }

  try {
    return JSON.parse(
      text,
    ) as unknown
  } catch {
    throw new Error(
      'Gemini returned malformed audit JSON.',
    )
  }
}

const auditorModels = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
] as const

function isRetryableProviderError(
  caught: unknown,
) {
  if (caught instanceof TypeError) {
    return true
  }

  if (!(caught instanceof Error)) {
    return false
  }

  const status =
    (caught as Error & {
      status?: number
    }).status

  return (
    status === 404 ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  )
}

async function callAuditWithFallback(
  apiKey: string,
  prompt: string,
) {
  let lastError: unknown = null

  for (
    let index = 0;
    index < auditorModels.length;
    index += 1
  ) {
    const model =
      auditorModels[index]

    try {
      return {
        value:
          await callGemini(
            model,
            apiKey,
            prompt,
          ),
        model,
        attempts: index + 1,
      }
    } catch (caught) {
      lastError = caught
      const hasNext =
        index <
        auditorModels.length - 1

      if (
        !hasNext ||
        !isRetryableProviderError(
          caught,
        )
      ) {
        throw caught
      }

      console.warn(
        `[Topic Audit] ${model} unavailable; trying ${auditorModels[index + 1]}.`,
      )
    }
  }

  throw (
    lastError ??
    new Error(
      'No Gemini audit model was available.',
    )
  )
}

function auditPrompt(
  request: TopicRequest,
  lesson: JsonRecord,
) {
  return `You are an independent Science lesson auditor. You did NOT generate this lesson.

Evaluate this ChalkBox Topic Mode result for a Class ${request.classLevel} Science teacher.
Teacher request: ${request.teacherRequest}
Request mode: ${request.requestMode}
Resources: ${request.resourceLevel}
Classroom context: ${request.classroomContext || 'Not supplied'}

Audit strictly for:
1. scienceAccuracy — facts, formulas, units, causal explanations and examples are scientifically correct;
2. ageAppropriateness — suitable depth and wording for Class ${request.classLevel};
3. requestFit — directly solves the teacher's actual request and respects complete vs focused mode; in focused mode, focusedHelp must stay compact and solve the one requested teaching problem rather than surveying a chapter;
4. classroomFeasibility — board work/activity/materials make sense for the selected resources and available time;
5. safety — no unsafe school experiment guidance and any meaningful precautions are stated.

Also fail if the lesson invents textbook provenance, page citations or claims to be source verified.
Also fail a lesson that:
- treats a clearly Mathematics, History/Social Science, English/language/literature or other non-Science request as a Science lesson instead of rejecting it as out of scope;
- says the standard coating cleaned from magnesium ribbon is magnesium carbonate rather than magnesium oxide (unless the teacher explicitly supplied a source/context requiring otherwise);
- turns the school-level trend about metal/non-metal oxides into an absolute rule that all metal oxides are basic or all non-metal oxides are acidic;
- describes Mg(OH)2 formed from MgO + H2O as a freely soluble clear solution instead of recognizing its limited solubility while preserving the alkaline litmus conclusion;
- says Mg(OH)2 chemically reacts with water to form hydroxide ions instead of sparingly dissolving/dissociating;
- uses chalk suspension as a supposedly reliable red-litmus-to-blue model;
- teaches Fu >= W as the condition for static floating rather than Fu = W at equilibrium and Fu > W as transient upward acceleration;
- uses a mechanistic density analogy where a crowd or medium intentionally "lets" an object pass;
- claims that most metal oxides react with water to form basic solutions, instead of distinguishing the broader basic/amphoteric trend from the smaller set of metal oxides that react readily with water;
- describes Rutherford's gold foil as only a few atoms thick, or says undeflected alpha particles encountered literally zero matter/zero force rather than using the age-appropriate conclusion that atoms are mostly empty space and nuclear charge/mass is concentrated in a tiny nucleus.
- asks students to intentionally ignite/burn classroom material, release a hard projectile such as a stone, or handle a knife/blade without a teacher-only safer substitute.
Do not rewrite or repair the lesson. Return JSON only:
{
  "pass": true,
  "scienceAccuracy": 0,
  "ageAppropriateness": 0,
  "requestFit": 0,
  "classroomFeasibility": 0,
  "safety": 0,
  "issues": ["specific issue if any"]
}
Scores are integers 0-10. pass can be true only when every dimension is at least 8 and there is no critical scientific or safety error.

LESSON JSON:
${JSON.stringify(lesson)}`
}

function normalizeAudit(
  value: unknown,
): AuditResult | null {
  if (!isRecord(value)) {
    return null
  }

  const pass =
    value.pass === true
  const scienceAccuracy =
    asNumber(
      value.scienceAccuracy,
    )
  const ageAppropriateness =
    asNumber(
      value.ageAppropriateness,
    )
  const requestFit =
    asNumber(value.requestFit)
  const classroomFeasibility =
    asNumber(
      value.classroomFeasibility,
    )
  const safety =
    asNumber(value.safety)
  const issues =
    asStringArray(value.issues)

  const scores = [
    scienceAccuracy,
    ageAppropriateness,
    requestFit,
    classroomFeasibility,
    safety,
  ]

  if (
    scores.some(
      (score) =>
        score === null ||
        score < 0 ||
        score > 10,
    )
  ) {
    return null
  }

  return {
    pass,
    scienceAccuracy:
      scienceAccuracy as number,
    ageAppropriateness:
      ageAppropriateness as number,
    requestFit:
      requestFit as number,
    classroomFeasibility:
      classroomFeasibility as number,
    safety: safety as number,
    issues,
  }
}

function lessonStringEntries(
  value: unknown,
  path: string[] = [],
): Array<{ path: string[]; text: string }> {
  if (typeof value === 'string') {
    return [{ path, text: value }]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      lessonStringEntries(item, [...path, String(index)]),
    )
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      lessonStringEntries(item, [...path, key]),
    )
  }

  return []
}

function isQuotedMisconception(path: string[]) {
  return path[path.length - 1] === 'misconception'
}

function containsCorrectionLanguage(text: string) {
  return /(?:do not|don't|incorrect|wrong|misconception|not true|avoid saying|should not|instead|correct(?:ion)?)/i.test(text)
}

function deterministicLessonIssues(lesson: JsonRecord) {
  const entries = lessonStringEntries(lesson)
  const fullText = entries.map((entry) => entry.text).join(' ').replace(/\s+/g, ' ')
  const issues: string[] = []

  const badMetalOxideClaim = entries.some(({ path, text }) =>
    !isQuotedMisconception(path) &&
    !containsCorrectionLanguage(text) &&
    /\b(?:many|most)\s+metal\s+oxides\s+(?:can\s+)?react\s+with\s+water\b/i.test(text),
  )
  if (badMetalOxideClaim) {
    issues.push('Do not teach that many/most metal oxides react with water. Many metal oxides are basic, but only some sufficiently reactive oxides react readily with water to form hydroxides.')
  }

  const badMagnesiumHydroxideClaim = entries.some(({ path, text }) =>
    !isQuotedMisconception(path) &&
    !containsCorrectionLanguage(text) &&
    (/\bmg\(oh\)2\b.{0,120}\breacts?\s+with\s+water\b/i.test(text) ||
      /\breacts?\s+with\s+water\b.{0,120}\b(?:hydroxide ions|oh-)\b/i.test(text)),
  )
  if (badMagnesiumHydroxideClaim) {
    issues.push('Mg(OH)2 should be described as sparingly dissolving/dissociating to provide hydroxide ions, not reacting with water to create them.')
  }

  const unsafeSolarFocus = entries.some(({ text }) => {
    if (!/\b(sun|sunlight)\b/i.test(text) || !/\b(lens|mirror|focus|focal|bright spot)\b/i.test(text) || !/\b(paper|card|sheet)\b/i.test(text)) {
      return false
    }
    if (/\b(do not|don't|never|avoid|without)\b/i.test(text)) {
      return false
    }
    return /\b(focus|direct|point|hold|concentrat(?:e|ing))\b/i.test(text)
  })
  if (unsafeSolarFocus) {
    issues.push('Do not focus direct sunlight onto paper/card in a classroom activity. Use a non-solar light source or a board demonstration instead.')
  }

  if (/\bhydrogen(?: gas)?\b/i.test(fullText) && /\b(generate|evolve|collect|production|acid \+ metal)\b/i.test(fullText) && !/\baway from (?:open )?flames?|no open flame|keep .* flames|sparks|hot surfaces\b/i.test(fullText)) {
    issues.push('Hydrogen generation/collection requires an explicit no-flame/no-spark/hot-surface safety warning and teacher control.')
  }

  return issues
}


function providerErrorResponse(
  caught: unknown,
) {
  const error =
    caught instanceof Error
      ? caught
      : new Error(
          'Unknown AI audit error.',
        )
  const status =
    (error as Error & {
      status?: number
    }).status

  if (status === 429) {
    return json(
      {
        ok: false,
        code: 'AI_QUOTA',
        message:
          'The free Gemini quota is currently unavailable. Please try again after the quota resets.',
      },
      429,
    )
  }

  if (
    status === 503 ||
    status === 504
  ) {
    return json(
      {
        ok: false,
        code:
          'AI_TEMPORARILY_UNAVAILABLE',
        message:
          'The independent Science check is temporarily unavailable. Please retry.',
      },
      503,
    )
  }

  console.error(
    'Topic audit provider error:',
    error.message,
  )

  return json(
    {
      ok: false,
      code: 'AI_AUDIT_ERROR',
      message:
        'ChalkBox could not complete the independent Science check. Please retry.',
    },
    502,
  )
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(
      'ok',
      { headers: corsHeaders },
    )
  }

  if (request.method !== 'POST') {
    return json(
      {
        ok: false,
        code:
          'METHOD_NOT_ALLOWED',
        message:
          'Use POST for the Topic Mode Science check.',
      },
      405,
    )
  }

  const apiKey =
    Deno.env.get(
      'GEMINI_API_KEY',
    )

  if (!apiKey) {
    return json(
      {
        ok: false,
        code:
          'SERVER_NOT_CONFIGURED',
        message:
          'The Topic Mode Science check is not configured on the server.',
      },
      503,
    )
  }

  let body: unknown

  try {
    body =
      await request.json()
  } catch {
    return json(
      {
        ok: false,
        code: 'INVALID_JSON',
        message:
          'The Topic Mode Science-check request was not valid JSON.',
      },
      400,
    )
  }

  if (!isRecord(body)) {
    return json(
      {
        ok: false,
        code: 'INVALID_REQUEST',
        message:
          'The Topic Mode Science-check request was invalid.',
      },
      400,
    )
  }

  const topicRequest =
    normalizeRequest(body.request)
  const lesson =
    isRecord(body.lesson)
      ? body.lesson
      : null

  if (!topicRequest || !lesson) {
    return json(
      {
        ok: false,
        code: 'INVALID_REQUEST',
        message:
          'The Topic Mode Science-check request was missing its lesson or teacher request.',
      },
      400,
    )
  }

  const deterministicIssues = deterministicLessonIssues(lesson)
  if (deterministicIssues.length > 0) {
    return json({ ok: false, code: 'SCIENCE_AUDIT_FAILED', message: 'The generated lesson did not pass ChalkBox’s deterministic Science/safety checks. It was not approved for the classroom workspace.', details: deterministicIssues.slice(0, 8) }, 422)
  }

  let auditResult: {
    value: unknown
    model: string
    attempts: number
  }

  try {
    auditResult =
      await callAuditWithFallback(
        apiKey,
        auditPrompt(
          topicRequest,
          lesson,
        ),
      )
  } catch (caught) {
    return providerErrorResponse(
      caught,
    )
  }

  const audit =
    normalizeAudit(
      auditResult.value,
    )

  if (!audit) {
    return json(
      {
        ok: false,
        code: 'AUDIT_INVALID',
        message:
          'The independent Science check returned an invalid result. Please retry.',
      },
      502,
    )
  }

  const minimumScore =
    Math.min(
      audit.scienceAccuracy,
      audit.ageAppropriateness,
      audit.requestFit,
      audit.classroomFeasibility,
      audit.safety,
    )

  if (
    !audit.pass ||
    minimumScore < 8
  ) {
    return json(
      {
        ok: false,
        code:
          'SCIENCE_AUDIT_FAILED',
        message:
          'The generated lesson did not pass ChalkBox’s independent Science check. It was not approved for the classroom workspace.',
        details:
          audit.issues.slice(0, 8),
      },
      422,
    )
  }

  const formulaCards =
    Array.isArray(
      body.formulaCards,
    )
      ? body.formulaCards
      : []
  const generationModel =
    asString(
      body.generationModel,
    ) ?? ''
  const generationAttempts =
    asNumber(
      body.generationAttempts,
    ) ?? 0

  return json({
    ok: true,
    bundle: {
      version: 1,
      generationId:
        crypto.randomUUID(),
      generatedAt:
        new Date().toISOString(),
      request: topicRequest,
      audit,
      lesson,
      formulaCards,
      modelRouting: {
        generationModel,
        generationAttempts,
        auditModel:
          auditResult.model,
        auditAttempts:
          auditResult.attempts,
      },
      disclosure:
        'Live AI-generated general Science teaching support. No textbook provenance.',
    },
  })
})
