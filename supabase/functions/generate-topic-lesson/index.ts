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
    asNumber(
      value.classLevel,
    )
  const subject =
    asString(value.subject)
  const requestMode =
    asString(
      value.requestMode,
    )
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

  if (
    requestMode ===
      'complete' &&
    durationMinutes < 30
  ) {
    return null
  }

  return {
    classLevel:
      classLevel as
        | 8
        | 9
        | 10,
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

function containsObviousPii(
  value: string,
) {
  const email =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  const phone =
    /(?:\+?91[-\s]?)?[6-9]\d{9}\b/

  return (
    email.test(value) ||
    phone.test(
      value.replace(
        /[()\s-]/g,
        '',
      ),
    )
  )
}

function requestModeGuidance(
  request: TopicRequest,
) {
  if (
    request.requestMode ===
    'focused'
  ) {
    return `
FOCUSED TEACHING HELP MODE:
- Solve the teacher's specific teaching problem rather than expanding into a whole chapter survey.
- Keep every section tightly tied to the requested concept, misconception, demonstration, explanation or question.
- The board plan should be compact and usable immediately.
- Use one strong analogy/example and one feasible activity/demonstration rather than breadth for its own sake.
- Practice and exit checks must test the exact requested concept.
- Populate focusedHelp as the primary compact teaching package. Do not turn it into a chapter summary; each field should be immediately usable in class.`
  }

  return `
COMPLETE LESSON MODE:
- Build a coherent classroom-ready lesson with progression from hook to explanation to application and checking.
- Cover the requested topic at an appropriate breadth for the selected class and available time.
- Prioritize what can realistically be taught in the selected duration; do not claim to exhaust an oversized chapter if the request is broader than the time allows.`
}

function resourceGuidance(
  resourceLevel: ResourceLevel,
) {
  if (resourceLevel === 'well') {
    return 'Well-equipped classroom: lab apparatus/projector may be used when pedagogically valuable, but digital tools and internet must remain optional rather than required.'
  }

  if (
    resourceLevel ===
    'standard'
  ) {
    return 'Standard classroom: assume board, textbook/notebook, ordinary classroom materials and limited shared apparatus.'
  }

  return 'Low-resource classroom: board-first, no projector/internet dependency, no specialist apparatus requirement; prefer paper, pencils and safe everyday objects.'
}

function focusedHelpContract(
  request: TopicRequest,
) {
  if (
    request.requestMode !==
    'focused'
  ) {
    return ''
  }

  return `,
    "focusedHelp": {
      "teachingGoal": "one precise outcome for the teacher's exact problem",
      "boardPlan": "compact board layout for this one concept",
      "explainSimply": "short teacher-ready explanation focused only on the requested issue",
      "visualOrAnalogy": "one strong visual or analogy and how to use it",
      "example": "one concise example tied to the exact concept",
      "activity": "one feasible micro-activity or demonstration",
      "commonMisconception": {
        "misconception": "the most likely wrong idea",
        "correction": "how the teacher should correct it"
      },
      "quickCheck": {
        "question": "one diagnostic question",
        "expectedAnswer": "concise expected answer"
      },
      "reteachSteps": [
        "2-4 alternative teacher moves if students still do not understand"
      ]
    }`
}

function generationPrompt(
  request: TopicRequest,
  structuralErrors:
    string[] = [],
) {
  const retryNote =
    structuralErrors.length > 0
      ? `\nA previous attempt failed deterministic structure checks. Correct ALL of these issues:\n- ${structuralErrors.join('\n- ')}\n`
      : ''

  return `You are ChalkBox's Topic Mode lesson generator for Indian teachers.

SCOPE
- Only Class 8, 9 or 10 Science teaching support.
- The teacher may ask an unseen topic, a full lesson, one concept, a misconception, a demonstration, a board explanation, a worked example, or a classroom question.
- Always make the visualize section board-usable. Include concrete boardDrawingSteps and a diagramSpec whenever the concept can be visualised.
- Prefer diagramSpec.panels for physical phenomena, force diagrams, apparatus, spatial relationships or side-by-side comparisons. Use only the allowed safe board primitives and normalized 0-100 coordinates; never return raw SVG/HTML.
- In panel elements, x/y are the start or top-left position. For shapes, w/h are visible width/height and should normally be positive. For line/arrow, w/h are the horizontal/vertical delta from the start point. Keep labels short and place force/direction labels directly on arrows.
- Use diagramSpec.nodes/arrows for abstract processes, concept relationships or cycles. The visual must match the teacher's drawing instructions rather than becoming an unrelated flowchart.
- Do NOT use textbook RAG. Do NOT invent textbook page numbers, source citations, URLs, quotations or claims such as "source verified".
- Output original teacher-ready wording.
- If the request is not reasonably a Class ${request.classLevel} Science teaching request, return status OUT_OF_SCOPE and explain briefly.

TEACHER INPUT
Class: ${request.classLevel}
Subject: Science
Mode: ${request.requestMode}
Available time: ${request.durationMinutes} minutes
Resources: ${resourceGuidance(request.resourceLevel)}
Classroom context: ${request.classroomContext || 'Not supplied'}
Teacher request: ${request.teacherRequest}
Display language selected by teacher: ${request.language}. Generate the canonical lesson in ENGLISH only; ChalkBox translates presentation locally when Hindi is selected.
${requestModeGuidance(request)}

QUALITY RULES
- Science must be accurate and age-appropriate for Class ${request.classLevel}.
- Directly answer what the teacher asked; do not drift into generic textbook prose.
- Teacher scripts should sound natural enough to say aloud.
- Board work must be concise and useful.
- Activities must be feasible for the selected resource level and safe for a school classroom.
- Do not recommend hazardous chemicals, mains electricity, flames, ingestion, pressurised containers, dangerous projectiles, unsafe biological exposure or unsupervised risky experiments.
- If a demonstration has a meaningful safety condition, include a clear safetyNote.
- Use correct symbols, equations and SI units where relevant.
- Never fabricate measurements/readings. If equipment is unavailable, use observation/reasoning or clearly labelled hypothetical values.
- Never include student names, profiles, emails, phone numbers or persistent learner identifiers.
- Do not calculate a minute-by-minute schedule. ChalkBox owns exact timing deterministically after generation.
- contentOrigin must be AI_GENERATED. Do not use SOURCE_GROUNDED, TEXTBOOK_ACTIVITY, TEXTBOOK_EXAMPLE or textbook provenance language.
${retryNote}
RETURN JSON ONLY with this shape:
{
  "status": "OK" | "OUT_OF_SCOPE",
  "message": "short status explanation",
  "lesson": {
    "title": "teacher-friendly title",
    "classLevel": ${request.classLevel},
    "subject": "Science",
    "requestMode": "${request.requestMode}",
    "requestedDurationMinutes": ${request.durationMinutes},
    "learningObjectives": ["2-5 observable objectives"],
    "prerequisites": ["0-4 prerequisites"],
    "hook": {
      "priority": "ESSENTIAL",
      "contentOrigin": "AI_GENERATED",
      "teacherPrompt": "what the teacher can say",
      "expectedStudentResponse": "what to listen for"
    },
    "fullLesson": {
      "boardPlan": {
        "priority": "ESSENTIAL",
        "contentOrigin": "AI_GENERATED",
        "text": "compact board layout using plain text"
      },
      "define": {
        "priority": "ESSENTIAL",
        "contentOrigin": "AI_GENERATED",
        "teacherScript": "clear definition script",
        "keyPoints": ["key points"],
        "boardWork": ["board items"]
      },
      "explain": {
        "priority": "ESSENTIAL",
        "contentOrigin": "AI_GENERATED",
        "teacherScript": "age-appropriate explanation",
        "keyPoints": ["key points"],
        "boardWork": ["board items"]
      },
      "visualize": {
        "priority": "IMPORTANT",
        "contentOrigin": "AI_GENERATED",
        "teacherInstructions": "how to build a board visual/model",
        "boardDrawingSteps": ["steps to draw it"],
        "whatStudentsShouldNotice": ["noticing prompts"],
        "diagramSpec": {
          "title": "short diagram title",
          "layout": "scene or comparison or process or cycle",
          "panels": [
            {
              "title": "optional panel title",
              "elements": [
                {
                  "kind": "container or fluid or hull or rect or circle or line or arrow or wave or label",
                  "x": 0,
                  "y": 0,
                  "w": 0,
                  "h": 0,
                  "label": "short label or empty string",
                  "emphasis": "normal or accent or muted"
                }
              ]
            }
          ],
          "nodes": [
            {
              "id": "n1",
              "label": "diagram node label",
              "annotation": "short supporting note",
              "shape": "rect or pill or circle"
            }
          ],
          "arrows": [
            {
              "from": "n1",
              "to": "n2",
              "label": "optional connector label"
            }
          ],
          "callouts": ["0-4 complete short callouts"]
        }
      },
      "example": {
        "priority": "IMPORTANT",
        "contentOrigin": "AI_GENERATED",
        "title": "representative example",
        "explanation": "why this example helps",
        "steps": ["worked reasoning steps"]
      },
      "activity": {
        "priority": "IMPORTANT",
        "contentOrigin": "AI_GENERATED",
        "title": "classroom activity",
        "objective": "what students learn",
        "materials": ["realistic materials"],
        "steps": ["3-6 steps"],
        "safetyNote": "empty string if no special safety note"
      },
      "howToTeach": {
        "priority": "IMPORTANT",
        "contentOrigin": "AI_GENERATED",
        "teacherMoves": ["teacher moves"],
        "questionsToAsk": ["questions"],
        "misconceptions": [
          {"misconception": "common incorrect idea", "correction": "teacher-ready correction"}
        ]
      },
      "practice": {
        "priority": "IMPORTANT",
        "contentOrigin": "AI_GENERATED",
        "questions": [
          {"question": "practice question", "expectedAnswer": "answer"}
        ]
      },
      "checkUnderstanding": {
        "priority": "ESSENTIAL",
        "contentOrigin": "AI_GENERATED",
        "questions": [
          {"question": "quick check", "expectedAnswer": "answer"}
        ]
      },
      "materials": ["consolidated materials list"]
    },
    "quickIdeas": {
      "analogy": {"text": "one useful analogy or empty string"},
      "lowResourceActivity": {
        "title": "board-first/everyday-object version",
        "objective": "objective",
        "materials": ["low-resource materials"],
        "steps": ["steps"],
        "safetyNote": "empty string if no special safety note"
      },
      "quickChecks": [
        {"question": "question", "expectedAnswer": "answer"}
      ]
    }${focusedHelpContract(request)},
    "formulaCards": [
      {"label": "formula name", "formula": "equation", "note": "meaning/condition"}
    ]
  }
}

formulaCards may be [] when the requested Science topic has no useful formula. lesson must be omitted when status is OUT_OF_SCOPE.`
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
        ? asString(part.text) ??
          ''
        : '',
    )
    .join('')
    .trim() || null
}

