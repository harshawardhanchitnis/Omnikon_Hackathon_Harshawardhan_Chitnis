import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  GoogleGenAI,
  ThinkingLevel,
} from '@google/genai'
import dotenv from 'dotenv'

import {
  extractPdfRange,
} from './extract-pdf-text'

/* ============================================================
   CHALKBOX — FULL LESSON QUALITY GATE FINAL 2.0

   RUN ONLY AFTER:

     pnpm exec tsx scripts/ingest-textbooks.ts --structured-only

   PURPOSE

   FINAL 7.0 validates every 2-page batch with Flash-Lite.

   This script then audits each COMPLETE lesson with the
   stronger Gemini 3.7 Flash model using HIGH thinking.

   PASS → eligible for embedding smoke test
   FAIL → one strictly targeted Gemini 3.7 repair round → re-audit
   STILL FAIL → save report and BLOCK embeddings

   Before any automatic repair, the original lesson JSON is backed up.
============================================================ */

/* ============================================================
   ENV
============================================================ */

dotenv.config({
  path: path.resolve(
    process.cwd(),
    '.env.ingest.local',
  ),
})

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim()

const GEMINI_AUDIT_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  'gemini-3.7-flash'

if (!GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY is missing from .env.ingest.local',
  )
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
})

/* ============================================================
   PATHS / SETTINGS
============================================================ */

const ROOT = process.cwd()

const TEXTBOOK_DIRECTORY = path.join(
  ROOT,
  'data',
  'textbooks',
)

const STRUCTURED_DIRECTORY = path.join(
  ROOT,
  'data',
  'ingestion-output',
  'structured-lessons',
)

const AUDIT_DIRECTORY = path.join(
  ROOT,
  'data',
  'ingestion-output',
  'lesson-audits',
)

const AUDIT_MANIFEST_PATH = path.join(
  ROOT,
  'data',
  'ingestion-output',
  'lesson-audit-manifest.json',
)

const REQUEST_GAP_MS = 13_000
const MAX_ATTEMPTS = 3
const MAX_OUTPUT_TOKENS = 8_000
const MAX_REPAIR_OUTPUT_TOKENS = 40_000
const MAX_LESSON_REPAIR_ROUNDS = 1

/* ============================================================
   LESSONS
============================================================ */

type LessonDefinition = {
  lessonKey: string
  classLevel: 8 | 9 | 10
  subject: 'Science'
  title: string
  sourceFileName: string
  startPage: number
  endPage: number
}

const lessons: LessonDefinition[] = [
  {
    lessonKey:
      'class-8-chemical-effects-electric-current',
    classLevel: 8,
    subject: 'Science',
    title:
      'Chemical Effects of Electric Current',
    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
    startPage: 1,
    endPage: 12,
  },
  {
    lessonKey:
      'class-8-materials-metals-non-metals',
    classLevel: 8,
    subject: 'Science',
    title:
      'Materials: Metals and Non-Metals',
    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
    startPage: 13,
    endPage: 24,
  },
  {
    lessonKey:
      'class-9-force-laws-motion',
    classLevel: 9,
    subject: 'Science',
    title:
      'Force and Laws of Motion',
    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
    startPage: 1,
    endPage: 17,
  },
  {
    lessonKey:
      'class-9-work-energy',
    classLevel: 9,
    subject: 'Science',
    title:
      'Work and Energy',
    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
    startPage: 18,
    endPage: 31,
  },
  {
    lessonKey:
      'class-10-life-processes',
    classLevel: 10,
    subject: 'Science',
    title:
      'Life Processes',
    sourceFileName:
      'NCERT-Class-10-Life-Processes-official.pdf',
    startPage: 1,
    endPage: 21,
  },
  {
    lessonKey:
      'class-10-electricity',
    classLevel: 10,
    subject: 'Science',
    title:
      'Electricity',
    sourceFileName:
      'NCERT-Class-10-Electricity-official.pdf',
    startPage: 1,
    endPage: 24,
  },
]

/* ============================================================
   SAVED KNOWLEDGE TYPES
============================================================ */

type KnowledgeItem = {
  kind: string
  title: string
  text: string
  sourcePages: number[]
  details: string[]
}

type Topic = {
  title: string
  sourcePages: number[]
  overview: string
  items: KnowledgeItem[]
  lessonPages?: number[]
}

type LessonFile = {
  schemaVersion: number
  pipelineVersion?: string
  generatedAt?: string
  lessonKey: string
  classLevel: number
  subject: string
  title: string
  sourceFileName?: string
  sourcePageRange: string
  documentModel?: string
  promptVersion?: number
  totalSourcePages?: number
  representedSourcePages: number[]
  topicCount: number
  knowledgeItemCount: number
  topics: Topic[]
  [key: string]: unknown
}

type RepairOutput = {
  topics: Topic[]
}

