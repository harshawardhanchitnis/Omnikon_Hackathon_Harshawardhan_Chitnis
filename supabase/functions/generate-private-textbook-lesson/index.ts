import {
  adminRest,
  asNumber,
  asRecord,
  asString,
  corsHeaders,
  embedText,
  enforceDailyLimit,
  geminiJsonFallback,
  json,
  readJson,
  recordUsage,
  requireUser,
  userRest,
  vectorLiteral,
  type JsonRecord,
} from '../_shared/product.ts'

type RequestBody = {
  documentId: string
  teacherRequest: string
  classLevel: 8 | 9 | 10
  durationMinutes: 30 | 40 | 45 | 60
  resourceLevel: 'low' | 'standard' | 'well'
  language: 'english' | 'hindi'
  pageStart: number | null
  pageEnd: number | null
}

type Chunk = { chunk_id: number; page_start: number; page_end: number; content: string; similarity?: number }

const FULL_LESSON_REQUEST = 'Generate one complete source-grounded classroom lesson covering the main teachable concepts, definitions, equations, examples, activity, practice and understanding checks supported by this chapter or selected page range.'

function normalize(body: JsonRecord | null): RequestBody | null {
  const classLevel = asNumber(body?.classLevel)
  const duration = asNumber(body?.durationMinutes)
  const resource = asString(body?.resourceLevel)
  const language = asString(body?.language)
  const documentId = asString(body?.documentId)
  const pageStart = asNumber(body?.pageStart)
  const pageEnd = asNumber(body?.pageEnd)
  if (!documentId) return null
  if (![8,9,10].includes(classLevel ?? -1) || ![30,40,45,60].includes(duration ?? -1)) return null
  if (!['low','standard','well'].includes(resource ?? '') || !['english','hindi'].includes(language ?? '')) return null
  if ((pageStart === null) !== (pageEnd === null)) return null
  if (pageStart !== null && (pageStart < 1 || pageEnd === null || pageEnd < pageStart)) return null
  return {
    documentId,
    teacherRequest: FULL_LESSON_REQUEST,
    classLevel: classLevel as 8|9|10,
    durationMinutes: duration as 30|40|45|60,
    resourceLevel: resource as RequestBody['resourceLevel'],
    language: language as RequestBody['language'],
    pageStart,
    pageEnd,
  }
}

async function loadDocument(ownerId: string, documentId: string) {
  const response = await adminRest(`/rest/v1/source_documents?id=eq.${documentId}&owner_id=eq.${ownerId}&status=eq.ready&select=*&limit=1`)
  const rows = await readJson<JsonRecord[]>(response, 'Could not read textbook')
  if (!rows[0]) throw new Error('This textbook is not ready or does not belong to your account.')
  return rows[0]
}

async function retrieve(body: RequestBody, auth: string): Promise<Chunk[]> {
  if (body.pageStart && body.pageEnd && body.pageEnd >= body.pageStart) {
    const response = await userRest(
      `/rest/v1/source_chunks?document_id=eq.${body.documentId}&page_start=gte.${body.pageStart}&page_end=lte.${body.pageEnd}&select=id,page_start,page_end,content&order=page_start.asc&limit=24`,
      auth,
    )
    const rows = await readJson<JsonRecord[]>(response, 'Could not retrieve selected pages')
    return rows.map((row) => ({ chunk_id: Number(row.id), page_start: Number(row.page_start), page_end: Number(row.page_end), content: asString(row.content) ?? '' }))
  }

  const embedding = await embedText(body.teacherRequest)
  const response = await userRest('/rest/v1/rpc/match_private_textbook_chunks', auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_embedding: vectorLiteral(embedding), match_document: body.documentId, match_count: 24 }),
  })
  return readJson<Chunk[]>(response, 'Could not retrieve textbook context')
}

function resourceRule(level: RequestBody['resourceLevel']) {
  if (level === 'well') return 'A well-equipped classroom may use ordinary lab/projector resources, but internet must not be required.'
  if (level === 'standard') return 'Assume board, notebooks, textbook and ordinary shared classroom materials.'
  return 'Low-resource: board-first, no projector/internet requirement and no specialist apparatus dependency.'
}