async function callGemini(
  model: string,
  apiKey: string,
  prompt: string,
  maxOutputTokens: number,
  temperature: number,
) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

  const response =
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
        'x-goog-api-key':
          apiKey,
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
          temperature,
          maxOutputTokens,
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
        `Gemini request failed with HTTP ${response.status}.`,
    ) as Error & {
      status?: number
    }
    error.status =
      response.status
    throw error
  }

  const text =
    extractGeminiText(
      payload,
    )

  if (!text) {
    throw new Error(
      'Gemini returned no usable JSON text.',
    )
  }

  try {
    return JSON.parse(
      text,
    ) as unknown
  } catch {
    throw new Error(
      'Gemini returned malformed JSON.',
    )
  }
}

type GeminiFallbackResult = {
  value: unknown
  model: string
  attempts: number
}

const generatorModels = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
] as const

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

function remainingModelsFrom(
  models: readonly string[],
  currentModel: string,
) {
  const index =
    models.indexOf(currentModel)

  return index >= 0
    ? models.slice(index)
    : models
}

async function callGeminiWithFallback(
  models: readonly string[],
  apiKey: string,
  prompt: string,
  maxOutputTokens: number,
  temperature: number,
): Promise<GeminiFallbackResult> {
  let lastError: unknown = null

  for (
    let index = 0;
    index < models.length;
    index += 1
  ) {
    const model = models[index]

    try {
      const value =
        await callGemini(
          model,
          apiKey,
          prompt,
          maxOutputTokens,
          temperature,
        )

      // Strict short-circuit invariant:
      // the first successful model ends the chain immediately.
      // No later fallback model is called after this return.
      return {
        value,
        model,
        attempts: index + 1,
      }
    } catch (caught) {
      lastError = caught

      const hasNext =
        index < models.length - 1

      if (
        !hasNext ||
        !isRetryableProviderError(
          caught,
        )
      ) {
        throw caught
      }

      console.warn(
        `[Topic Mode] ${model} unavailable; trying ${models[index + 1]}.`,
      )
    }
  }

  throw (
    lastError ??
    new Error(
      'No Gemini model was available.',
    )
  )
}