/* ============================================================
   AUDIT TYPES
============================================================ */

type Status =
  | 'pass'
  | 'fail'
  | 'not_applicable'

type AuditIssue = {
  issueType: string
  targetPath: string
  title: string
  description: string
  sourcePages: number[]
}

type LessonAudit = {
  conceptCoverage: Status
  definitionCoverage: Status
  relationshipCoverage: Status
  exampleCoverage: Status
  exceptionCoverage: Status
  formulaCoverage: Status
  activityFidelity: Status
  visualCoverage: Status
  pageCoverage: Status
  crossBatchConsistency: Status
  provenanceAccuracy: Status

  unsupportedClaims: string[]
  oversimplifications: string[]
  activityConclusionErrors: string[]
  contradictions: string[]
  avoidableDuplicates: string[]

  qualityPass: boolean
  summary: string
  issues: AuditIssue[]
}

/* ============================================================
   AUDIT SCHEMA
============================================================ */

const statusSchema = {
  type: 'string',
  enum: [
    'pass',
    'fail',
    'not_applicable',
  ],
}

const auditSchema = {
  type: 'object',
  properties: {
    conceptCoverage: statusSchema,
    definitionCoverage: statusSchema,
    relationshipCoverage: statusSchema,
    exampleCoverage: statusSchema,
    exceptionCoverage: statusSchema,
    formulaCoverage: statusSchema,
    activityFidelity: statusSchema,
    visualCoverage: statusSchema,
    pageCoverage: statusSchema,
    crossBatchConsistency: statusSchema,
    provenanceAccuracy: statusSchema,

    unsupportedClaims: {
      type: 'array',
      items: { type: 'string' },
    },

    oversimplifications: {
      type: 'array',
      items: { type: 'string' },
    },

    activityConclusionErrors: {
      type: 'array',
      items: { type: 'string' },
    },

    contradictions: {
      type: 'array',
      items: { type: 'string' },
    },

    avoidableDuplicates: {
      type: 'array',
      items: { type: 'string' },
    },

    qualityPass: {
      type: 'boolean',
    },

    summary: {
      type: 'string',
    },

    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issueType: {
            type: 'string',
            enum: [
              'missing',
              'inaccurate',
              'provenance',
              'activity_fidelity',
              'unsupported_claim',
              'oversimplification',
              'duplication',
              'contradiction',
            ],
          },
          targetPath: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          sourcePages: {
            type: 'array',
            items: {
              type: 'integer',
            },
          },
        },
        required: [
          'issueType',
          'targetPath',
          'title',
          'description',
          'sourcePages',
        ],
      },
    },
  },
  required: [
    'conceptCoverage',
    'definitionCoverage',
    'relationshipCoverage',
    'exampleCoverage',
    'exceptionCoverage',
    'formulaCoverage',
    'activityFidelity',
    'visualCoverage',
    'pageCoverage',
    'crossBatchConsistency',
    'provenanceAccuracy',
    'unsupportedClaims',
    'oversimplifications',
    'activityConclusionErrors',
    'contradictions',
    'avoidableDuplicates',
    'qualityPass',
    'summary',
    'issues',
  ],
}

const repairSchema = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          sourcePages: {
            type: 'array',
            items: { type: 'integer' },
          },
          overview: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  enum: [
                    'concept',
                    'definition',
                    'formula',
                    'example',
                    'activity',
                    'visual',
                  ],
                },
                title: { type: 'string' },
                text: { type: 'string' },
                sourcePages: {
                  type: 'array',
                  items: { type: 'integer' },
                },
                details: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: [
                'kind',
                'title',
                'text',
                'sourcePages',
                'details',
              ],
            },
          },
        },
        required: [
          'title',
          'sourcePages',
          'overview',
          'items',
        ],
      },
    },
  },
  required: ['topics'],
}

/* ============================================================
   HELPERS
============================================================ */

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/\u00ad/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort(
    (a, b) => a - b,
  )
}

function sourceLabels(
  source: string,
  regex: RegExp,
  prefix: string,
) {
  const labels = new Set<string>()

  for (const match of source.matchAll(regex)) {
    labels.add(`${prefix} ${match[1]}`)
  }

  return [...labels]
}

function activityLabels(source: string) {
  return sourceLabels(
    source,
    /\bActivity\s+(\d+(?:\.\d+)+)\b/gi,
    'Activity',
  )
}

function figureLabels(source: string) {
  return sourceLabels(
    source,
    /\bFigure\s+(\d+(?:\.\d+)+)\b/gi,
    'Figure',
  )
}

function tableLabels(source: string) {
  return sourceLabels(
    source,
    /\bTable\s+(\d+(?:\.\d+)+)\b/gi,
    'Table',
  )
}

function containsLabel(title: string, label: string) {
  return normalize(title)
    .toLowerCase()
    .includes(label.toLowerCase())
}