function generationPrompt(body: RequestBody, fileName: string, context: string, allowedPages: number[]) {
  return `You are ChalkBox, generating a source-grounded Class ${body.classLevel} Science lesson from a PRIVATE teacher-uploaded PDF.

LESSON MODE: COMPLETE FULL LESSON ONLY. Do not narrow this into focused help or a single micro-topic.
LESSON GOAL: ${body.teacherRequest}
DURATION: ${body.durationMinutes} minutes. Do not calculate section minutes; ChalkBox deterministic UI owns timing.
RESOURCES: ${resourceRule(body.resourceLevel)}
CANONICAL OUTPUT LANGUAGE: English. Hindi is a presentation layer.
SOURCE FILE: ${fileName}
ALLOWED SOURCE PAGES: ${allowedPages.join(', ')}

STRICT SOURCE RULES:
- Use ONLY facts supported by SOURCE CONTEXT below, except ordinary classroom transitions/instructions.
- Never invent a page number, quotation, URL, NCERT label or provenance.
- Every substantive teaching section must include sourcePages using only ALLOWED SOURCE PAGES.
- ChalkBox Textbook Mode currently supports Class 8-10 Science source material only. If SOURCE CONTEXT is primarily Mathematics, History/Social Science, English/language/literature or another non-Science subject, return {"status":"OUT_OF_SCOPE","message":"ChalkBox Textbook Mode currently supports Class 8-10 Science textbooks only."} and omit lesson.
- If the supplied Science context cannot support the teacher request, return {"status":"INSUFFICIENT_SOURCE","message":"..."} instead of filling gaps from memory.
- Keep formulas/units exactly aligned with the source context.
- Preserve qualifiers and scope exactly. Never strengthen a source statement into an origin, location, certainty or causal claim that the source does not make.
- Preserve every source safety/caution instruction that applies to an activity, apparatus, chemical, flame, sharp object or biological material.
- Build one coherent COMPLETE LESSON from the strongest teachable material in the retrieved chapter/page context.
- The visualize section must be genuinely renderable: include concrete boardDrawingSteps AND a diagramSpec whenever the source supports a visual.
- Prefer diagramSpec.panels for apparatus, physical scenes, spatial relationships and comparisons. Use only the safe primitives listed in the schema and normalized 0-100 coordinates; never return SVG or HTML.
- For panel elements, x/y are start or top-left coordinates. Shapes should use positive visible w/h values; line/arrow w/h are deltas from the start point. Keep labels short.
- Use diagramSpec.nodes/arrows for processes, concept relationships and cycles. Keep node labels short and classroom-readable.

Return JSON only with this shape:
{
 "status":"OK" | "OUT_OF_SCOPE" | "INSUFFICIENT_SOURCE",
 "message":"required when status is not OK",
 "lesson":{
  "schemaVersion":1,"title":"...","classLevel":${body.classLevel},"subject":"Science","requestedDurationMinutes":${body.durationMinutes},
  "prerequisites":["..."],"learningObjectives":["..."],
  "fullLesson":{
   "boardPlan":{"text":"...","sourcePages":[1]},
   "hook":{"teacherScript":"...","keyPoints":["..."],"sourcePages":[1]},
   "define":{"teacherScript":"...","keyPoints":["..."],"boardWork":["..."],"sourcePages":[1]},
   "explain":{"teacherScript":"...","keyPoints":["..."],"boardWork":["..."],"sourcePages":[1]},
   "visualize":{"teacherInstructions":"...","boardDrawingSteps":["..."],"whatStudentsShouldNotice":["..."],"safetyNote":"... when relevant","diagramSpec":{"title":"short diagram title","layout":"scene or comparison or process or cycle","panels":[{"title":"optional panel title","elements":[{"kind":"container or fluid or hull or rect or circle or line or arrow or wave or label","x":0,"y":0,"w":0,"h":0,"label":"short label or empty string","emphasis":"normal or accent or muted"}]}],"nodes":[{"id":"n1","label":"short node label","annotation":"short note","shape":"rect or pill or circle"}],"arrows":[{"from":"n1","to":"n2","label":"optional connector"}],"callouts":["0-4 short callouts"]},"sourcePages":[1]},
   "example":{"title":"...","explanation":"...","steps":["..."],"answer":"...","sourcePages":[1]},
   "activity":{"title":"...","objective":"...","materials":["..."],"steps":["..."],"safetyNote":"... when relevant","sourcePages":[1]},
   "howToTeach":{"teacherCues":["..."],"misconceptions":[{"misconception":"...","correction":"..."}],"sourcePages":[1]},
   "practice":{"questions":[{"question":"...","expectedAnswer":"...","sourcePages":[1]}],"sourcePages":[1]},
   "checkUnderstanding":{"questions":[{"question":"...","expectedAnswer":"...","sourcePages":[1]}],"sourcePages":[1]},
   "materials":{"items":["..."]}
  },
  "quickIdeas":{"analogy":"...","lowResourceActivity":"...","quickChecks":["..."]},
  "sourceCoverage":{"document":"${fileName}","pages":[1]}
 },
 "formulaCards":[{"label":"...","formula":"...","note":"..."}]
}

SOURCE CONTEXT:
${context}`
}