function hasNonEmptyString(
  record: JsonRecord,
  key: string,
) {
  const value =
    asString(record[key])
  return Boolean(
    value?.trim(),
  )
}

function validateQuestionList(
  value: unknown,
  label: string,
  errors: string[],
) {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    errors.push(
      `${label} needs at least one question.`,
    )
    return
  }

  const valid =
    value.some((item) => {
      if (!isRecord(item)) {
        return false
      }

      return (
        hasNonEmptyString(
          item,
          'question',
        ) &&
        hasNonEmptyString(
          item,
          'expectedAnswer',
        )
      )
    })

  if (!valid) {
    errors.push(
      `${label} needs a question and expected answer.`,
    )
  }
}

function containsForbiddenSourceKey(
  value: unknown,
): boolean {
  if (Array.isArray(value)) {
    return value.some(
      containsForbiddenSourceKey,
    )
  }

  if (!isRecord(value)) {
    return false
  }

  for (const [
    key,
    child,
  ] of Object.entries(value)) {
    const normalized =
      key.toLowerCase()

    if (
      normalized ===
        'sourcepages' ||
      normalized ===
        'sourcepage' ||
      normalized ===
        'citations' ||
      normalized ===
        'citation'
    ) {
      return true
    }

    if (
      containsForbiddenSourceKey(
        child,
      )
    ) {
      return true
    }
  }

  return false
}

