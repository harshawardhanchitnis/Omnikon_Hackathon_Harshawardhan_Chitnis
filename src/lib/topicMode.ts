import {
  asRecord,
  asString,
  type FormulaLike,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'
import { getFreshTeacherSession } from '@/lib/productAuth'
import type {
  ResourceLevel,
} from '@/lib/lessonPresentation'

export type TopicRequestMode =
  | 'complete'
  | 'focused'

export type TopicGenerationRequest = {
  classLevel: 8 | 9 | 10
  subject: 'Science'
  requestMode: TopicRequestMode
  teacherRequest: string
  durationMinutes: number
  resourceLevel: ResourceLevel
  language: LessonLanguage
  classroomContext: string
}

export type TopicAudit = {
  pass: boolean
  scienceAccuracy: number
  ageAppropriateness: number
  requestFit: number
  classroomFeasibility: number
  safety: number
  issues: string[]
}

export type TopicModelRouting = {
  generationModel: string
  generationAttempts: number
  auditModel: string
  auditAttempts: number
}

export type TopicLessonBundle = {
  version: 1
  generationId: string
  generatedAt: string
  request: TopicGenerationRequest
  audit: TopicAudit
  lesson: JsonRecord
  formulaCards: FormulaLike[]
  disclosure: string
  modelRouting?: TopicModelRouting
}

export type TopicDraft = {
  classLevel: 8 | 9 | 10
  requestMode: TopicRequestMode
  teacherRequest: string
  durationMinutes: number
  resourceLevel: ResourceLevel
  language: LessonLanguage
  classroomContext: string
}

export type TopicPreflightResult =
  | { ok: true }
  | { ok: false; message: string }

export function preflightTopicRequest(text: string): TopicPreflightResult {
  const value = text.toLowerCase().replace(/\s+/g, ' ').trim()

  const mathematics = /\b(quadratic|linear equation|polynomial|trigonometry|algebra|geometry|factorise|factorize)\b/.test(value)
  const history = /\b(revolt of 1857|social science|mughal|maurya|independence movement|world war|civilization)\b/.test(value)
  const english = /\b(active and passive voice|grammar|noun|pronoun|adjective|poem|literature|tense)\b/.test(value)

  if (mathematics || history || english) {
    return {
      ok: false,
      message: 'ChalkBox Topic Mode currently supports Class 8–10 Science teaching requests only.',
    }
  }

  const homeContext = /\b(at home|home experiment|student.*home|project at home|drinking glass)\b/.test(value)
  const procedural = /\b(step[- ]?by[- ]?step|how to make|make hydrogen|generate hydrogen|prepare hydrogen|heat it quickly|procedure)\b/.test(value)
  const severeHazard = /\b(concentrated acid|strong acid|sulfuric acid|sulphuric acid|hydrochloric acid|open flame|stove flame|gas stove|mains electricity)\b/.test(value)

  if (homeContext && procedural && severeHazard) {
    return {
      ok: false,
      message: 'This request asks for an unsafe home experiment. ChalkBox will not provide operational instructions involving strong acids, open flames, unsafe heating or improvised glassware. Ask for a safe classroom demonstration of the same Science concept instead.',
    }
  }

  return { ok: true }
}

type TopicGenerationSuccess = {
  ok: true
  bundle: TopicLessonBundle
}

type TopicGenerationFailure = {
  ok: false
  code: string
  message: string
  details?: string[]
}

const storageKey =
  'chalkbox-topic-active-v1'
const historyKey =
  'chalkbox-topic-history-v1'
const draftKey =
  'chalkbox-topic-draft-v1'
const notesPrefix =
  'chalkbox-topic-notes-v1:'
const maxHistoryItems = 8

function asFiniteNumber(
  value: unknown,
) {
  return typeof value === 'number' &&
    Number.isFinite(value)
    ? value
    : null
}

function isFormulaLike(
  value: unknown,
): value is FormulaLike {
  const record = asRecord(value)

  return Boolean(
    record &&
      asString(record.label) &&
      asString(record.formula) &&
      asString(record.note),
  )
}

function isModelRouting(
  value: unknown,
): value is TopicModelRouting {
  const record = asRecord(value)

  return Boolean(
    record &&
      asString(record.generationModel) &&
      asFiniteNumber(record.generationAttempts) !== null &&
      asString(record.auditModel) &&
      asFiniteNumber(record.auditAttempts) !== null,
  )
}

function isTopicBundle(
  value: unknown,
): value is TopicLessonBundle {
  const record = asRecord(value)
  const lesson = asRecord(
    record?.lesson,
  )
  const request = asRecord(
    record?.request,
  )
  const audit = asRecord(
    record?.audit,
  )

  return Boolean(
    record &&
      record.version === 1 &&
      asString(record.generationId) &&
      asString(record.generatedAt) &&
      lesson &&
      request &&
      audit,
  )
}

function isTopicDraft(
  value: unknown,
): value is TopicDraft {
  const record = asRecord(value)

  if (!record) {
    return false
  }

  const classLevel =
    asFiniteNumber(record.classLevel)
  const requestMode =
    asString(record.requestMode)
  const durationMinutes =
    asFiniteNumber(record.durationMinutes)
  const resourceLevel =
    asString(record.resourceLevel)
  const language =
    asString(record.language)

  return Boolean(
    (classLevel === 8 ||
      classLevel === 9 ||
      classLevel === 10) &&
      (requestMode === 'complete' ||
        requestMode === 'focused') &&
      asString(record.teacherRequest) !== null &&
      durationMinutes !== null &&
      (resourceLevel === 'low' ||
        resourceLevel === 'standard' ||
        resourceLevel === 'well') &&
      (language === 'english' ||
        language === 'hindi') &&
      asString(record.classroomContext) !== null,
  )
}

function safeParse(
  raw: string | null,
): unknown {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeHistory(
  bundles: TopicLessonBundle[],
) {
  localStorage.setItem(
    historyKey,
    JSON.stringify(
      bundles.slice(0, maxHistoryItems),
    ),
  )
}

export function loadTopicLessonHistory() {
  const parsed = safeParse(
    localStorage.getItem(historyKey),
  )

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .filter(isTopicBundle)
    .slice(0, maxHistoryItems)
}

export function saveTopicLessonBundle(
  bundle: TopicLessonBundle,
) {
  localStorage.setItem(
    storageKey,
    JSON.stringify(bundle),
  )

  const existing =
    loadTopicLessonHistory()
  const next = [
    bundle,
    ...existing.filter(
      (item) =>
        item.generationId !==
        bundle.generationId,
    ),
  ]

  writeHistory(next)
}

export function activateTopicLessonBundle(
  bundle: TopicLessonBundle,
) {
  saveTopicLessonBundle(bundle)
}

export function deleteTopicLessonFromHistory(
  generationId: string,
) {
  writeHistory(
    loadTopicLessonHistory().filter(
      (item) =>
        item.generationId !==
        generationId,
    ),
  )
}

export function clearTopicLessonHistory() {
  localStorage.removeItem(historyKey)
}

export function loadTopicLessonBundle() {
  const parsed = safeParse(
    localStorage.getItem(storageKey),
  )

  return isTopicBundle(parsed)
    ? parsed
    : null
}

export function clearTopicLessonBundle() {
  localStorage.removeItem(storageKey)
}

export function saveTopicDraft(
  draft: TopicDraft,
) {
  localStorage.setItem(
    draftKey,
    JSON.stringify(draft),
  )
}

export function loadTopicDraft() {
  const parsed = safeParse(
    localStorage.getItem(draftKey),
  )

  return isTopicDraft(parsed)
    ? parsed
    : null
}

export function clearTopicDraft() {
  localStorage.removeItem(draftKey)
}

export function saveTopicTeacherNotes(
  generationId: string,
  notes: string,
) {
  const key =
    `${notesPrefix}${generationId}`

  if (notes.trim()) {
    localStorage.setItem(key, notes)
  } else {
    localStorage.removeItem(key)
  }
}

export function loadTopicTeacherNotes(
  generationId: string,
) {
  return (
    localStorage.getItem(
      `${notesPrefix}${generationId}`,
    ) ?? ''
  )
}

export function buildTopicLessonPlainText(
  bundle: TopicLessonBundle,
) {
  const lesson = bundle.lesson
  const title =
    asString(lesson.title) ??
    'Topic teaching plan'
  const fullLesson =
    asRecord(lesson.fullLesson) ?? {}
  const focused =
    asRecord(lesson.focusedHelp)
  const lines: string[] = [
    title,
    `Class ${bundle.request.classLevel} · Science · ${bundle.request.durationMinutes} minutes`,
    bundle.request.requestMode === 'focused'
      ? 'Focused teaching help'
      : 'Complete lesson',
    '',
    `Teacher request: ${bundle.request.teacherRequest}`,
  ]

  if (bundle.request.classroomContext) {
    lines.push(
      `Classroom context: ${bundle.request.classroomContext}`,
    )
  }

  lines.push('')

  if (focused) {
    const focusedFields = [
      ['Teaching goal', focused.teachingGoal],
      ['Board plan', focused.boardPlan],
      ['Explain simply', focused.explainSimply],
      ['Visual / analogy', focused.visualOrAnalogy],
      ['Example', focused.example],
      ['Quick activity', focused.activity],
    ] as const

    for (const [label, value] of focusedFields) {
      const text = asString(value)
      if (text) {
        lines.push(label.toUpperCase(), text, '')
      }
    }

    const misconception =
      asRecord(focused.commonMisconception)
    if (misconception) {
      const wrong =
        asString(misconception.misconception)
      const correction =
        asString(misconception.correction)

      if (wrong || correction) {
        lines.push(
          'COMMON MISCONCEPTION',
          [
            wrong,
            correction
              ? `Correction: ${correction}`
              : '',
          ]
            .filter(Boolean)
            .join('\n'),
          '',
        )
      }
    }

    const quickCheck =
      asRecord(focused.quickCheck)
    if (quickCheck) {
      const question =
        asString(quickCheck.question)
      const answer =
        asString(quickCheck.expectedAnswer)

      if (question || answer) {
        lines.push(
          'QUICK CHECK',
          [
            question,
            answer
              ? `Expected answer: ${answer}`
              : '',
          ]
            .filter(Boolean)
            .join('\n'),
          '',
        )
      }
    }

    const reteachSteps =
      Array.isArray(focused.reteachSteps)
        ? focused.reteachSteps.filter(
            (item): item is string =>
              typeof item === 'string',
          )
        : []

    if (reteachSteps.length > 0) {
      lines.push(
        "IF THEY STILL DON'T GET IT",
        reteachSteps
          .map(
            (item, index) =>
              `${index + 1}. ${item}`,
          )
          .join('\n'),
        '',
      )
    }
  } else {
    const orderedSections = [
      'boardPlan',
      'define',
      'explain',
      'visualize',
      'example',
      'activity',
      'howToTeach',
      'practice',
      'checkUnderstanding',
    ]

    for (const key of orderedSections) {
      const section = asRecord(fullLesson[key])
      if (!section) {
        continue
      }

      const text =
        asString(section.text) ??
        asString(section.teacherScript) ??
        asString(section.teacherInstructions) ??
        asString(section.explanation) ??
        asString(section.objective)

      if (text) {
        lines.push(
          key.replace(/([A-Z])/g, ' $1').toUpperCase(),
          text,
          '',
        )
      }
    }
  }

  lines.push(
    'Generated by ChalkBox Topic Mode · AI-generated · Science checked · No textbook provenance',
  )

  return lines.join('\n')
}

export function getTopicModelRouting(
  bundle: TopicLessonBundle,
) {
  const raw =
    asRecord(
      (bundle as unknown as JsonRecord)
        .modelRouting,
    )

  if (!raw) {
    return null
  }

  const candidate = {
    generationModel:
      asString(raw.generationModel) ?? '',
    generationAttempts:
      asFiniteNumber(raw.generationAttempts) ?? 0,
    auditModel:
      asString(raw.auditModel) ?? '',
    auditAttempts:
      asFiniteNumber(raw.auditAttempts) ?? 0,
  }

  return isModelRouting(candidate)
    ? candidate
    : null
}

function getTopicEndpoint() {
  const explicit =
    import.meta.env
      .VITE_TOPIC_GENERATION_ENDPOINT
      ?.trim()

  if (explicit) {
    return explicit
  }

  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL
      ?.trim()

  if (!supabaseUrl) {
    return null
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/generate-topic-lesson`
}

function getTopicAuditEndpoint() {
  const explicit =
    import.meta.env
      .VITE_TOPIC_AUDIT_ENDPOINT
      ?.trim()

  if (explicit) {
    return explicit
  }

  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL
      ?.trim()

  if (!supabaseUrl) {
    return null
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/audit-topic-lesson`
}

export type TopicGenerationAuthMode =
  | 'demo'
  | 'product'

const topicGenerationModels = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
] as const

type TopicStageResult = {
  response: Response
  record: JsonRecord | null
}

type TopicGenerationDraft = {
  request: TopicGenerationRequest
  lesson: JsonRecord
  formulaCards: FormulaLike[]
  generationModel: string
  generationAttempts: number
}

function wait(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      )
    },
  )
}