function sanitizeSourcePages(value: unknown, allowed: Set<number>): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeSourcePages(item, allowed))
  if (!value || typeof value !== 'object') return value
  const record = value as JsonRecord
  const next: JsonRecord = {}
  for (const [key, item] of Object.entries(record)) {
    if (key === 'sourcePages' && Array.isArray(item)) {
      next[key] = [...new Set(item.filter((page): page is number => typeof page === 'number' && allowed.has(page)))]
    } else if (key === 'pages' && Array.isArray(item) && asRecord(value)?.document) {
      next[key] = [...new Set(item.filter((page): page is number => typeof page === 'number' && allowed.has(page)))]
    } else next[key] = sanitizeSourcePages(item, allowed)
  }
  return next
}

function mergeSafetyNote(existing: string | null, addition: string) {
  if (!existing) return addition
  if (existing.toLowerCase().includes(addition.toLowerCase())) return existing
  return `${existing} ${addition}`
}

function safetyGuidance(text: string) {
  const notes: string[] = []
  const chemistry = /\b(hcl|h2so4|naoh|koh|cao|calcium oxide|quicklime|acid|alkali|base solution|phenolphthalein|zinc|hydrogen gas|chemical|reagent)\b/i.test(text)
  const flame = /\b(flame|burning candle|burner|ignite|pop sound)\b/i.test(text)
  const hydrogen = /\b(hydrogen gas|hydrogen|h2\b)\b/i.test(text)
  const sharp = /\b(knife|blade|scalpel|cut(?:ting)? with)\b/i.test(text)
  const hotGlass = /\b(hot glass|heated glass|boiling|test tube|glassware|beaker|flask|reaction vessel)\b/i.test(text)

  if (chemistry) {
    notes.push('Teacher supervision required. Use small/dilute quantities and eye protection; keep chemicals away from skin and eyes, follow the school spill/disposal procedure, and do not let students handle acids, alkalis or reagents unsupervised.')
  }
  if (flame) {
    notes.push('Any flame activity must be teacher-controlled. Keep faces, hair and flammables away, wear eye protection, and extinguish the flame immediately after the observation.')
  }
  if (hydrogen) {
    notes.push('Keep hydrogen generation and collection away from open flames, sparks and hot surfaces. Do not use an ignition or pop test as a student activity; any teacher-only demonstration must use a tiny quantity with eye protection and clear separation from learners.')
  }
  if (sharp) {
    notes.push('Any knife or blade must be handled by the teacher only on a stable surface; students should observe rather than cut.')
  }
  if (hotGlass) {
    notes.push('Check glassware for damage and keep hot or reactive glassware under teacher control until it is safe to handle.')
  }

  return notes.join(' ')
}

function makeTemperatureObservationSafe(text: string) {
  const touchesVessel =
    /\b(touch|feel)\b.*\b(beaker|flask|test tube|glassware|vessel)\b/i.test(text) ||
    /\b(beaker|flask|test tube|glassware|vessel)\b.*\b(touch|feel)\b/i.test(text)
  const temperatureContext =
    /\b(temperature|warm|hot|heat|exothermic)\b/i.test(text)

  if (!touchesVessel || !temperatureContext) return text

  return 'Use a thermometer to observe the temperature change. If no thermometer is available, the teacher may verify warmth only after confirming the vessel is safe to handle; students should not touch reactive or recently heated glassware.'
}