function validateLesson(
  lesson: unknown,
  request: TopicRequest,
) {
  const errors: string[] = []

  if (!isRecord(lesson)) {
    return [
      'lesson must be an object.',
    ]
  }

  if (
    !hasNonEmptyString(
      lesson,
      'title',
    )
  ) {
    errors.push(
      'lesson.title is missing.',
    )
  }

  if (
    asNumber(
      lesson.classLevel,
    ) !== request.classLevel
  ) {
    errors.push(
      'lesson.classLevel must match the selected class.',
    )
  }

  if (
    asString(lesson.subject) !==
    'Science'
  ) {
    errors.push(
      'lesson.subject must be Science.',
    )
  }

  if (
    asString(
      lesson.requestMode,
    ) !== request.requestMode
  ) {
    errors.push(
      'lesson.requestMode must match the teacher selection.',
    )
  }

  if (
    asNumber(
      lesson.requestedDurationMinutes,
    ) !== request.durationMinutes
  ) {
    errors.push(
      'requestedDurationMinutes must match the teacher selection.',
    )
  }

  if (
    asStringArray(
      lesson.learningObjectives,
    ).length < 2
  ) {
    errors.push(
      'At least two learningObjectives are required.',
    )
  }

  const hook =
    isRecord(lesson.hook)
      ? lesson.hook
      : null

  if (
    !hook ||
    !hasNonEmptyString(
      hook,
      'teacherPrompt',
    )
  ) {
    errors.push(
      'hook.teacherPrompt is required.',
    )
  }

  const fullLesson =
    isRecord(
      lesson.fullLesson,
    )
      ? lesson.fullLesson
      : null

  if (!fullLesson) {
    errors.push(
      'fullLesson is required.',
    )
    return errors
  }

  const requiredSections = [
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

  for (const key of
    requiredSections) {
    if (
      !isRecord(
        fullLesson[key],
      )
    ) {
      errors.push(
        `fullLesson.${key} is required.`,
      )
    }
  }

  const define =
    isRecord(fullLesson.define)
      ? fullLesson.define
      : null
  const explain =
    isRecord(
      fullLesson.explain,
    )
      ? fullLesson.explain
      : null
  const visualize =
    isRecord(
      fullLesson.visualize,
    )
      ? fullLesson.visualize
      : null
  const activity =
    isRecord(
      fullLesson.activity,
    )
      ? fullLesson.activity
      : null
  const boardPlan =
    isRecord(
      fullLesson.boardPlan,
    )
      ? fullLesson.boardPlan
      : null

  if (
    define &&
    !hasNonEmptyString(
      define,
      'teacherScript',
    )
  ) {
    errors.push(
      'define.teacherScript is required.',
    )
  }

  if (
    explain &&
    !hasNonEmptyString(
      explain,
      'teacherScript',
    )
  ) {
    errors.push(
      'explain.teacherScript is required.',
    )
  }

  if (
    visualize &&
    asStringArray(
      visualize.boardDrawingSteps,
    ).length === 0
  ) {
    errors.push(
      'visualize.boardDrawingSteps needs at least one step.',
    )
  }

  if (
    boardPlan &&
    !hasNonEmptyString(
      boardPlan,
      'text',
    )
  ) {
    errors.push(
      'boardPlan.text is required.',
    )
  }

  if (
    activity &&
    asStringArray(
      activity.steps,
    ).length < 2
  ) {
    errors.push(
      'activity.steps needs at least two steps.',
    )
  }

  const practice =
    fullLesson.practice
  const check =
    fullLesson
      .checkUnderstanding

  if (isRecord(practice)) {
    validateQuestionList(
      practice.questions,
      'practice',
      errors,
    )
  }

  if (isRecord(check)) {
    validateQuestionList(
      check.questions,
      'checkUnderstanding',
      errors,
    )
  }

  const quickIdeas =
    isRecord(
      lesson.quickIdeas,
    )
      ? lesson.quickIdeas
      : null

  if (!quickIdeas) {
    errors.push(
      'quickIdeas is required for Quick Teach and flashcards.',
    )
  } else {
    const low =
      isRecord(
        quickIdeas
          .lowResourceActivity,
      )
        ? quickIdeas
            .lowResourceActivity
        : null

    if (
      !low ||
      asStringArray(
        low.steps,
      ).length < 2
    ) {
      errors.push(
        'quickIdeas.lowResourceActivity needs at least two steps.',
      )
    }

    validateQuestionList(
      quickIdeas.quickChecks,
      'quickIdeas.quickChecks',
      errors,
    )
  }

  if (
    request.requestMode ===
    'focused'
  ) {
    const focusedHelp =
      isRecord(
        lesson.focusedHelp,
      )
        ? lesson.focusedHelp
        : null

    if (!focusedHelp) {
      errors.push(
        'focusedHelp is required in focused mode.',
      )
    } else {
      const requiredFocusedStrings = [
        'teachingGoal',
        'boardPlan',
        'explainSimply',
        'visualOrAnalogy',
        'example',
        'activity',
      ]

      for (const key of
        requiredFocusedStrings) {
        if (
          !hasNonEmptyString(
            focusedHelp,
            key,
          )
        ) {
          errors.push(
            `focusedHelp.${key} is required.`,
          )
        }
      }

      const misconception =
        isRecord(
          focusedHelp
            .commonMisconception,
        )
          ? focusedHelp
              .commonMisconception
          : null

      if (
        !misconception ||
        !hasNonEmptyString(
          misconception,
          'misconception',
        ) ||
        !hasNonEmptyString(
          misconception,
          'correction',
        )
      ) {
        errors.push(
          'focusedHelp.commonMisconception needs a misconception and correction.',
        )
      }

      const quickCheck =
        isRecord(
          focusedHelp.quickCheck,
        )
          ? focusedHelp.quickCheck
          : null

      if (
        !quickCheck ||
        !hasNonEmptyString(
          quickCheck,
          'question',
        ) ||
        !hasNonEmptyString(
          quickCheck,
          'expectedAnswer',
        )
      ) {
        errors.push(
          'focusedHelp.quickCheck needs a question and expectedAnswer.',
        )
      }

      if (
        asStringArray(
          focusedHelp.reteachSteps,
        ).length < 2
      ) {
        errors.push(
          'focusedHelp.reteachSteps needs at least two steps.',
        )
      }
    }
  }

  if (
    containsForbiddenSourceKey(
      lesson,
    )
  ) {
    errors.push(
      'Topic Mode lesson must not contain sourcePages/citation fields.',
    )
  }

  const serialized =
    JSON.stringify(lesson)
      .toLowerCase()

  if (
    serialized.includes(
      'source_verified',
    ) ||
    serialized.includes(
      'source verified',
    ) ||
    serialized.includes(
      'textbook_activity',
    ) ||
    serialized.includes(
      'textbook_example',
    ) ||
    serialized.includes(
      'source_grounded',
    ) ||
    serialized.includes(
      'according to ncert',
    ) ||
    serialized.includes(
      'ncert page',
    ) ||
    serialized.includes(
      'textbook page',
    )
  ) {
    errors.push(
      'Topic Mode lesson contains forbidden textbook-provenance wording.',
    )
  }

  return errors
}

function normalizeFormulaCards(
  lesson: JsonRecord,
) {
  if (
    !Array.isArray(
      lesson.formulaCards,
    )
  ) {
    return []
  }

  return lesson.formulaCards
    .filter(isRecord)
    .map((item) => ({
      label:
        asString(item.label) ??
        '',
      formula:
        asString(
          item.formula,
        ) ?? '',
      note:
        asString(item.note) ??
        '',
    }))
    .filter(
      (item) =>
        item.label &&
        item.formula,
    )
    .slice(0, 8)
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
    asNumber(
      value.requestFit,
    )
  const classroomFeasibility =
    asNumber(
      value.classroomFeasibility,
    )
  const safety =
    asNumber(value.safety)
  const issues =
    asStringArray(
      value.issues,
    )

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

function providerErrorResponse(
  caught: unknown,
) {
  const error =
    caught instanceof Error
      ? caught
      : new Error(
          'Unknown AI provider error.',
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
          'The free Gemini quota is currently unavailable. ChalkBox did not substitute prepared content. Please try again after the quota resets.',
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
          'Gemini is temporarily unavailable. ChalkBox did not substitute prepared content.',
      },
      503,
    )
  }

  console.error(
    'Topic Mode provider error:',
    error.message,
  )

  return json(
    {
      ok: false,
      code: 'AI_PROVIDER_ERROR',
      message:
        'The live AI generation service failed. No prepared textbook lesson was used as a fallback.',
    },
    502,
  )
}