async function postTopicStage(
  endpoint: string,
  headers: Record<string, string>,
  body: unknown,
  retryTransient = true,
  signal?: AbortSignal,
): Promise<TopicStageResult> {
  let lastNetworkError:
    unknown = null
  const maxAttempts =
    retryTransient ? 2 : 1

  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt += 1
  ) {
    let response: Response

    try {
      response = await fetch(
        endpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(
            body,
          ),
          signal,
        },
      )
    } catch (caught) {
      lastNetworkError = caught

      if (signal?.aborted) {
        throw new Error('Topic generation was cancelled. You can edit the request and try again.')
      }

      if (attempt + 1 < maxAttempts) {
        await wait(400)
        continue
      }

      throw new Error(
        'ChalkBox could not reach the Topic Mode service. Check your connection and try again.',
      )
    }

    let payload: unknown

    try {
      payload =
        await response.json()
    } catch {
      payload = null
    }

    const record =
      asRecord(payload)

    // A Supabase 546 means the current worker was terminated by the
    // hosted runtime. Retry once so a fresh isolate can continue rather
    // than immediately surfacing infrastructure details to the teacher.
    if (
      response.status === 546 &&
      attempt + 1 < maxAttempts
    ) {
      await wait(500)
      continue
    }

    return {
      response,
      record,
    }
  }

  throw new Error(
    lastNetworkError
      ? 'ChalkBox could not reach the Topic Mode service. Check your connection and try again.'
      : 'ChalkBox could not complete this Topic Mode request. Please retry.',
  )
}