function applySafetyGuardrails(lesson: JsonRecord) {
  const fullLesson = asRecord(lesson.fullLesson)
  if (!fullLesson) return lesson

  const activity = asRecord(fullLesson.activity)
  if (activity && Array.isArray(activity.steps)) {
    activity.steps = activity.steps.map((item) =>
      typeof item === 'string'
        ? makeTemperatureObservationSafe(item)
        : item,
    )

    const activityText = JSON.stringify(activity)
    const unsafeSolarFocus =
      /\b(sun|sunlight)\b/i.test(activityText) &&
      /\b(lens|mirror|focus|focal|bright spot)\b/i.test(activityText) &&
      /\b(paper|card|sheet|screen)\b/i.test(activityText)

    if (unsafeSolarFocus) {
      activity.title = 'Finding Approximate Focal Length Safely'
      activity.objective = 'Observe convergence and estimate focal length without concentrating direct sunlight on combustible material.'
      activity.materials = ['Convex lens or concave mirror', 'White card or screen', 'Classroom lamp or distant non-solar object', 'Measuring scale']
      activity.steps = [
        'Use a classroom lamp or a distant non-solar object; do not point the lens or mirror at the Sun.',
        'Move a white card or screen until the sharpest safe image or brightest patch is obtained.',
        'Mark the approximate focus and measure the distance using a scale.',
        'Compare how the image changes as the card moves; heating, smoke and ignition are not part of this classroom activity.',
      ]
      activity.safetyNote = mergeSafetyNote(asString(activity.safetyNote), 'Teacher-controlled demonstration only. Never look at the Sun directly or through a lens/mirror, and never focus direct sunlight onto paper, card or any combustible surface.')
    }

    const releasedHardProjectile =
      /\b(stone|rock|hard ball)\b/i.test(activityText) &&
      /\b(string|thread|cord|circular)\b/i.test(activityText) &&
      /\b(release|let .* go|throw)\b/i.test(activityText)

    if (releasedHardProjectile) {
      activity.steps = [
        'Use a soft foam ball attached securely to a string; the teacher performs the demonstration in a clear area.',
        'Move the foam ball slowly in a circular path without releasing it.',
        'Pause at several positions and ask students to draw the tangent direction the ball would follow if the string were removed.',
        'Compare the tangent arrows and connect them to the changing direction of velocity in circular motion.',
      ]
      activity.safetyNote = mergeSafetyNote(
        asString(activity.safetyNote),
        'Do not release stones or other hard projectiles in class. Use a soft tethered object under teacher control.',
      )
    }

    const hydrogenGeneration = /\b(hydrogen gas|hydrogen|h2\b)\b/i.test(activityText) && /\b(acid|metal|zinc|magnesium|electrolysis|generate|evolve|collect)\b/i.test(activityText)
    if (hydrogenGeneration) {
      activity.safetyNote = mergeSafetyNote(asString(activity.safetyNote), 'Keep hydrogen generation and collection away from open flames, sparks and hot surfaces. Do not use an ignition or pop test as a student activity; any teacher-only demonstration must use a tiny quantity with eye protection and clear separation from learners.')
    }

    if (/\b(knife|blade|scalpel|cut a .*potato|cut .* into .*halves)\b/i.test(activityText)) {
      activity.steps = (activity.steps as unknown[]).map((item) =>
        typeof item === 'string' && /\bcut\b/i.test(item)
          ? 'Use material that has been pre-cut by the teacher before class; students should not handle a knife or blade.'
          : item,
      )
      activity.safetyNote = mergeSafetyNote(
        asString(activity.safetyNote),
        'Any cutting must be completed by the teacher or another responsible adult before students handle the material.',
      )
    }
  }

  const relevantSafety: string[] = []

  for (const key of ['activity', 'visualize'] as const) {
    const section = asRecord(fullLesson[key])
    if (!section) continue
    const sectionSafety = safetyGuidance(JSON.stringify(section))
    if (!sectionSafety) continue
    relevantSafety.push(sectionSafety)
    section.safetyNote = mergeSafetyNote(asString(section.safetyNote), sectionSafety)
  }

  const howToTeach = asRecord(fullLesson.howToTeach)
  const teachingSafety = [...new Set(relevantSafety)].join(' ')
  if (howToTeach && teachingSafety) {
    const cues = Array.isArray(howToTeach.teacherCues)
      ? howToTeach.teacherCues.filter((item): item is string => typeof item === 'string')
      : []
    if (!cues.some((item) => /safety|supervision|goggle|teacher.*only/i.test(item))) {
      howToTeach.teacherCues = [...cues, `Safety: ${teachingSafety}`]
    }
  }

  return lesson
}

