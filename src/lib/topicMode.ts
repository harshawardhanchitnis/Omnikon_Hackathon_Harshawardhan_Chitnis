import {
  asRecord,
  asString,
  type FormulaLike,
  type JsonRecord,
  type LessonLanguage,
} from '@/lib/lessonExperience'
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

export async function generateTopicLesson(
  request: TopicGenerationRequest,
): Promise<TopicLessonBundle> {
  const endpoint =
    getTopicEndpoint()

  if (!endpoint) {
    throw new Error(
      'Live Topic Mode is not configured yet. Set VITE_SUPABASE_URL (or VITE_TOPIC_GENERATION_ENDPOINT) after the Edge Function is deployed.',
    )
  }

  const anonKey =
    import.meta.env
      .VITE_SUPABASE_ANON_KEY
      ?.trim()

  const headers:
    Record<string, string> = {
      'Content-Type':
        'application/json',
    }

  if (anonKey) {
    headers.Authorization =
      `Bearer ${anonKey}`
    headers.apikey = anonKey
  }

  let response: Response

  try {
    response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(
          request,
        ),
      },
    )
  } catch {
    throw new Error(
      'ChalkBox could not reach the Topic Mode generation service. Check your connection and Edge Function configuration.',
    )
  }

  let payload: unknown

  try {
    payload =
      await response.json()
  } catch {
    payload = null
  }

  const record = asRecord(
    payload,
  )

  if (!response.ok) {
    const message =
      asString(record?.message) ??
      (response.status === 429
        ? 'The free AI quota is temporarily unavailable. Please try again after the quota resets.'
        : response.status >= 500
          ? 'The AI provider is temporarily unavailable. Your request was not replaced with prepared content.'
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

    throw new Error(
      details.length > 0
        ? `${message}\n${details.join('\n')}`
        : message,
    )
  }

  const success =
    record as
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
      'Topic Mode returned an invalid lesson payload. Nothing was saved.',
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