function topicStageError(
  response: Response,
  record: JsonRecord | null,
) {
  const message =
    asString(record?.message) ??
    (response.status === 429
      ? 'The free AI quota is temporarily unavailable. Please try again after the quota resets.'
      : response.status === 546
        ? 'ChalkBox could not complete this generation on the current server worker. Please retry; no prepared content was substituted.'
        : response.status >= 500
          ? 'The AI service is temporarily unavailable. Your request was not replaced with prepared content.'
          : 'Topic Mode could not generate this lesson.')

  const details =
    Array.isArray(
      record?.details,
    )
      ? record.details.filter(
          (
            item,
          ): item is string =>
            typeof item ===
            'string',
        )
      : []

  const code = asString(record?.code)
  if (code === 'SCIENCE_AUDIT_FAILED') {
    return new Error(
      'ChalkBox could not approve that draft for classroom use. Your request and settings are preserved; please retry.',
    )
  }

  return new Error(
    details.length > 0
      ? `${message}\n${details.join('\n')}`
      : message,
  )
}

function isRetryableGenerationStage(
  response: Response,
  record: JsonRecord | null,
) {
  const code =
    asString(record?.code)

  return (
    response.status === 408 ||
    response.status === 429 ||
    response.status === 500 ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504 ||
    response.status === 546 ||
    code === 'PROVIDER_UNAVAILABLE' ||
    code === 'PROVIDER_ERROR'
  )
}