function sectionHasRequiredContent(key: string, section: JsonRecord | null) {
  if (!section) return false

  const strings = (...values: unknown[]) =>
    values.some((value) => typeof value === 'string' && value.trim().length >= 12)
  const stringArray = (value: unknown, minimum = 1) =>
    Array.isArray(value) &&
    value.filter((item) => typeof item === 'string' && item.trim().length >= 4).length >= minimum
  const questions = (value: unknown) =>
    Array.isArray(value) &&
    value.some((item) => {
      const record = asRecord(item)
      return Boolean(record && strings(record.question))
    })

  if (key === 'boardPlan') return strings(section.text)
  if (key === 'hook') return strings(section.teacherScript, section.teacherPrompt)
  if (key === 'define' || key === 'explain') return strings(section.teacherScript)
  if (key === 'visualize') {
    return strings(section.teacherInstructions) && stringArray(section.boardDrawingSteps, 2)
  }
  if (key === 'activity') {
    return strings(section.objective, section.title) && stringArray(section.steps, 2)
  }
  if (key === 'example') {
    return strings(section.explanation, section.title) && stringArray(section.steps, 1)
  }
  if (key === 'howToTeach') return stringArray(section.teacherCues, 1)
  if (key === 'practice' || key === 'checkUnderstanding') return questions(section.questions)
  if (key === 'materials') return stringArray(section.items, 1)
  return true
}

function completeLessonIssues(lesson: JsonRecord) {
  const fullLesson = asRecord(lesson.fullLesson)
  if (!fullLesson) return ['fullLesson']

  const required = [
    'boardPlan',
    'hook',
    'define',
    'explain',
    'visualize',
    'activity',
    'example',
    'howToTeach',
    'practice',
    'checkUnderstanding',
    'materials',
  ]

  return required.filter((key) =>
    !sectionHasRequiredContent(key, asRecord(fullLesson[key])),
  )
}

function evidenceTokens(text: string) {
  const stop = new Set([
    'about','after','again','also','before','class','classroom','could','from',
    'have','into','lesson','should','students','teacher','their','these','this',
    'through','using','with','would','your',
  ])

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+()-]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !stop.has(token)),
  )
}

function augmentActivityEvidencePages(
  lesson: JsonRecord,
  chunks: Chunk[],
  allowed: Set<number>,
) {
  const fullLesson = asRecord(lesson.fullLesson)
  const activity = asRecord(fullLesson?.activity)
  if (!activity) return lesson

  const materials = Array.isArray(activity.materials)
    ? activity.materials.filter((item): item is string => typeof item === 'string')
    : []
  const steps = Array.isArray(activity.steps)
    ? activity.steps.filter((item): item is string => typeof item === 'string')
    : []

  const activityText = [
    asString(activity.title) ?? '',
    asString(activity.objective) ?? '',
    ...materials,
    ...steps,
  ].join(' ')
  const activityTokens = evidenceTokens(activityText)
  if (activityTokens.size === 0) return lesson

  const scored = chunks
    .map((chunk) => {
      const chunkTokens = evidenceTokens(chunk.content)
      let score = 0
      for (const token of activityTokens) {
        if (chunkTokens.has(token)) score += 1
      }
      return { chunk, score }
    })
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || best.score < 3) return lesson

  const pages = new Set(
    Array.isArray(activity.sourcePages)
      ? activity.sourcePages.filter((page): page is number =>
          typeof page === 'number' && allowed.has(page),
        )
      : [],
  )

  for (let page = best.chunk.page_start; page <= best.chunk.page_end; page += 1) {
    if (allowed.has(page)) pages.add(page)
  }

  activity.sourcePages = [...pages].sort((a, b) => a - b)
  return lesson
}