function sourcePageForLabel(
  source: string,
  label: string,
) {
  const regex =
    /<<< SOURCE PDF PAGE (\d+) >>>([\s\S]*?)<<< END SOURCE PDF PAGE \1 >>>/g

  for (const match of source.matchAll(regex)) {
    if (
      normalize(match[2])
        .toLowerCase()
        .includes(label.toLowerCase())
    ) {
      return Number(match[1])
    }
  }

  return null
}

function sourceLabelCoverageFailures(
  source: string,
  structured: LessonFile,
) {
  const activities =
    structured.topics.flatMap((topic) =>
      topic.items.filter(
        (item) => item.kind === 'activity',
      ),
    )

  const visuals =
    structured.topics.flatMap((topic) =>
      topic.items.filter(
        (item) => item.kind === 'visual',
      ),
    )

  const missingActivities =
    activityLabels(source).filter(
      (label) =>
        !activities.some((item) =>
          containsLabel(item.title, label),
        ),
    )

  const missingVisuals = [
    ...figureLabels(source),
    ...tableLabels(source),
  ].filter(
    (label) =>
      !visuals.some((item) =>
        containsLabel(item.title, label),
      ),
  )

  return {
    missingActivities,
    missingVisuals,
  }
}

let lastRequestAt = 0

async function pace() {
  if (lastRequestAt === 0) {
    lastRequestAt = Date.now()
    return
  }

  const remaining =
    REQUEST_GAP_MS -
    (Date.now() - lastRequestAt)

  if (remaining > 0) {
    console.log(
      `   ⏳ waiting ${Math.ceil(remaining / 1000)}s`,
    )
    await sleep(remaining)
  }

  lastRequestAt = Date.now()
}

function retryable(text: string) {
  return /429|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded|rate.?limit|ETIMEDOUT/i.test(
    text,
  )
}

async function retry<T>(
  label: string,
  action: () => Promise<T>,
) {
  let finalError: unknown

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await pace()
      return await action()
    } catch (error) {
      finalError = error
      const message =
        error instanceof Error
          ? error.message
          : String(error)

      if (
        !retryable(message) ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error
      }

      const seconds =
        attempt === 1 ? 20 : 40

      console.log(
        `   ${label}: retrying in ${seconds}s`,
      )

      await sleep(seconds * 1000)
    }
  }

  throw finalError
}


type AuditResponseLike = {
  text?: string
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
    totalTokenCount?: number
  }
}

/* ============================================================
   READ SOURCE / LESSON
============================================================ */

async function readSource(
  lesson: LessonDefinition,
) {
  const result = await extractPdfRange(
    path.join(
      TEXTBOOK_DIRECTORY,
      lesson.sourceFileName,
    ),
    lesson.startPage,
    lesson.endPage,
  )

  const bad = result.pages.filter(
    (page) =>
      page.verdict !== 'readable',
  )

  if (bad.length > 0) {
    throw new Error(
      `${lesson.title}: unreadable source pages.`,
    )
  }

  return result.pages
    .map((page) =>
      [
        `<<< SOURCE PDF PAGE ${page.pageNumber} >>>`,
        normalize(page.text),
        `<<< END SOURCE PDF PAGE ${page.pageNumber} >>>`,
      ].join('\n'),
    )
    .join('\n\n')
}

async function readLesson(
  lesson: LessonDefinition,
) {
  const fullPath = path.join(
    STRUCTURED_DIRECTORY,
    `${lesson.lessonKey}.json`,
  )

  const parsed = JSON.parse(
    await fs.readFile(
      fullPath,
      'utf8',
    ),
  ) as LessonFile

  if (
    parsed.lessonKey !== lesson.lessonKey
  ) {
    throw new Error(
      `${lesson.title}: structured lessonKey mismatch.`,
    )
  }

  return parsed
}

/* ============================================================
   DETERMINISTIC COVERAGE
============================================================ */

function missingPages(
  lesson: LessonDefinition,
  structured: LessonFile,
) {
  const represented = new Set(
    structured.topics.flatMap(
      (topic) =>
        topic.items.flatMap(
          (item) => item.sourcePages,
        ),
    ),
  )

  const missing: number[] = []

  for (
    let page = lesson.startPage;
    page <= lesson.endPage;
    page += 1
  ) {
    if (!represented.has(page)) {
      missing.push(page)
    }
  }

  return missing
}

function normalizeTopic(
  topic: Topic,
  lesson: LessonDefinition,
): Topic {
  const sourcePages = uniqueNumbers(topic.sourcePages)

  return {
    title: normalize(topic.title),
    sourcePages,
    overview: normalize(topic.overview),
    items: topic.items.map((item) => ({
      kind: normalize(item.kind),
      title: normalize(item.title),
      text: normalize(item.text),
      sourcePages: uniqueNumbers(item.sourcePages),
      details: item.details.map(normalize).filter(Boolean),
    })),
    lessonPages: uniqueNumbers(
      sourcePages.map(
        (page) => page - lesson.startPage + 1,
      ),
    ),
  }
}