function parseGenerationDraft(
  record: JsonRecord | null,
): TopicGenerationDraft | null {
  if (
    !record ||
    record.ok !== true
  ) {
    return null
  }

  const draft =
    asRecord(record.draft)
  const request =
    asRecord(draft?.request)
  const lesson =
    asRecord(draft?.lesson)

  if (
    !draft ||
    !request ||
    !lesson
  ) {
    return null
  }

  const formulaCards =
    Array.isArray(
      draft.formulaCards,
    )
      ? draft.formulaCards.filter(
          isFormulaLike,
        )
      : []

  return {
    request:
      request as unknown as TopicGenerationRequest,
    lesson,
    formulaCards,
    generationModel:
      asString(
        draft.generationModel,
      ) ?? '',
    generationAttempts:
      asFiniteNumber(
        draft.generationAttempts,
      ) ?? 0,
  }
}

export async function generateTopicLesson(
  request: TopicGenerationRequest,
  authMode: TopicGenerationAuthMode = 'demo',
  signal?: AbortSignal,
): Promise<TopicLessonBundle> {
  const endpoint =
    getTopicEndpoint()
  const auditEndpoint =
    getTopicAuditEndpoint()

  if (!endpoint || !auditEndpoint) {
    throw new Error(
      'Live Topic Mode is not configured yet. Set VITE_SUPABASE_URL after the Topic generation and audit Edge Functions are deployed.',
    )
  }

  const anonKey =
    import.meta.env
      .VITE_SUPABASE_ANON_KEY
      ?.trim()

  const publicKey =
    anonKey ??
    import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY
      ?.trim()

  if (!publicKey) {
    throw new Error(
      'Live Topic Mode is missing the public Supabase key.',
    )
  }

  // Demo and Product use the same Topic service and model pipeline.
  // When a teacher is already signed in, Demo also reuses that fresh
  // authenticated session so its request reaches Supabase exactly like
  // Product Mode. Public Demo still falls back to the anon credential.
  const session =
    await getFreshTeacherSession()
      .catch(() => null)

  const headers:
    Record<string, string> = {
      'Content-Type':
        'application/json',
      apikey: publicKey,
    }

  if (authMode === 'product') {
    if (!session?.access_token) {
      throw new Error(
        'Your teacher session has expired. Sign in again before generating a Product lesson.',
      )
    }

    headers.Authorization =
      `Bearer ${session.access_token}`
  } else if (session?.access_token) {
    headers.Authorization =
      `Bearer ${session.access_token}`
  } else if (anonKey) {
    headers.Authorization =
      `Bearer ${anonKey}`
  }

  let repairErrors:
    string[] = []
  let draft:
    TopicGenerationDraft | null = null

  // Keep each AI generation/repair in its own Edge Function invocation.
  // Also keep each provider model in its own invocation. A slow Gemini
  // model can otherwise hold a Supabase worker until the platform's hard
  // idle limit is reached, preventing the server-side fallback chain from
  // ever getting a chance to run. We do not impose an application timeout:
  // if Supabase itself ends one worker, ChalkBox silently continues with
  // the next configured model while the teacher remains in the generating UI.
  let lastGenerationError:
    Error | null = null

  for (
    let structureAttempt = 0;
    structureAttempt < 2;
    structureAttempt += 1
  ) {
    let needsStructureRetry = false

    for (const generationModel of topicGenerationModels) {
      let stage: TopicStageResult

      try {
        stage =
          await postTopicStage(
            endpoint,
            headers,
            {
              ...request,
              deferAudit: true,
              generationModel,
              ...(repairErrors.length > 0
                ? {
                    repairErrors,
                  }
                : {}),
            },
            false,
            signal,
          )
      } catch (caught) {
        lastGenerationError =
          caught instanceof Error
            ? caught
            : new Error(
                'The live AI provider did not complete this attempt.',
              )
        continue
      }

      const code =
        asString(
          stage.record?.code,
        )

      if (
        stage.response.status === 409 &&
        code ===
          'STRUCTURE_RETRY_REQUIRED' &&
        structureAttempt === 0
      ) {
        repairErrors =
          Array.isArray(
            stage.record?.details,
          )
            ? stage.record.details.filter(
                (
                  item,
                ): item is string =>
                  typeof item ===
                  'string',
              )
            : []
        needsStructureRetry = true
        break
      }

      if (!stage.response.ok) {
        const stageError =
          topicStageError(
            stage.response,
            stage.record,
          )

        if (
          isRetryableGenerationStage(
            stage.response,
            stage.record,
          )
        ) {
          lastGenerationError =
            stageError
          continue
        }

        throw stageError
      }

      draft =
        parseGenerationDraft(
          stage.record,
        )

      if (!draft) {
        lastGenerationError =
          new Error(
            'Topic Mode returned an invalid generated lesson. Nothing was saved.',
          )
        continue
      }

      break
    }

    if (draft) {
      break
    }

    if (needsStructureRetry) {
      continue
    }

    if (lastGenerationError) {
      throw lastGenerationError
    }
  }

  if (!draft) {
    throw new Error(
      'Topic Mode could not produce a valid lesson structure. Nothing was saved.',
    )
  }

  // Run the independent Science audit in a separate Edge Function so the
  // generation and audit do not compete for one hosted worker budget. If a
  // scientifically plausible draft fails the audit, automatically regenerate
  // once using the audit issues as repair constraints, then audit the repaired
  // draft on a fresh worker. The teacher never sees internal audit reasoning.
  async function auditDraft(candidate: TopicGenerationDraft) {
    return postTopicStage(
      auditEndpoint,
      headers,
      {
        request,
        lesson: candidate.lesson,
        formulaCards: candidate.formulaCards,
        generationModel: candidate.generationModel,
        generationAttempts: candidate.generationAttempts,
      },
      true,
      signal,
    )
  }

  let auditStage = await auditDraft(draft)

  if (
    !auditStage.response.ok &&
    auditStage.response.status === 422 &&
    asString(auditStage.record?.code) === 'SCIENCE_AUDIT_FAILED'
  ) {
    const auditIssues = Array.isArray(auditStage.record?.details)
      ? auditStage.record.details.filter(
          (item): item is string => typeof item === 'string',
        ).slice(0, 8)
      : []

    const repairErrors = [
      'The independent Science check rejected the previous draft. Correct every issue below while preserving the teacher request and selected resource level.',
      ...auditIssues,
      'Make every demonstration safe for a school classroom. Prefer a safer alternative if the original demonstration cannot be made safe.',
    ]

    let repairedDraft: TopicGenerationDraft | null = null

    for (const generationModel of topicGenerationModels) {
      try {
        const repairStage = await postTopicStage(
          endpoint,
          headers,
          {
            ...request,
            deferAudit: true,
            generationModel,
            repairErrors,
          },
          false,
          signal,
        )

        if (!repairStage.response.ok) continue
        repairedDraft = parseGenerationDraft(repairStage.record)
        if (repairedDraft) break
      } catch {
        if (signal?.aborted) {
          throw new Error('Topic generation was cancelled. You can edit the request and try again.')
        }
        // Try the next model on a fresh worker.
      }
    }

    if (repairedDraft) {
      draft = repairedDraft
      auditStage = await auditDraft(repairedDraft)
    }
  }

  if (!auditStage.response.ok) {
    throw topicStageError(
      auditStage.response,
      auditStage.record,
    )
  }

  const success =
    auditStage.record as
      | TopicGenerationSuccess
      | TopicGenerationFailure
      | null

  if (
    !success ||
    success.ok !== true ||
    !isTopicBundle(
      success.bundle,
    )
  ) {
    throw new Error(
      'Topic Mode returned an invalid audited lesson payload. Nothing was saved.',
    )
  }

  const formulaCards =
    Array.isArray(
      success.bundle
        .formulaCards,
    )
      ? success.bundle.formulaCards.filter(
          isFormulaLike,
        )
      : []

  const routing =
    getTopicModelRouting(
      success.bundle,
    )

  return {
    ...success.bundle,
    request,
    formulaCards,
    ...(routing
      ? { modelRouting: routing }
      : {}),
  }
}