Deno.serve(async (request) => {
  if (
    request.method ===
    'OPTIONS'
  ) {
    return new Response(
      'ok',
      {
        headers:
          corsHeaders,
      },
    )
  }

  if (
    request.method !==
    'POST'
  ) {
    return json(
      {
        ok: false,
        code:
          'METHOD_NOT_ALLOWED',
        message:
          'Use POST for Topic Mode generation.',
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
          'Topic Mode live AI is not configured on the server.',
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
          'The Topic Mode request was not valid JSON.',
      },
      400,
    )
  }

  const topicRequest =
    normalizeRequest(body)

  if (!topicRequest) {
    return json(
      {
        ok: false,
        code:
          'INVALID_REQUEST',
        message:
          'Use Class 8–10 Science, a valid request mode, 20–60 minutes, and a teaching request between 12 and 1200 characters.',
      },
      400,
    )
  }

  if (
    containsObviousPii(
      `${topicRequest.teacherRequest} ${topicRequest.classroomContext}`,
    )
  ) {
    return json(
      {
        ok: false,
        code:
          'STUDENT_PII',
        message:
          'Remove student email addresses or phone numbers before using Topic Mode. ChalkBox is designed for teacher/group-level context only.',
      },
      400,
    )
  }

  let generated: unknown
  let generationModelUsed = ''
  let generationAttempts = 0

  try {
    const generationResult =
      await callGeminiWithFallback(
        generatorModels,
        apiKey,
        generationPrompt(
          topicRequest,
        ),
        topicRequest.requestMode ===
          'complete'
          ? 8192
          : 6144,
        0.3,
      )

    generated =
      generationResult.value
    generationModelUsed =
      generationResult.model
    generationAttempts =
      generationResult.attempts
  } catch (caught) {
    return providerErrorResponse(
      caught,
    )
  }

  if (!isRecord(generated)) {
    return json(
      {
        ok: false,
        code:
          'INVALID_AI_OUTPUT',
        message:
          'The AI response did not match the Topic Mode contract.',
      },
      502,
    )
  }

  const status =
    asString(generated.status)

  if (
    status ===
    'OUT_OF_SCOPE'
  ) {
    return json(
      {
        ok: false,
        code: 'OUT_OF_SCOPE',
        message:
          asString(
            generated.message,
          ) ??
          'Topic Mode currently supports Class 8–10 Science teaching requests.',
      },
      422,
    )
  }

  let lesson =
    generated.lesson
  let structuralErrors =
    validateLesson(
      lesson,
      topicRequest,
    )

  if (
    structuralErrors.length >
    0
  ) {
    try {
      const repairResult =
        await callGeminiWithFallback(
          remainingModelsFrom(
            generatorModels,
            generationModelUsed,
          ),
          apiKey,
          generationPrompt(
            topicRequest,
            structuralErrors,
          ),
          topicRequest.requestMode ===
            'complete'
            ? 8192
            : 6144,
          0.2,
        )
      const repaired =
        repairResult.value

      generationModelUsed =
        repairResult.model
      generationAttempts +=
        repairResult.attempts

      if (
        isRecord(repaired) &&
        asString(
          repaired.status,
        ) === 'OK'
      ) {
        lesson = repaired.lesson
        structuralErrors =
          validateLesson(
            lesson,
            topicRequest,
          )
      }
    } catch (caught) {
      return providerErrorResponse(
        caught,
      )
    }
  }

  if (
    structuralErrors.length >
    0 ||
    !isRecord(lesson)
  ) {
    return json(
      {
        ok: false,
        code:
          'STRUCTURE_VALIDATION_FAILED',
        message:
          'The generated lesson did not pass ChalkBox structural validation. Nothing was saved.',
        details:
          structuralErrors.slice(
            0,
            8,
          ),
      },
      422,
    )
  }

  let audit: AuditResult | null =
    null
  let auditModelUsed = ''
  let auditAttempts = 0

  try {
    const auditResult =
      await callGeminiWithFallback(
        auditorModels,
        apiKey,
        auditPrompt(
          topicRequest,
          lesson,
        ),
        1400,
        0.1,
      )

    auditModelUsed =
      auditResult.model
    auditAttempts =
      auditResult.attempts

    audit =
      normalizeAudit(
        auditResult.value,
      )
  } catch (caught) {
    return providerErrorResponse(
      caught,
    )
  }

  if (!audit) {
    return json(
      {
        ok: false,
        code:
          'AUDIT_INVALID',
        message:
          'The independent science audit returned an invalid result. ChalkBox did not approve the lesson.',
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
          audit.issues.slice(
            0,
            8,
          ),
      },
      422,
    )
  }

  const formulaCards =
    normalizeFormulaCards(
      lesson,
    )

  delete lesson.formulaCards

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
        generationModel:
          generationModelUsed,
        generationAttempts,
        auditModel:
          auditModelUsed,
        auditAttempts,
      },
      disclosure:
        'Live AI-generated general Science teaching support. No textbook provenance.',
    },
  })
})