function generationFailure(error: unknown) {
  const raw = String(error instanceof Error ? error.message : error).replace(/^Error:\s*/, '')
  if (/GEMINI_(408|429|500|502|503|504)|EMBED_(408|429|500|502|503|504)|AbortError|fetch/i.test(raw)) {
    return { status: 503, message: 'ChalkBox AI is temporarily busy. Your private textbook and saved lessons are unaffected; retry in a few minutes.' }
  }
  if (/not ready|does not belong/i.test(raw)) {
    return { status: 404, message: 'This textbook is not ready or does not belong to your account.' }
  }
  return { status: 500, message: 'ChalkBox could not generate this lesson. Your private textbook and existing saved lessons were not changed.' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, message: 'POST required.' }, 405)

  try {
    const user = await requireUser(req)
    await enforceDailyLimit(user.id, 'textbook_generation', 15)
    const body = normalize(asRecord(await req.json()))
    if (!body) return json({ ok: false, message: 'Invalid lesson-generation request.' }, 400)

    const document = await loadDocument(user.id, body.documentId)
    const totalPages = asNumber(document.total_pages)
    if (
      body.pageStart !== null &&
      body.pageEnd !== null &&
      totalPages !== null &&
      (body.pageStart > totalPages || body.pageEnd > totalPages)
    ) {
      return json(
        {
          ok: false,
          message: `This PDF has ${totalPages} pages. Choose a page range between 1 and ${totalPages}.`,
        },
        400,
      )
    }

    const chunks = await retrieve(body, user.auth)
    if (chunks.length === 0) return json({ ok: false, message: 'No source context was available for a complete lesson. Try selecting the chapter page range.' }, 422)

    const allowedPages = [...new Set(chunks.flatMap((chunk) => {
      const pages: number[] = []
      for (let page = chunk.page_start; page <= chunk.page_end; page += 1) pages.push(page)
      return pages
    }))].sort((a,b) => a-b)
    const context = chunks.map((chunk, index) => `[SOURCE ${index + 1} | pages ${chunk.page_start}-${chunk.page_end}]\n${chunk.content}`).join('\n\n').slice(0, 60000)

    let generated = await geminiJsonFallback([{ text: generationPrompt(body, asString(document.file_name) ?? 'Uploaded textbook', context, allowedPages) }], ['gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash','gemini-3.5-flash-lite'])
    if (asString(generated.value.status) === 'OUT_OF_SCOPE') {
      return json({ ok: false, message: asString(generated.value.message) ?? 'ChalkBox Textbook Mode currently supports Class 8-10 Science textbooks only.' }, 422)
    }
    if (asString(generated.value.status) === 'INSUFFICIENT_SOURCE') {
      return json({ ok: false, message: asString(generated.value.message) ?? 'The retrieved pages do not support this lesson request.' }, 422)
    }
    let lesson = asRecord(generated.value.lesson)
    if (!lesson) throw new Error('Generator returned an invalid lesson structure.')

    const allowedPageSet = new Set(allowedPages)
    let sanitizedLesson = augmentActivityEvidencePages(
      applySafetyGuardrails(
        sanitizeSourcePages(lesson, allowedPageSet) as JsonRecord,
      ),
      chunks,
      allowedPageSet,
    )

    let completenessIssues = completeLessonIssues(sanitizedLesson)
    if (completenessIssues.length > 0) {
      const repairPrompt = `${generationPrompt(body, asString(document.file_name) ?? 'Uploaded textbook', context, allowedPages)}

CRITICAL COMPLETENESS REPAIR:
A previous draft omitted required classroom sections: ${completenessIssues.join(', ')}.
Generate the COMPLETE lesson again. Every required fullLesson section in the schema must be present and meaningful. Never return a shortened 3-step lesson for a ${body.durationMinutes}-minute request.`

      generated = await geminiJsonFallback(
        [{ text: repairPrompt }],
        ['gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash','gemini-3.5-flash-lite'],
      )

      lesson = asRecord(generated.value.lesson)
      if (!lesson) {
        return json({
          ok: false,
          message: 'ChalkBox could not produce a complete classroom-ready lesson from this draft. Your textbook is preserved; please retry.',
        }, 422)
      }

      sanitizedLesson = augmentActivityEvidencePages(
        applySafetyGuardrails(
          sanitizeSourcePages(lesson, allowedPageSet) as JsonRecord,
        ),
        chunks,
        allowedPageSet,
      )

      completenessIssues = completeLessonIssues(sanitizedLesson)
      if (completenessIssues.length > 0) {
        return json({
          ok: false,
          message: 'ChalkBox could not produce a complete classroom-ready lesson from this draft. Your textbook is preserved; please retry.',
          issues: completenessIssues.map((key) => `Missing or incomplete section: ${key}`),
        }, 422)
      }
    }
    const auditPrompt = `Audit this Class ${body.classLevel} Science lesson ONLY against the supplied source context. Return JSON {"pass":true,"scienceAccuracy":0-10,"sourceFaithfulness":0-10,"ageAppropriateness":0-10,"classroomFeasibility":0-10,"issues":["..."]}. Fail if the source is primarily a non-Science subject, if the lesson invents source claims/pages, strengthens a source statement beyond its qualifiers or scope, materially contradicts the source, omits applicable source cautions, gives chemical/flame/sharp-object guidance without explicit teacher supervision and suitable precautions, focuses direct sunlight onto paper/card or another combustible surface, generates/collects hydrogen without explicitly keeping it away from flames/sparks/hot surfaces, asks students to touch/feel a reaction vessel to judge temperature instead of using a thermometer or safe teacher-only observation, or is not teacher-ready.\nSOURCE:\n${context}\nLESSON:\n${JSON.stringify(sanitizedLesson)}`
    const auditResult = await geminiJsonFallback([{ text: auditPrompt }], ['gemini-3.5-flash-lite','gemini-3.5-flash','gemini-3.6-flash','gemini-3.7-flash'])
    const audit = auditResult.value
    if (audit.pass !== true) return json({ ok: false, message: 'Independent source/science audit rejected this lesson.', issues: Array.isArray(audit.issues) ? audit.issues : [] }, 422)

    const generationId = crypto.randomUUID()
    const bundle: JsonRecord = {
      version: 1,
      generationId,
      generatedAt: new Date().toISOString(),
      request: body,
      audit,
      lesson: sanitizedLesson,
      formulaCards: Array.isArray(generated.value.formulaCards) ? generated.value.formulaCards : [],
      disclosure: 'Generated from a private teacher-uploaded PDF. Source pages were retrieved from the teacher-owned index and independently audited.',
      sourceDocument: { id: body.documentId, fileName: asString(document.file_name), allowedPages },
      modelRouting: { generationModel: generated.model, auditModel: auditResult.model },
      timingPolicy: 'deterministic-ui-v1',
      lessonMode: 'complete',
    }

    const planResponse = await adminRest('/rest/v1/teacher_plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        owner_id: user.id, source_mode: 'private_textbook', source_id: generationId,
        title: asString(sanitizedLesson.title) ?? body.teacherRequest,
        class_level: body.classLevel, subject: 'Science', duration_minutes: body.durationMinutes,
        language: body.language, resource_level: body.resourceLevel, payload: bundle,
      }),
    })
    const plans = await readJson<JsonRecord[]>(planResponse, 'Could not save generated lesson')
    const planId = asString(plans[0]?.id)
    if (!planId) throw new Error('Generated lesson did not receive a cloud plan ID.')

    await recordUsage(user.id, 'textbook_generation')
    return json({ ok: true, planId, bundle })
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error)
    if (message === 'AUTH_REQUIRED') return json({ ok: false, message: 'Sign in to generate from private textbooks.' }, 401)
    if (message === 'DAILY_LIMIT') return json({ ok: false, message: 'Your daily source-grounded generation limit has been reached. Try again after the quota resets.' }, 429)
    const failure = generationFailure(error)
    return json({ ok: false, message: failure.message }, failure.status)
  }
})