function recalculateLesson(
  original: LessonFile,
  topics: Topic[],
  lesson: LessonDefinition,
): LessonFile {
  const normalizedTopics = topics.map(
    (topic) => normalizeTopic(topic, lesson),
  )

  return {
    ...original,
    generatedAt: new Date().toISOString(),
    topics: normalizedTopics,
    topicCount: normalizedTopics.length,
    knowledgeItemCount:
      normalizedTopics.reduce(
        (total, topic) => total + topic.items.length,
        0,
      ),
    representedSourcePages:
      uniqueNumbers(
        normalizedTopics.flatMap((topic) =>
          topic.items.flatMap((item) => item.sourcePages),
        ),
      ),
  }
}

function validateLessonStructure(
  lesson: LessonDefinition,
  structured: LessonFile,
) {
  if (structured.topics.length === 0) {
    throw new Error(`${lesson.title}: repaired lesson has no topics.`)
  }

  for (let topicIndex = 0; topicIndex < structured.topics.length; topicIndex += 1) {
    const topic = structured.topics[topicIndex]

    if (!topic.title.trim() || !topic.overview.trim() || topic.items.length === 0) {
      throw new Error(`${lesson.title}: invalid topic ${topicIndex}.`)
    }

    for (const page of topic.sourcePages) {
      if (page < lesson.startPage || page > lesson.endPage) {
        throw new Error(`${lesson.title}: topic ${topicIndex} has invalid page ${page}.`)
      }
    }

    for (let itemIndex = 0; itemIndex < topic.items.length; itemIndex += 1) {
      const item = topic.items[itemIndex]

      if (!item.title.trim() || !item.text.trim()) {
        throw new Error(`${lesson.title}: invalid item ${topicIndex}/${itemIndex}.`)
      }

      if (item.sourcePages.length === 0) {
        throw new Error(`${lesson.title}: item ${topicIndex}/${itemIndex} lacks provenance.`)
      }

      for (const page of item.sourcePages) {
        if (
          page < lesson.startPage ||
          page > lesson.endPage ||
          !topic.sourcePages.includes(page)
        ) {
          throw new Error(`${lesson.title}: item ${topicIndex}/${itemIndex} has invalid provenance.`)
        }
      }

      if (
        item.kind === 'activity' &&
        !item.details.some((detail) => /^purpose\s*:/i.test(detail))
      ) {
        throw new Error(`${lesson.title}: activity ${topicIndex}/${itemIndex} lacks Purpose:.`)
      }
    }
  }

  const missing = missingPages(lesson, structured)
  if (missing.length > 0) {
    throw new Error(`${lesson.title}: repaired lesson misses pages ${missing.join(', ')}.`)
  }
}

function issueTargetSet(audit: LessonAudit) {
  return new Set(
    audit.issues
      .filter((issue) => issue.targetPath !== 'NEW')
      .map((issue) => issue.targetPath),
  )
}

function assertTargetedRepair(
  before: LessonFile,
  after: LessonFile,
  audit: LessonAudit,
) {
  if (after.topics.length < before.topics.length) {
    throw new Error('Final repair removed an existing topic.')
  }

  const flagged = issueTargetSet(audit)

  for (let topicIndex = 0; topicIndex < before.topics.length; topicIndex += 1) {
    const oldTopic = before.topics[topicIndex]
    const newTopic = after.topics[topicIndex]

    if (!newTopic || oldTopic.title !== newTopic.title) {
      throw new Error(`Final repair changed topic identity at ${topicIndex}.`)
    }

    if (
      !oldTopic.sourcePages.every((page) =>
        newTopic.sourcePages.includes(page),
      )
    ) {
      throw new Error(`Final repair removed topic provenance at ${topicIndex}.`)
    }

    if (newTopic.items.length < oldTopic.items.length) {
      throw new Error(`Final repair removed item(s) from topic ${topicIndex}.`)
    }

    const overviewPath = `topics[${topicIndex}].overview`

    if (
      !flagged.has(overviewPath) &&
      oldTopic.overview !== newTopic.overview
    ) {
      throw new Error(`Final repair changed unflagged ${overviewPath}.`)
    }

    for (let itemIndex = 0; itemIndex < oldTopic.items.length; itemIndex += 1) {
      const oldItem = oldTopic.items[itemIndex]
      const newItem = newTopic.items[itemIndex]
      const itemPath = `topics[${topicIndex}].items[${itemIndex}]`

      if (
        !newItem ||
        oldItem.kind !== newItem.kind ||
        oldItem.title !== newItem.title
      ) {
        throw new Error(`Final repair changed item identity at ${itemPath}.`)
      }

      if (
        !flagged.has(itemPath) &&
        JSON.stringify(oldItem) !== JSON.stringify(newItem)
      ) {
        throw new Error(`Final repair changed unflagged ${itemPath}.`)
      }
    }
  }
}

/* ============================================================
   PROMPT
============================================================ */

function buildPrompt(
  lesson: LessonDefinition,
  source: string,
  structured: LessonFile,
) {
  const payload = {
    lessonKey: structured.lessonKey,
    classLevel: structured.classLevel,
    subject: structured.subject,
    title: structured.title,
    topics: structured.topics.map(
      (topic) => ({
        title: topic.title,
        sourcePages: topic.sourcePages,
        overview: topic.overview,
        items: topic.items,
      }),
    ),
  }

  const activities = activityLabels(source)
  const figures = figureLabels(source)
  const tables = tableLabels(source)

  return `
You are the FINAL scientific release auditor for the ChalkBox seed RAG corpus.

Class: ${lesson.classLevel}
Subject: ${lesson.subject}
Lesson: ${lesson.title}
Source pages: ${lesson.startPage}-${lesson.endPage}

Compare the COMPLETE original lesson with the COMPLETE structured corpus.

The corpus was created in 2-page batches. Your whole-lesson perspective must catch anything the smaller batch QA missed.

Evaluate EVERY category:

conceptCoverage
definitionCoverage
relationshipCoverage
exampleCoverage
exceptionCoverage
formulaCoverage
activityFidelity
visualCoverage
pageCoverage
crossBatchConsistency
provenanceAccuracy

Use only:
pass
fail
not_applicable

Check especially:

1. Missing important concepts.
2. Missing relationships or dependencies even when individual definitions exist.
3. Missing meaningful examples, conditions or exceptions.
4. Formula correctness, quantities, units and variables.
5. Unsupported claims.
6. Material oversimplifications.
7. Cross-batch contradictions.
8. Needless duplicate knowledge created by batch boundaries.
9. Incorrect sourcePages.
10. Experiment/activity purpose, method and conclusion fidelity.
11. Scope and quantifier fidelity: do not broaden "us/humans" to "animals", "some" to "all", a named subgroup to an entire class, or a conditional statement into a universal claim.
12. Biologically precise wording: flag wording that implies a stronger/different process than the source supports.
13. Internal consistency between summaries, overviews and stored items.

EXPLICIT SOURCE LABELS

Activities:
${activities.length > 0 ? activities.map((label) => `- ${label}`).join('\n') : '- NONE'}

Figures:
${figures.length > 0 ? figures.map((label) => `- ${label}`).join('\n') : '- NONE'}

Tables:
${tables.length > 0 ? tables.map((label) => `- ${label}`).join('\n') : '- NONE'}

Every explicit Activity must have an activity item whose title preserves its label. Every explicit Figure/Table caption must have a visual item whose title preserves its label.

ACTIVITY CONTRACT — CRITICAL

For every source activity:

- identify the source-stated purpose or conclusion;
- verify the stored activity preserves it;
- do not accept a procedure-only representation when the source explicitly states what the activity demonstrates/investigates/verifies;
- verify every stored activity contains a source-grounded Purpose: detail;
- if the source explicitly states what the activity demonstrates/investigates/verifies, verify the Purpose: preserves that scientific proposition rather than a generic procedural goal;
- if the source explicitly supports a conclusion, verify the activity preserves that conclusion;
- do not allow the activity to claim that a variable was proven necessary merely because it was present.

Determine what was actually manipulated/contrasted and what conditions were held common.

Populate:

unsupportedClaims
oversimplifications
activityConclusionErrors
contradictions
avoidableDuplicates

If ANY category fails or ANY of those arrays is non-empty:
qualityPass MUST be false
and issues MUST contain actionable entries.

Target paths:

topics[index].overview

topics[index].items[index]

NEW

Do not fail merely because the RAG corpus excludes rhetorical prose, headers/footers, duplicate textbook wording, decorative material or exercise-question wording.

ORIGINAL COMPLETE LESSON
========================

${source}

STRUCTURED COMPLETE LESSON
==========================

${JSON.stringify(payload, null, 2)}

Return only JSON matching the required schema.
`.trim()
}

function augmentAuditWithDeterministicGates(
  lesson: LessonDefinition,
  source: string,
  structured: LessonFile,
  audit: LessonAudit,
): LessonAudit {
  const issues = [...audit.issues]
  let pageCoverage = audit.pageCoverage
  let activityFidelity = audit.activityFidelity
  let visualCoverage = audit.visualCoverage

  const missing = missingPages(lesson, structured)

  for (const page of missing) {
    issues.push({
      issueType: 'missing',
      targetPath: 'NEW',
      title: 'Missing page-level knowledge',
      description: `Source page ${page} has no knowledge item.`,
      sourcePages: [page],
    })
  }

  if (missing.length > 0) {
    pageCoverage = 'fail'
  }

  const labels = sourceLabelCoverageFailures(source, structured)

  for (const label of labels.missingActivities) {
    issues.push({
      issueType: 'missing',
      targetPath: 'NEW',
      title: `Missing ${label}`,
      description: `${label} appears explicitly in the source but is absent from the structured lesson.`,
      sourcePages: [sourcePageForLabel(source, label) ?? lesson.startPage],
    })
  }

  if (labels.missingActivities.length > 0) {
    activityFidelity = 'fail'
  }

  for (const label of labels.missingVisuals) {
    issues.push({
      issueType: 'missing',
      targetPath: 'NEW',
      title: `Missing ${label}`,
      description: `${label} appears as an explicit source caption but is absent from visual knowledge.`,
      sourcePages: [sourcePageForLabel(source, label) ?? lesson.startPage],
    })
  }

  if (labels.missingVisuals.length > 0) {
    visualCoverage = 'fail'
  }

  for (let topicIndex = 0; topicIndex < structured.topics.length; topicIndex += 1) {
    const topic = structured.topics[topicIndex]

    for (let itemIndex = 0; itemIndex < topic.items.length; itemIndex += 1) {
      const item = topic.items[itemIndex]

      if (
        item.kind === 'activity' &&
        !item.details.some((detail) => /^purpose\s*:/i.test(detail))
      ) {
        const targetPath = `topics[${topicIndex}].items[${itemIndex}]`

        if (!issues.some((issue) => issue.targetPath === targetPath)) {
          issues.push({
            issueType: 'activity_fidelity',
            targetPath,
            title: 'Activity lacks explicit source-grounded purpose',
            description: 'The activity must preserve a source-grounded Purpose: detail.',
            sourcePages: item.sourcePages,
          })
        }

        activityFidelity = 'fail'
      }
    }
  }

  const hasFailure =
    missing.length > 0 ||
    labels.missingActivities.length > 0 ||
    labels.missingVisuals.length > 0 ||
    activityFidelity === 'fail'

  if (!hasFailure) {
    return audit
  }

  return {
    ...audit,
    pageCoverage,
    activityFidelity,
    visualCoverage,
    qualityPass: false,
    issues,
    summary: normalize(
      `${audit.summary} Deterministic source-label/activity/page gates found additional issue(s).`,
    ),
  }
}

function buildRepairPrompt(
  lesson: LessonDefinition,
  source: string,
  structured: LessonFile,
  audit: LessonAudit,
) {
  return `
You are performing ONE final targeted repair on a ChalkBox structured lesson after a Gemini 3.7 release audit.

Class: ${lesson.classLevel}
Subject: ${lesson.subject}
Lesson: ${lesson.title}
Source pages: ${lesson.startPage}-${lesson.endPage}

Fix ONLY the audit issues.

STRICT CHANGE CONTROL

1. Keep every existing topic in the same order.
2. Keep every existing topic title exactly unchanged.
3. Keep every existing item in the same order.
4. Keep every existing item kind and title exactly unchanged.
5. Existing content may change ONLY when its exact targetPath appears in audit.issues.
6. Never delete existing knowledge.
7. Missing knowledge (targetPath=NEW) may be appended to an existing topic or appended as a new topic.
8. Existing topic sourcePages may expand for appended knowledge but may not shrink.
9. Use only the supplied source.
10. Preserve source scope and quantifiers exactly in meaning: do not broaden humans/us to all animals, some to all, or a specific case into a universal rule.
11. Preserve equations, units, values and scientific relationships.
12. Every activity must contain a source-grounded Purpose: detail.
13. If the source explicitly states what an activity demonstrates/investigates/verifies, the Purpose: must preserve that scientific proposition rather than a generic procedure goal.
14. A variable is not proven merely because it was present; preserve the actually manipulated/contrasted variable and source-supported conclusion.
15. Every explicit Activity X.Y in the source must have an activity item whose title includes that label.
16. Every explicit Figure X.Y or Table X.Y caption must have a visual item whose title includes that label.
17. If a duplication issue is flagged, make the flagged item complementary/non-redundant without introducing new facts; do not delete it.
18. Keep wording concise and independently phrased.

AUDIT ISSUES
============

${JSON.stringify(audit.issues, null, 2)}

ORIGINAL COMPLETE SOURCE
========================

${source}

CURRENT STRUCTURED LESSON
=========================

${JSON.stringify({ topics: structured.topics }, null, 2)}

Return JSON containing the FULL corrected topics array only.
`.trim()
}

/* ============================================================
   AUDIT VALIDATION
============================================================ */

function validateAudit(
  lesson: LessonDefinition,
  audit: LessonAudit,
  structured: LessonFile,
) {
  const statuses = [
    audit.conceptCoverage,
    audit.definitionCoverage,
    audit.relationshipCoverage,
    audit.exampleCoverage,
    audit.exceptionCoverage,
    audit.formulaCoverage,
    audit.activityFidelity,
    audit.visualCoverage,
    audit.pageCoverage,
    audit.crossBatchConsistency,
    audit.provenanceAccuracy,
  ]


  const failSignal =
    statuses.includes('fail') ||
    audit.unsupportedClaims.length > 0 ||
    audit.oversimplifications.length > 0 ||
    audit.activityConclusionErrors.length > 0 ||
    audit.contradictions.length > 0 ||
    audit.avoidableDuplicates.length > 0 ||
    audit.issues.length > 0

  if (failSignal && audit.qualityPass) {
    throw new Error(
      `${lesson.title}: auditor returned PASS despite failure signals.`,
    )
  }

  if (
    failSignal &&
    audit.issues.length === 0
  ) {
    throw new Error(
      `${lesson.title}: auditor found problems but returned no actionable issues.`,
    )
  }

  if (
    !failSignal &&
    !audit.qualityPass
  ) {
    throw new Error(
      `${lesson.title}: auditor returned FAIL without a failure signal.`,
    )
  }
}

/* ============================================================
   AUDIT ONE LESSON
============================================================ */

async function auditLesson(
  lesson: LessonDefinition,
) {
  console.log(`\n${lesson.title}`)

  const source = await readSource(lesson)
  let structured = await readLesson(lesson)

  validateLessonStructure(
    lesson,
    structured,
  )

  const lessonPath = path.join(
    STRUCTURED_DIRECTORY,
    `${lesson.lessonKey}.json`,
  )

  const backupPath = path.join(
    AUDIT_DIRECTORY,
    `${lesson.lessonKey}.pre-final-audit.json`,
  )

  let repairRounds = 0
  let repaired = false
  let lastAudit: LessonAudit | null = null
  let lastUsage: unknown = null

  while (true) {
    console.log(
      `   ${GEMINI_AUDIT_MODEL} → HIGH-thinking full lesson audit${repairRounds > 0 ? ' (re-audit)' : ''}`,
    )

    const response = (await retry(
      `Audit ${lesson.title}`,
      () =>
        ai.models.generateContent({
          model: GEMINI_AUDIT_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildPrompt(
                    lesson,
                    source,
                    structured,
                  ),
                },
              ],
            },
          ],
          config: {
            thinkingConfig: {
              thinkingLevel:
                ThinkingLevel.HIGH,
            },
            maxOutputTokens:
              MAX_OUTPUT_TOKENS,
            responseMimeType:
              'application/json',
            responseJsonSchema:
              auditSchema,
          },
        }),
    )) as AuditResponseLike

    if (!response.text) {
      throw new Error(
        `${lesson.title}: empty audit response.`,
      )
    }

    let audit: LessonAudit

    try {
      audit = JSON.parse(
        response.text,
      ) as LessonAudit
    } catch {
      throw new Error(
        `${lesson.title}: invalid audit JSON.`,
      )
    }

    audit = augmentAuditWithDeterministicGates(
      lesson,
      source,
      structured,
      audit,
    )

    validateAudit(
      lesson,
      audit,
      structured,
    )

    lastAudit = audit
    lastUsage = response.usageMetadata ?? null

    if (audit.qualityPass) {
      console.log(
        `   ✓ PASS · ${audit.issues.length} issue(s) · ${repairRounds} repair round(s)`,
      )
      break
    }

    console.log(
      `   ✗ FAIL · ${audit.issues.length} issue(s)`,
    )

    for (const issue of audit.issues) {
      console.log(
        `     ${issue.issueType} · ${issue.targetPath} · ${issue.title}`,
      )
    }

    if (
      repairRounds >=
      MAX_LESSON_REPAIR_ROUNDS
    ) {
      break
    }

    console.log(
      `   ↻ targeted final repair ${repairRounds + 1}/${MAX_LESSON_REPAIR_ROUNDS}`,
    )

    const repairResponse = (await retry(
      `Repair ${lesson.title}`,
      () =>
        ai.models.generateContent({
          model: GEMINI_AUDIT_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: buildRepairPrompt(
                    lesson,
                    source,
                    structured,
                    audit,
                  ),
                },
              ],
            },
          ],
          config: {
            thinkingConfig: {
              thinkingLevel:
                ThinkingLevel.HIGH,
            },
            maxOutputTokens:
              MAX_REPAIR_OUTPUT_TOKENS,
            responseMimeType:
              'application/json',
            responseJsonSchema:
              repairSchema,
          },
        }),
    )) as AuditResponseLike

    if (!repairResponse.text) {
      throw new Error(
        `${lesson.title}: empty repair response.`,
      )
    }

    let repairOutput: RepairOutput

    try {
      repairOutput = JSON.parse(
        repairResponse.text,
      ) as RepairOutput
    } catch {
      throw new Error(
        `${lesson.title}: invalid repair JSON.`,
      )
    }

    const candidate = recalculateLesson(
      structured,
      repairOutput.topics,
      lesson,
    )

    assertTargetedRepair(
      structured,
      candidate,
      audit,
    )

    validateLessonStructure(
      lesson,
      candidate,
    )

    if (!repaired) {
      await fs.writeFile(
        backupPath,
        JSON.stringify(
          structured,
          null,
          2,
        ),
        'utf8',
      )
    }

    await fs.writeFile(
      lessonPath,
      JSON.stringify(
        candidate,
        null,
        2,
      ),
      'utf8',
    )

    structured = candidate
    repaired = true
    repairRounds += 1
  }

  if (!lastAudit) {
    throw new Error(
      `${lesson.title}: no final audit result.`,
    )
  }

  const output = {
    auditedAt:
      new Date().toISOString(),
    lessonKey:
      lesson.lessonKey,
    lessonTitle:
      lesson.title,
    sourcePages:
      `${lesson.startPage}-${lesson.endPage}`,
    model:
      GEMINI_AUDIT_MODEL,
    thinking:
      'HIGH',
    repaired,
    repairRounds,
    qualityPass:
      lastAudit.qualityPass,
    audit:
      lastAudit,
    usage:
      lastUsage,
  }

  await fs.writeFile(
    path.join(
      AUDIT_DIRECTORY,
      `${lesson.lessonKey}.audit.json`,
    ),
    JSON.stringify(
      output,
      null,
      2,
    ),
    'utf8',
  )

  return output
}

/* ============================================================
   MAIN
============================================================ */

async function main() {
  console.log('\n==========================================')
  console.log(' ChalkBox Full Lesson Quality Gate FINAL 2.0')
  console.log('==========================================')

  console.log(`\nModel      : ${GEMINI_AUDIT_MODEL}`)
  console.log('Thinking   : HIGH')
  console.log('Lessons    : 6')
  console.log('Embeddings : NONE')
  console.log('DB writes  : NONE')
  console.log('Auto repair: MAX 1 strictly targeted round\n')

  await fs.mkdir(
    AUDIT_DIRECTORY,
    { recursive: true },
  )

  const results: Awaited<
    ReturnType<typeof auditLesson>
  >[] = []

  for (
    let index = 0;
    index < lessons.length;
    index += 1
  ) {
    console.log(
      `\n[${index + 1}/${lessons.length}]`,
    )

    results.push(
      await auditLesson(
        lessons[index],
      ),
    )
  }

  const failures = results.filter(
    (result) => !result.qualityPass,
  )

  const manifest = {
    generatedAt:
      new Date().toISOString(),
    model:
      GEMINI_AUDIT_MODEL,
    thinking:
      'HIGH',
    lessonsAudited:
      results.length,
    lessonsPassed:
      results.length - failures.length,
    lessonsFailed:
      failures.length,
    allPassed:
      failures.length === 0,
    results:
      results.map((result) => ({
        lessonKey:
          result.lessonKey,
        lessonTitle:
          result.lessonTitle,
        qualityPass:
          result.qualityPass,
        repaired:
          result.repaired,
        repairRounds:
          result.repairRounds,
        issueCount:
          result.audit.issues.length,
        summary:
          result.audit.summary,
      })),
  }

  await fs.writeFile(
    AUDIT_MANIFEST_PATH,
    JSON.stringify(
      manifest,
      null,
      2,
    ),
    'utf8',
  )

  console.log('\n==========================================')
  console.log(' Full Lesson Audit Complete')
  console.log('==========================================\n')

  console.log(
    `Passed: ${manifest.lessonsPassed}/${manifest.lessonsAudited}`,
  )
  console.log(
    `Failed: ${manifest.lessonsFailed}/${manifest.lessonsAudited}`,
  )
  console.log(
    `\nManifest:\n${AUDIT_MANIFEST_PATH}`,
  )

  if (failures.length > 0) {
    console.error('\n❌ EMBEDDINGS BLOCKED')
    console.error(
      'At least one lesson failed the full-lesson quality gate.\n',
    )

    for (const failure of failures) {
      console.error(
        `- ${failure.lessonTitle}: ${failure.audit.issues.length} issue(s)`,
      )
    }

    process.exitCode = 1
    return
  }

  console.log('\n✓ ALL 6 LESSONS PASSED.')
  console.log(
    'Corpus is eligible for the embedding smoke test.\n',
  )
}

main().catch((error) => {
  console.error('\n==========================================')
  console.error(' Full Lesson Audit Failed')
  console.error('==========================================\n')
  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  )
  console.error(
    '\nNo embeddings or database writes were performed.\n',
  )
  process.exitCode = 1
})
