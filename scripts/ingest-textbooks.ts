import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import dotenv from 'dotenv'

import {
  extractPdfRange,
  type ExtractedPage,
} from './extract-pdf-text'

/* ============================================================
   CHALKBOX — STRUCTURED SEED INGESTION FINAL 7.0

   PURPOSE

   FINAL 7.0 locks the seed pipeline with source-label coverage,
   item-by-item claim verification, explicit activity-purpose QA,
   and scope/quantifier fidelity checks.

   Pipeline:

   readable local PDF text
      ↓
   2-page batch
      ↓
   Gemini 3.5 Flash-Lite extraction
      ↓
   explicit checklist QA
      ↓
   targeted quality repair when needed
      ↓
   deterministic activity-contract validation
      ↓
   10-word exact-overlap gate
      ↓
   final QA if wording changed
      ↓
   validated cache / lesson JSON

   IMPORTANT

   This script does NOT:
   - create embeddings
   - write Supabase data
   - call Gemini 3.7 Flash
   - transcribe PDFs

   SAMPLE:

     pnpm exec tsx scripts/ingest-textbooks.ts --sample

   FULL CORPUS AFTER SAMPLE APPROVAL:

     pnpm exec tsx scripts/ingest-textbooks.ts --structured-only
============================================================ */

/* ============================================================
   ENV
============================================================ */

dotenv.config({
  path: path.resolve(process.cwd(), '.env.ingest.local'),
})

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim()
const GEMINI_DOCUMENT_MODEL =
  process.env.GEMINI_TRANSCRIPTION_MODEL?.trim() ||
  'gemini-3.5-flash-lite'
const GEMINI_RUNTIME_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  'gemini-3.7-flash'

if (!GEMINI_API_KEY) {
  throw new Error(
    [
      'GEMINI_API_KEY is missing.',
      'Expected it in .env.ingest.local.',
      'Do not paste the API key into chat.',
    ].join('\n'),
  )
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
})

/* ============================================================
   CLI
============================================================ */

type RunMode = 'sample' | 'structured-only'

const cliArgs = process.argv.slice(2)
const FORCE = cliArgs.includes('--force')
const wantsSample = cliArgs.includes('--sample')
const wantsStructuredOnly = cliArgs.includes('--structured-only')

if (wantsSample && wantsStructuredOnly) {
  throw new Error('Choose only one mode: --sample OR --structured-only.')
}

const supportedArgs = new Set([
  '--sample',
  '--structured-only',
  '--force',
])

const unsupportedArgs = cliArgs.filter(
  (argument) => !supportedArgs.has(argument),
)

if (unsupportedArgs.length > 0) {
  throw new Error(
    `Unsupported argument(s): ${unsupportedArgs.join(', ')}`,
  )
}

const RUN_MODE: RunMode = wantsStructuredOnly
  ? 'structured-only'
  : 'sample'

/* ============================================================
   PATHS
============================================================ */

const PROJECT_ROOT = process.cwd()
const TEXTBOOK_DIRECTORY = path.join(PROJECT_ROOT, 'data', 'textbooks')
const OUTPUT_DIRECTORY = path.join(PROJECT_ROOT, 'data', 'ingestion-output')
const STRUCTURED_DIRECTORY = path.join(
  OUTPUT_DIRECTORY,
  'structured-lessons',
)
const BATCH_DIRECTORY = path.join(STRUCTURED_DIRECTORY, 'batches')
const SAMPLE_PATH = path.join(OUTPUT_DIRECTORY, 'structured-sample.json')
const MANIFEST_PATH = path.join(
  OUTPUT_DIRECTORY,
  'structured-manifest.json',
)

/* ============================================================
   SETTINGS
============================================================ */

const PIPELINE_VERSION = '7.0-final'
const SCHEMA_VERSION = 3

/*
 * Numeric versions are intentionally bumped so V6 caches are
 * never reused accidentally.
 */
const PROMPT_VERSION = 70
const CACHE_VERSION = 70

const BATCH_SIZE = 2
const MAX_STRUCTURED_OUTPUT_TOKENS = 12_000
const MAX_AUDIT_OUTPUT_TOKENS = 6_000
const REQUEST_GAP_MS = 13_000
const MAX_TRANSPORT_ATTEMPTS = 3
const EXACT_OVERLAP_WORDS = 10
const MAX_QUALITY_REPAIRS = 2
const MAX_WORDING_REPAIRS = 2

/* ============================================================
   REQUEST PACING
============================================================ */

let lastRequestAt = 0

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function waitForRequestSlot() {
  if (lastRequestAt === 0) {
    lastRequestAt = Date.now()
    return
  }

  const elapsed = Date.now() - lastRequestAt
  const remaining = REQUEST_GAP_MS - elapsed

  if (remaining > 0) {
    console.log(
      `   ⏳ waiting ${Math.ceil(remaining / 1000)}s for request pacing`,
    )
    await sleep(remaining)
  }

  lastRequestAt = Date.now()
}

/* ============================================================
   LESSON DEFINITIONS
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
    lessonKey: 'class-8-chemical-effects-electric-current',
    classLevel: 8,
    subject: 'Science',
    title: 'Chemical Effects of Electric Current',
    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
    startPage: 1,
    endPage: 12,
  },
  {
    lessonKey: 'class-8-materials-metals-non-metals',
    classLevel: 8,
    subject: 'Science',
    title: 'Materials: Metals and Non-Metals',
    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
    startPage: 13,
    endPage: 24,
  },
  {
    lessonKey: 'class-9-force-laws-motion',
    classLevel: 9,
    subject: 'Science',
    title: 'Force and Laws of Motion',
    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
    startPage: 1,
    endPage: 17,
  },
  {
    lessonKey: 'class-9-work-energy',
    classLevel: 9,
    subject: 'Science',
    title: 'Work and Energy',
    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
    startPage: 18,
    endPage: 31,
  },
  {
    lessonKey: 'class-10-life-processes',
    classLevel: 10,
    subject: 'Science',
    title: 'Life Processes',
    sourceFileName: 'NCERT-Class-10-Life-Processes-official.pdf',
    startPage: 1,
    endPage: 21,
  },
  {
    lessonKey: 'class-10-electricity',
    classLevel: 10,
    subject: 'Science',
    title: 'Electricity',
    sourceFileName: 'NCERT-Class-10-Electricity-official.pdf',
    startPage: 1,
    endPage: 24,
  },
]

/* ============================================================
   KNOWLEDGE TYPES
============================================================ */

type KnowledgeKind =
  | 'concept'
  | 'definition'
  | 'formula'
  | 'example'
  | 'activity'
  | 'visual'

type KnowledgeItem = {
  kind: KnowledgeKind
  title: string
  text: string
  sourcePages: number[]
  details: string[]
}

type StructuredTopicModel = {
  title: string
  sourcePages: number[]
  overview: string
  items: KnowledgeItem[]
}

type StructuredModelOutput = {
  batchSummary: string
  topics: StructuredTopicModel[]
}

type StructuredTopic = StructuredTopicModel & {
  lessonPages: number[]
}

/* ============================================================
   QA TYPES
============================================================ */

type AuditStatus = 'pass' | 'fail' | 'not_applicable'

type ClaimVerdict =
  | 'supported'
  | 'incomplete'
  | 'inaccurate'
  | 'overgeneralized'
  | 'unsupported'
  | 'provenance_error'

type IssueType =
  | 'missing'
  | 'inaccurate'
  | 'provenance'
  | 'activity_fidelity'
  | 'unsupported_claim'
  | 'oversimplification'

type IssueKind = KnowledgeKind | 'general'

type QualityIssue = {
  issueType: IssueType
  targetPath: string
  kind: IssueKind
  title: string
  description: string
  sourcePages: number[]
}

type ClaimCheck = {
  targetPath: string
  verdict: ClaimVerdict
  reason: string
  sourcePages: number[]
}

type ActivityPurposeCheck = {
  sourceLabel: string
  targetPath: string
  sourcePurpose: string
  verdict: 'pass' | 'fail'
  reason: string
}

type DetailedAudit = {
  concepts: AuditStatus
  definitions: AuditStatus
  relationships: AuditStatus
  examples: AuditStatus
  exceptions: AuditStatus
  formulas: AuditStatus
  activities: AuditStatus
  visuals: AuditStatus
  pageCoverage: AuditStatus

  unsupportedClaims: string[]
  oversimplifications: string[]
  activityConclusionErrors: string[]

  claimChecks: ClaimCheck[]
  activityPurposeChecks: ActivityPurposeCheck[]

  qualityPass: boolean
  summary: string
  issues: QualityIssue[]
}

/* ============================================================
   METADATA TYPES
============================================================ */

type UsageMetadata = {
  promptTokens: number | null
  outputTokens: number | null
  thinkingTokens: number | null
  totalTokens: number | null
}

type ModelCallPurpose =
  | 'initial-extraction'
  | 'quality-audit'
  | 'quality-repair'
  | 'wording-repair'
  | 'final-quality-audit'

type ModelCallRecord = {
  purpose: ModelCallPurpose
  usage: UsageMetadata
}

type BatchRange = {
  start: number
  end: number
}

type OverlapViolation = {
  path: string
  phrase: string
}

type AuditTrailEntry = {
  stage: 'quality-audit' | 'final-after-wording'
  qualityPass: boolean
  summary: string
  issueCount: number
  checklist: {
    concepts: AuditStatus
    definitions: AuditStatus
    relationships: AuditStatus
    examples: AuditStatus
    exceptions: AuditStatus
    formulas: AuditStatus
    activities: AuditStatus
    visuals: AuditStatus
    pageCoverage: AuditStatus
  }
}

type BatchCache = {
  cacheVersion: number
  schemaVersion: number
  promptVersion: number
  pipelineVersion: string
  generatedAt: string

  lessonKey: string
  classLevel: number
  subject: string
  lessonTitle: string

  sourceFileName: string
  sourceStartPage: number
  sourceEndPage: number
  sourceTextSha256: string

  documentModel: string
  batchSummary: string
  topics: StructuredTopic[]
  knowledgeItemCount: number

  qualityAuditCount: number
  qualityRepairCount: number
  wordingRepairCount: number

  auditTrail: AuditTrailEntry[]
  modelCalls: ModelCallRecord[]
  usage: UsageMetadata
}

type LessonFile = {
  schemaVersion: 3
  pipelineVersion: string
  generatedAt: string

  lessonKey: string
  classLevel: number
  subject: string
  title: string

  sourceFileName: string
  sourcePageRange: string

  documentModel: string
  promptVersion: number

  totalSourcePages: number
  representedSourcePages: number[]

  topicCount: number
  knowledgeItemCount: number
  qualityAuditCount: number
  qualityRepairCount: number
  wordingRepairCount: number

  batches: Array<{
    sourceStartPage: number
    sourceEndPage: number
    batchSummary: string
    topicCount: number
    knowledgeItemCount: number
    qualityAuditCount: number
    qualityRepairCount: number
    wordingRepairCount: number
    modelCallCount: number
    usage: UsageMetadata
  }>

  topics: StructuredTopic[]
}

/* ============================================================
   STRUCTURED OUTPUT SCHEMA
============================================================ */

const structuredSchema = {
  type: 'object',
  properties: {
    batchSummary: { type: 'string' },
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
  required: ['batchSummary', 'topics'],
}

/* ============================================================
   DETAILED AUDIT SCHEMA
============================================================ */

const statusSchema = {
  type: 'string',
  enum: ['pass', 'fail', 'not_applicable'],
}

const detailedAuditSchema = {
  type: 'object',
  properties: {
    concepts: statusSchema,
    definitions: statusSchema,
    relationships: statusSchema,
    examples: statusSchema,
    exceptions: statusSchema,
    formulas: statusSchema,
    activities: statusSchema,
    visuals: statusSchema,
    pageCoverage: statusSchema,

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

    claimChecks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          targetPath: { type: 'string' },
          verdict: {
            type: 'string',
            enum: [
              'supported',
              'incomplete',
              'inaccurate',
              'overgeneralized',
              'unsupported',
              'provenance_error',
            ],
          },
          reason: { type: 'string' },
          sourcePages: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
        required: [
          'targetPath',
          'verdict',
          'reason',
          'sourcePages',
        ],
      },
    },

    activityPurposeChecks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sourceLabel: { type: 'string' },
          targetPath: { type: 'string' },
          sourcePurpose: { type: 'string' },
          verdict: {
            type: 'string',
            enum: ['pass', 'fail'],
          },
          reason: { type: 'string' },
        },
        required: [
          'sourceLabel',
          'targetPath',
          'sourcePurpose',
          'verdict',
          'reason',
        ],
      },
    },

    qualityPass: { type: 'boolean' },
    summary: { type: 'string' },

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
            ],
          },
          targetPath: { type: 'string' },
          kind: {
            type: 'string',
            enum: [
              'concept',
              'definition',
              'formula',
              'example',
              'activity',
              'visual',
              'general',
            ],
          },
          title: { type: 'string' },
          description: { type: 'string' },
          sourcePages: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
        required: [
          'issueType',
          'targetPath',
          'kind',
          'title',
          'description',
          'sourcePages',
        ],
      },
    },
  },
  required: [
    'concepts',
    'definitions',
    'relationships',
    'examples',
    'exceptions',
    'formulas',
    'activities',
    'visuals',
    'pageCoverage',
    'unsupportedClaims',
    'oversimplifications',
    'activityConclusionErrors',
    'claimChecks',
    'activityPurposeChecks',
    'qualityPass',
    'summary',
    'issues',
  ],
}

/* ============================================================
   GENERIC HELPERS
============================================================ */

function normalizeWhitespace(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/\u00ad/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[‐-‒–—―−]/g, '-')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function normalizeWords(value: string) {
  return (
    value
      .normalize('NFKC')
      .replace(/\u00ad/g, '')
      .replace(/[‐-‒–—―−]/g, '-')
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? []
  )
}

function sha256(value: string) {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex')
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b)
}

function sameNumbers(left: number[], right: number[]) {
  const a = uniqueNumbers(left)
  const b = uniqueNumbers(right)

  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  )
}

function subset(child: number[], parent: number[]) {
  const parentSet = new Set(parent)
  return child.every((value) => parentSet.has(value))
}

function rangeLabel(range: BatchRange) {
  return range.start === range.end
    ? String(range.start)
    : `${range.start}-${range.end}`
}

/* ============================================================
   USAGE HELPERS
============================================================ */

function zeroUsage(): UsageMetadata {
  return {
    promptTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
  }
}

function addNullable(
  left: number | null,
  right: number | null,
) {
  if (left === null && right === null) {
    return null
  }

  return (left ?? 0) + (right ?? 0)
}

function addUsage(
  left: UsageMetadata,
  right: UsageMetadata,
): UsageMetadata {
  return {
    promptTokens: addNullable(
      left.promptTokens,
      right.promptTokens,
    ),
    outputTokens: addNullable(
      left.outputTokens,
      right.outputTokens,
    ),
    thinkingTokens: addNullable(
      left.thinkingTokens,
      right.thinkingTokens,
    ),
    totalTokens: addNullable(
      left.totalTokens,
      right.totalTokens,
    ),
  }
}

/* ============================================================
   ERRORS / RETRIES
============================================================ */

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

function retryable(message: string) {
  return /429|500|502|503|504|fetch failed|ECONNRESET|ETIMEDOUT|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded|rate.?limit/i.test(
    message,
  )
}

async function withRetry<T>(
  label: string,
  action: () => Promise<T>,
) {
  let lastError: unknown

  for (
    let attempt = 1;
    attempt <= MAX_TRANSPORT_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await waitForRequestSlot()

      return {
        value: await action(),
        attempts: attempt,
      }
    } catch (error) {
      lastError = error
      const message = errorText(error)

      if (
        !retryable(message) ||
        attempt === MAX_TRANSPORT_ATTEMPTS
      ) {
        throw error
      }

      const seconds = attempt === 1 ? 20 : 40

      console.log(`   ${label}: temporary API/network error`)
      console.log(`   retrying in ${seconds}s`)

      await sleep(seconds * 1000)
    }
  }

  throw lastError
}

/* ============================================================
   RESPONSE TYPES
============================================================ */

type ResponseLike = {
  text?: string
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    thoughtsTokenCount?: number
    totalTokenCount?: number
  }
}

function usage(response: ResponseLike): UsageMetadata {
  return {
    promptTokens:
      response.usageMetadata?.promptTokenCount ?? null,
    outputTokens:
      response.usageMetadata?.candidatesTokenCount ?? null,
    thinkingTokens:
      response.usageMetadata?.thoughtsTokenCount ?? null,
    totalTokens:
      response.usageMetadata?.totalTokenCount ?? null,
  }
}

/* ============================================================
   SOURCE FILE VALIDATION / EXTRACTION
============================================================ */

async function verifyFiles() {
  const files = [...new Set(
    lessons.map((lesson) => lesson.sourceFileName),
  )]

  console.log('\nChecking source PDFs...\n')

  for (const fileName of files) {
    const fullPath = path.join(
      TEXTBOOK_DIRECTORY,
      fileName,
    )

    await fs.access(fullPath)
    console.log(`✓ ${fileName}`)
  }
}

async function extractLesson(
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
    (page) => page.verdict !== 'readable',
  )

  if (bad.length > 0) {
    throw new Error(
      [
        `${lesson.title}: local extraction is not fully readable.`,
        `Bad pages: ${bad
          .map((page) => page.pageNumber)
          .join(', ')}`,
      ].join('\n'),
    )
  }

  return result.pages
}

function makeRanges(start: number, end: number) {
  const ranges: BatchRange[] = []

  for (
    let page = start;
    page <= end;
    page += BATCH_SIZE
  ) {
    ranges.push({
      start: page,
      end: Math.min(
        end,
        page + BATCH_SIZE - 1,
      ),
    })
  }

  return ranges
}

function selectPages(
  pages: ExtractedPage[],
  range: BatchRange,
) {
  return pages.filter(
    (page) =>
      page.pageNumber >= range.start &&
      page.pageNumber <= range.end,
  )
}

function buildSourceText(
  pages: ExtractedPage[],
) {
  return pages
    .map((page) =>
      [
        `<<< SOURCE PDF PAGE ${page.pageNumber} >>>`,
        normalizeWhitespace(page.text),
        `<<< END SOURCE PDF PAGE ${page.pageNumber} >>>`,
      ].join('\n'),
    )
    .join('\n\n')
}

/* ============================================================
   NORMALIZATION
============================================================ */

function normalizeItem(
  item: KnowledgeItem,
): KnowledgeItem {
  return {
    kind: item.kind,
    title: normalizeWhitespace(item.title),
    text: normalizeWhitespace(item.text),
    sourcePages: uniqueNumbers(item.sourcePages),
    details: item.details
      .map(normalizeWhitespace)
      .filter(Boolean),
  }
}

function normalizeOutput(
  output: StructuredModelOutput,
): StructuredModelOutput {
  return {
    batchSummary:
      normalizeWhitespace(output.batchSummary),
    topics: output.topics.map((topic) => ({
      title: normalizeWhitespace(topic.title),
      sourcePages:
        uniqueNumbers(topic.sourcePages),
      overview:
        normalizeWhitespace(topic.overview),
      items: topic.items.map(normalizeItem),
    })),
  }
}

/* ============================================================
   STRUCTURAL VALIDATION
============================================================ */

function validatePages(
  pages: number[],
  range: BatchRange,
  label: string,
) {
  if (
    !Array.isArray(pages) ||
    pages.length === 0
  ) {
    throw new Error(
      `${label}: sourcePages missing.`,
    )
  }

  for (const page of pages) {
    if (
      !Number.isInteger(page) ||
      page < range.start ||
      page > range.end
    ) {
      throw new Error(
        `${label}: invalid source page ${page}.`,
      )
    }
  }
}

function validateOutput(
  output: StructuredModelOutput,
  range: BatchRange,
) {
  if (!output.batchSummary?.trim()) {
    throw new Error('batchSummary missing.')
  }

  if (
    !Array.isArray(output.topics) ||
    output.topics.length === 0
  ) {
    throw new Error('No topics generated.')
  }

  const allowedKinds: KnowledgeKind[] = [
    'concept',
    'definition',
    'formula',
    'example',
    'activity',
    'visual',
  ]

  output.topics.forEach(
    (topic, topicIndex) => {
      if (
        !topic.title?.trim() ||
        !topic.overview?.trim()
      ) {
        throw new Error(
          `Topic ${topicIndex}: incomplete.`,
        )
      }

      validatePages(
        topic.sourcePages,
        range,
        `Topic ${topicIndex}`,
      )

      if (
        !Array.isArray(topic.items) ||
        topic.items.length === 0
      ) {
        throw new Error(
          `Topic ${topicIndex}: no items.`,
        )
      }

      topic.items.forEach(
        (item, itemIndex) => {
          const label =
            `topics[${topicIndex}].items[${itemIndex}]`

          if (!allowedKinds.includes(item.kind)) {
            throw new Error(
              `${label}: invalid kind.`,
            )
          }

          if (
            !item.title?.trim() ||
            !item.text?.trim()
          ) {
            throw new Error(
              `${label}: incomplete.`,
            )
          }

          if (!Array.isArray(item.details)) {
            throw new Error(
              `${label}: details is not an array.`,
            )
          }

          if (
            item.details.some(
              (detail) =>
                typeof detail !== 'string' ||
                !detail.trim(),
            )
          ) {
            throw new Error(
              `${label}: invalid detail string.`,
            )
          }

          validatePages(
            item.sourcePages,
            range,
            label,
          )

          if (
            !subset(
              item.sourcePages,
              topic.sourcePages,
            )
          ) {
            throw new Error(
              `${label}: item provenance lies outside topic provenance.`,
            )
          }
        },
      )
    },
  )
}

/* ============================================================
   FINAL DETERMINISTIC SOURCE-LABEL + ACTIVITY CONTRACT

   These gates do not attempt scientific inference. They enforce
   coverage of explicit textbook structure that can be detected
   deterministically from extracted text.
============================================================ */

function canonicalSourceLabels(
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

function sourceActivityLabels(source: string) {
  return canonicalSourceLabels(
    source,
    /\bActivity\s+(\d+(?:\.\d+)+)\b/gi,
    'Activity',
  )
}

function sourceFigureLabels(source: string) {
  /*
   * Use full "Figure" captions, not abbreviated "Fig." references.
   * This avoids requiring a visual item merely because a figure is
   * referenced from another nearby page.
   */
  return canonicalSourceLabels(
    source,
    /\bFigure\s+(\d+(?:\.\d+)+)\b/gi,
    'Figure',
  )
}

function sourceTableLabels(source: string) {
  return canonicalSourceLabels(
    source,
    /\bTable\s+(\d+(?:\.\d+)+)\b/gi,
    'Table',
  )
}

function titleContainsLabel(title: string, label: string) {
  return normalizeWhitespace(title)
    .toLowerCase()
    .includes(label.toLowerCase())
}

function sourcePageForLabel(
  source: string,
  label: string,
) {
  const blockRegex =
    /<<< SOURCE PDF PAGE (\d+) >>>([\s\S]*?)<<< END SOURCE PDF PAGE \1 >>>/g

  for (const match of source.matchAll(blockRegex)) {
    const page = Number(match[1])
    const text = normalizeWhitespace(match[2])

    if (
      text.toLowerCase()
        .includes(label.toLowerCase())
    ) {
      return page
    }
  }

  return null
}

function findActivityContractFailures(
  output: StructuredModelOutput,
) {
  const failures: Array<{
    targetPath: string
    title: string
    sourcePages: number[]
  }> = []

  output.topics.forEach(
    (topic, topicIndex) => {
      topic.items.forEach(
        (item, itemIndex) => {
          if (item.kind !== 'activity') {
            return
          }

          /*
           * Purpose is mandatory. A conclusion alone cannot replace
           * the scientific reason the activity exists.
           */
          const hasPurpose =
            item.details.some(
              (detail) =>
                /^purpose\s*:/i.test(detail),
            )

          if (!hasPurpose) {
            failures.push({
              targetPath:
                `topics[${topicIndex}].items[${itemIndex}]`,
              title:
                item.title,
              sourcePages:
                item.sourcePages,
            })
          }
        },
      )
    },
  )

  return failures
}

function findSourceLabelCoverageFailures(
  output: StructuredModelOutput,
  source: string,
) {
  const activityItems = output.topics.flatMap(
    (topic, topicIndex) =>
      topic.items
        .map((item, itemIndex) => ({
          item,
          targetPath:
            `topics[${topicIndex}].items[${itemIndex}]`,
        }))
        .filter(({ item }) => item.kind === 'activity'),
  )

  const visualItems = output.topics.flatMap(
    (topic, topicIndex) =>
      topic.items
        .map((item, itemIndex) => ({
          item,
          targetPath:
            `topics[${topicIndex}].items[${itemIndex}]`,
        }))
        .filter(({ item }) => item.kind === 'visual'),
  )

  const missingActivities = sourceActivityLabels(source)
    .filter(
      (label) =>
        !activityItems.some(({ item }) =>
          titleContainsLabel(item.title, label),
        ),
    )

  const visualLabels = [
    ...sourceFigureLabels(source),
    ...sourceTableLabels(source),
  ]

  const missingVisuals = visualLabels.filter(
    (label) =>
      !visualItems.some(({ item }) =>
        titleContainsLabel(item.title, label),
      ),
  )

  return {
    missingActivities,
    missingVisuals,
  }
}

function validateActivityContract(
  output: StructuredModelOutput,
) {
  const failures =
    findActivityContractFailures(output)

  if (failures.length > 0) {
    throw new Error(
      [
        'Activity contract failed.',
        'Every stored activity must contain a source-grounded Purpose: detail.',
        '',
        ...failures.map(
          (failure) =>
            `- ${failure.targetPath} · ${failure.title}`,
        ),
      ].join('\n'),
    )
  }
}

function validateSourceLabelCoverage(
  output: StructuredModelOutput,
  source: string,
) {
  const failures =
    findSourceLabelCoverageFailures(
      output,
      source,
    )

  if (
    failures.missingActivities.length > 0 ||
    failures.missingVisuals.length > 0
  ) {
    throw new Error(
      [
        'Explicit source-label coverage failed.',
        failures.missingActivities.length > 0
          ? `Missing activities: ${failures.missingActivities.join(', ')}`
          : '',
        failures.missingVisuals.length > 0
          ? `Missing figures/tables: ${failures.missingVisuals.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
}

/* ============================================================
   ITEM-LEVEL PAGE COVERAGE
============================================================ */

function missingItemPages(
  output: StructuredModelOutput,
  range: BatchRange,
) {
  const represented = new Set<number>()

  for (const topic of output.topics) {
    for (const item of topic.items) {
      for (const page of item.sourcePages) {
        represented.add(page)
      }
    }
  }

  const missing: number[] = []

  for (
    let page = range.start;
    page <= range.end;
    page += 1
  ) {
    if (!represented.has(page)) {
      missing.push(page)
    }
  }

  return missing
}

/* ============================================================
   AUDIT NORMALIZATION / VALIDATION
============================================================ */

function normalizeAudit(
  audit: DetailedAudit,
): DetailedAudit {
  return {
    ...audit,
    summary: normalizeWhitespace(audit.summary),
    unsupportedClaims:
      audit.unsupportedClaims
        .map(normalizeWhitespace)
        .filter(Boolean),
    oversimplifications:
      audit.oversimplifications
        .map(normalizeWhitespace)
        .filter(Boolean),
    activityConclusionErrors:
      audit.activityConclusionErrors
        .map(normalizeWhitespace)
        .filter(Boolean),
    claimChecks:
      audit.claimChecks.map((check) => ({
        ...check,
        targetPath:
          normalizeWhitespace(check.targetPath),
        reason:
          normalizeWhitespace(check.reason),
        sourcePages:
          uniqueNumbers(check.sourcePages),
      })),
    activityPurposeChecks:
      audit.activityPurposeChecks.map((check) => ({
        ...check,
        sourceLabel:
          normalizeWhitespace(check.sourceLabel),
        targetPath:
          normalizeWhitespace(check.targetPath),
        sourcePurpose:
          normalizeWhitespace(check.sourcePurpose),
        reason:
          normalizeWhitespace(check.reason),
      })),
    issues: audit.issues.map((issue) => ({
      ...issue,
      targetPath:
        normalizeWhitespace(issue.targetPath),
      title:
        normalizeWhitespace(issue.title),
      description:
        normalizeWhitespace(issue.description),
      sourcePages:
        uniqueNumbers(issue.sourcePages),
    })),
  }
}

function auditStatuses(audit: DetailedAudit) {
  return [
    audit.concepts,
    audit.definitions,
    audit.relationships,
    audit.examples,
    audit.exceptions,
    audit.formulas,
    audit.activities,
    audit.visuals,
    audit.pageCoverage,
  ]
}

function expectedClaimPaths(
  output: StructuredModelOutput,
) {
  const paths = ['batchSummary']

  output.topics.forEach(
    (topic, topicIndex) => {
      paths.push(
        `topics[${topicIndex}].overview`,
      )

      topic.items.forEach(
        (_item, itemIndex) => {
          paths.push(
            `topics[${topicIndex}].items[${itemIndex}]`,
          )
        },
      )
    },
  )

  return paths
}

function itemKindForPath(
  output: StructuredModelOutput,
  targetPath: string,
): IssueKind {
  const match =
    /^topics\[(\d+)\]\.items\[(\d+)\]$/.exec(
      targetPath,
    )

  if (!match) {
    return 'general'
  }

  return (
    output.topics[Number(match[1])]
      ?.items[Number(match[2])]
      ?.kind ?? 'general'
  )
}

function issueTypeForClaimVerdict(
  verdict: ClaimVerdict,
): IssueType {
  switch (verdict) {
    case 'provenance_error':
      return 'provenance'
    case 'unsupported':
      return 'unsupported_claim'
    case 'overgeneralized':
    case 'incomplete':
      return 'oversimplification'
    case 'inaccurate':
      return 'inaccurate'
    default:
      return 'inaccurate'
  }
}

function hasIssueForPath(
  issues: QualityIssue[],
  targetPath: string,
) {
  return issues.some(
    (issue) =>
      issue.targetPath === targetPath,
  )
}

function augmentAudit(
  audit: DetailedAudit,
  output: StructuredModelOutput,
  range: BatchRange,
  source: string,
): DetailedAudit {
  const issues = [...audit.issues]

  const missingPages =
    missingItemPages(output, range)

  for (const page of missingPages) {
    issues.push({
      issueType: 'missing',
      targetPath: 'NEW',
      kind: 'general',
      title: 'Missing page-level knowledge',
      description:
        `Page ${page} contains no meaningful knowledge item.`,
      sourcePages: [page],
    })
  }

  const activityFailures =
    findActivityContractFailures(output)

  for (const failure of activityFailures) {
    if (!hasIssueForPath(issues, failure.targetPath)) {
      issues.push({
        issueType: 'activity_fidelity',
        targetPath: failure.targetPath,
        kind: 'activity',
        title: 'Missing explicit activity purpose',
        description:
          'The activity lacks a source-grounded Purpose: detail.',
        sourcePages: failure.sourcePages,
      })
    }
  }

  const labelFailures =
    findSourceLabelCoverageFailures(
      output,
      source,
    )

  for (const label of labelFailures.missingActivities) {
    issues.push({
      issueType: 'missing',
      targetPath: 'NEW',
      kind: 'activity',
      title: `Missing ${label}`,
      description:
        `${label} appears explicitly in the source but has no activity knowledge item whose title preserves the label.`,
      sourcePages: [
        sourcePageForLabel(source, label) ?? range.start,
      ],
    })
  }

  for (const label of labelFailures.missingVisuals) {
    issues.push({
      issueType: 'missing',
      targetPath: 'NEW',
      kind: 'visual',
      title: `Missing ${label}`,
      description:
        `${label} appears as an explicit source caption but has no visual knowledge item whose title preserves the label.`,
      sourcePages: [
        sourcePageForLabel(source, label) ?? range.start,
      ],
    })
  }

  for (const check of audit.claimChecks) {
    if (check.verdict === 'supported') {
      continue
    }

    if (!hasIssueForPath(issues, check.targetPath)) {
      issues.push({
        issueType:
          issueTypeForClaimVerdict(check.verdict),
        targetPath:
          check.targetPath,
        kind:
          itemKindForPath(output, check.targetPath),
        title:
          `Claim check: ${check.verdict}`,
        description:
          check.reason,
        sourcePages:
          check.sourcePages.length > 0
            ? check.sourcePages
            : [range.start],
      })
    }
  }

  for (const check of audit.activityPurposeChecks) {
    if (check.verdict === 'pass') {
      continue
    }

    if (!hasIssueForPath(issues, check.targetPath)) {
      issues.push({
        issueType: 'activity_fidelity',
        targetPath: check.targetPath,
        kind: 'activity',
        title: `${check.sourceLabel} purpose mismatch`,
        description:
          `${check.reason} Source-grounded purpose: ${check.sourcePurpose}`,
        sourcePages: [
          sourcePageForLabel(source, check.sourceLabel) ?? range.start,
        ],
      })
    }
  }

  const hasClaimFailure =
    audit.claimChecks.some(
      (check) =>
        check.verdict !== 'supported',
    )

  const hasPurposeFailure =
    audit.activityPurposeChecks.some(
      (check) =>
        check.verdict !== 'pass',
    )

  const hasFailure =
    missingPages.length > 0 ||
    activityFailures.length > 0 ||
    labelFailures.missingActivities.length > 0 ||
    labelFailures.missingVisuals.length > 0 ||
    hasClaimFailure ||
    hasPurposeFailure

  if (!hasFailure) {
    return audit
  }

  return {
    ...audit,
    pageCoverage:
      missingPages.length > 0
        ? 'fail'
        : audit.pageCoverage,
    activities:
      activityFailures.length > 0 ||
      labelFailures.missingActivities.length > 0 ||
      hasPurposeFailure
        ? 'fail'
        : audit.activities,
    visuals:
      labelFailures.missingVisuals.length > 0
        ? 'fail'
        : audit.visuals,
    qualityPass: false,
    issues,
    summary: normalizeWhitespace(
      [
        audit.summary,
        'Deterministic and item-by-item audit gates found one or more issues requiring repair.',
      ].join(' '),
    ),
  }
}

function validateAudit(
  audit: DetailedAudit,
  output: StructuredModelOutput,
  range: BatchRange,
  source: string,
) {
  const expectedPaths =
    expectedClaimPaths(output)

  const seenClaimPaths =
    new Set<string>()

  for (const check of audit.claimChecks) {
    if (!expectedPaths.includes(check.targetPath)) {
      throw new Error(
        `Auditor returned unexpected claim path: ${check.targetPath}`,
      )
    }

    if (seenClaimPaths.has(check.targetPath)) {
      throw new Error(
        `Auditor duplicated claim check: ${check.targetPath}`,
      )
    }

    seenClaimPaths.add(check.targetPath)

    validatePages(
      check.sourcePages,
      range,
      `claimChecks(${check.targetPath})`,
    )
  }

  const missingClaimChecks =
    expectedPaths.filter(
      (path) =>
        !seenClaimPaths.has(path),
    )

  if (missingClaimChecks.length > 0) {
    throw new Error(
      `Auditor failed to inspect every stored claim: ${missingClaimChecks.join(', ')}`,
    )
  }

  const activities =
    sourceActivityLabels(source)

  const purposeLabels =
    new Set<string>()

  for (const check of audit.activityPurposeChecks) {
    if (!activities.includes(check.sourceLabel)) {
      throw new Error(
        `Auditor returned unexpected activity-purpose label: ${check.sourceLabel}`,
      )
    }

    if (purposeLabels.has(check.sourceLabel)) {
      throw new Error(
        `Auditor duplicated activity-purpose check: ${check.sourceLabel}`,
      )
    }

    purposeLabels.add(check.sourceLabel)

    const pathMatch =
      /^topics\[(\d+)\]\.items\[(\d+)\]$/.exec(
        check.targetPath,
      )

    if (!pathMatch) {
      throw new Error(
        `Activity-purpose check has invalid targetPath: ${check.targetPath}`,
      )
    }

    const item =
      output.topics[Number(pathMatch[1])]
        ?.items[Number(pathMatch[2])]

    if (
      !item ||
      item.kind !== 'activity' ||
      !titleContainsLabel(item.title, check.sourceLabel)
    ) {
      throw new Error(
        `Activity-purpose check does not point to the matching activity item: ${check.sourceLabel}`,
      )
    }

    if (!check.sourcePurpose.trim()) {
      throw new Error(
        `Activity-purpose check has no sourcePurpose: ${check.sourceLabel}`,
      )
    }
  }

  for (const label of activities) {
    if (!purposeLabels.has(label)) {
      throw new Error(
        `Auditor omitted activity-purpose check for ${label}.`,
      )
    }
  }

  if (
    activities.length === 0 &&
    audit.activityPurposeChecks.length > 0
  ) {
    throw new Error(
      'Auditor invented an activity-purpose check where no source activity label exists.',
    )
  }

  const failure =
    auditStatuses(audit).includes('fail') ||
    audit.unsupportedClaims.length > 0 ||
    audit.oversimplifications.length > 0 ||
    audit.activityConclusionErrors.length > 0 ||
    audit.claimChecks.some(
      (check) =>
        check.verdict !== 'supported',
    ) ||
    audit.activityPurposeChecks.some(
      (check) =>
        check.verdict !== 'pass',
    ) ||
    audit.issues.length > 0

  if (failure && audit.qualityPass) {
    throw new Error(
      'Auditor returned PASS despite failure signals.',
    )
  }

  if (failure && audit.issues.length === 0) {
    throw new Error(
      'Auditor found a failure but returned no actionable issue.',
    )
  }

  if (!failure && !audit.qualityPass) {
    throw new Error(
      'Auditor returned FAIL without a failure signal.',
    )
  }
}

function checklist(audit: DetailedAudit) {
  return {
    concepts: audit.concepts,
    definitions: audit.definitions,
    relationships: audit.relationships,
    examples: audit.examples,
    exceptions: audit.exceptions,
    formulas: audit.formulas,
    activities: audit.activities,
    visuals: audit.visuals,
    pageCoverage: audit.pageCoverage,
  }
}

/* ============================================================
   QUALITY REPAIR GUARD
============================================================ */

function assertRepairAllowed(
  before: StructuredModelOutput,
  after: StructuredModelOutput,
  audit: DetailedAudit,
) {
  if (after.topics.length < before.topics.length) {
    throw new Error('Quality repair removed a topic.')
  }

  const flagged = new Set(
    audit.issues.map((issue) => issue.targetPath),
  )

  if (
    !flagged.has('batchSummary') &&
    before.batchSummary !== after.batchSummary
  ) {
    throw new Error(
      'Quality repair changed unflagged batchSummary.',
    )
  }

  for (
    let topicIndex = 0;
    topicIndex < before.topics.length;
    topicIndex += 1
  ) {
    const original = before.topics[topicIndex]
    const repaired = after.topics[topicIndex]

    if (
      !repaired ||
      repaired.title !== original.title
    ) {
      throw new Error(
        `Quality repair changed topic ${topicIndex}.`,
      )
    }

    if (
      !subset(
        original.sourcePages,
        repaired.sourcePages,
      )
    ) {
      throw new Error(
        `Quality repair removed topic provenance ${topicIndex}.`,
      )
    }

    const overviewPath =
      `topics[${topicIndex}].overview`

    if (
      !flagged.has(overviewPath) &&
      original.overview !== repaired.overview
    ) {
      throw new Error(
        `Quality repair changed unflagged ${overviewPath}.`,
      )
    }

    if (
      repaired.items.length <
      original.items.length
    ) {
      throw new Error(
        `Quality repair removed an item from topic ${topicIndex}.`,
      )
    }

    for (
      let itemIndex = 0;
      itemIndex < original.items.length;
      itemIndex += 1
    ) {
      const oldItem = original.items[itemIndex]
      const newItem = repaired.items[itemIndex]
      const itemPath =
        `topics[${topicIndex}].items[${itemIndex}]`

      if (
        !newItem ||
        newItem.kind !== oldItem.kind ||
        newItem.title !== oldItem.title
      ) {
        throw new Error(
          `Quality repair changed identity of ${itemPath}.`,
        )
      }

      if (
        !flagged.has(itemPath) &&
        JSON.stringify(newItem) !==
          JSON.stringify(oldItem)
      ) {
        throw new Error(
          `Quality repair changed unflagged ${itemPath}.`,
        )
      }
    }
  }
}

/* ============================================================
   EXACT OVERLAP
============================================================ */

function overlapViolations(
  source: string,
  output: StructuredModelOutput,
) {
  const sourceWords = normalizeWords(source)
  const ngrams = new Set<string>()

  for (
    let index = 0;
    index <=
      sourceWords.length - EXACT_OVERLAP_WORDS;
    index += 1
  ) {
    ngrams.add(
      sourceWords
        .slice(
          index,
          index + EXACT_OVERLAP_WORDS,
        )
        .join(' '),
    )
  }

  const result: OverlapViolation[] = []

  const inspect = (
    pathValue: string,
    text: string,
  ) => {
    const words = normalizeWords(text)

    for (
      let index = 0;
      index <=
        words.length - EXACT_OVERLAP_WORDS;
      index += 1
    ) {
      const phrase = words
        .slice(
          index,
          index + EXACT_OVERLAP_WORDS,
        )
        .join(' ')

      if (ngrams.has(phrase)) {
        result.push({
          path: pathValue,
          phrase,
        })
        return
      }
    }
  }

  inspect('batchSummary', output.batchSummary)

  output.topics.forEach(
    (topic, topicIndex) => {
      inspect(
        `topics[${topicIndex}].overview`,
        topic.overview,
      )

      topic.items.forEach(
        (item, itemIndex) => {
          inspect(
            `topics[${topicIndex}].items[${itemIndex}].text`,
            item.text,
          )

          item.details.forEach(
            (detail, detailIndex) => {
              inspect(
                `topics[${topicIndex}].items[${itemIndex}].details[${detailIndex}]`,
                detail,
              )
            },
          )
        },
      )
    },
  )

  return result
}

function assertWordingRepairSafe(
  before: StructuredModelOutput,
  after: StructuredModelOutput,
) {
  if (before.topics.length !== after.topics.length) {
    throw new Error(
      'Wording repair changed topic count.',
    )
  }

  before.topics.forEach(
    (oldTopic, topicIndex) => {
      const newTopic = after.topics[topicIndex]

      if (
        oldTopic.title !== newTopic.title ||
        !sameNumbers(
          oldTopic.sourcePages,
          newTopic.sourcePages,
        ) ||
        oldTopic.items.length !==
          newTopic.items.length
      ) {
        throw new Error(
          `Wording repair changed topic structure at ${topicIndex}.`,
        )
      }

      oldTopic.items.forEach(
        (oldItem, itemIndex) => {
          const newItem =
            newTopic.items[itemIndex]

          if (
            oldItem.kind !== newItem.kind ||
            oldItem.title !== newItem.title ||
            !sameNumbers(
              oldItem.sourcePages,
              newItem.sourcePages,
            ) ||
            oldItem.details.length !==
              newItem.details.length
          ) {
            throw new Error(
              `Wording repair changed item structure at ${topicIndex}/${itemIndex}.`,
            )
          }
        },
      )
    },
  )
}

/* ============================================================
   PROMPTS
============================================================ */

function extractionPrompt(
  lesson: LessonDefinition,
  range: BatchRange,
) {
  const pages = Array.from(
    {
      length:
        range.end - range.start + 1,
    },
    (_, index) => range.start + index,
  )

  return `
You are extracting high-fidelity scientific knowledge for ChalkBox.

Class: ${lesson.classLevel}
Subject: ${lesson.subject}
Lesson: ${lesson.title}
Pages: ${rangeLabel(range)}

GOAL

Create comprehensive source-grounded knowledge for retrieval.

Concise wording MUST NOT mean reduced content coverage.

SOURCE RULES

1. Use only supplied source knowledge.
2. Do not add outside facts.
3. Rewrite prose independently.
4. Do not quote textbook sentences.
5. Avoid 10 or more consecutive source words.
6. Preserve equations, symbols, quantities and units.
7. Capture concepts, definitions, relationships, examples, exceptions and qualifications.
8. Capture useful figure and table information supported by extracted text.
9. Preserve source scope and quantifiers exactly in meaning. Never broaden "humans/us" to "animals", "some" to "all", a named subgroup to an entire class, or a conditional statement into a universal claim.
10. Prefer biologically neutral source-faithful verbs such as "take in", "use" or "utilise" when stronger verbs such as "ingest" would imply a process the source does not establish.
11. Every explicit source heading "Activity X.Y" must produce one activity item whose title contains exactly "Activity X.Y".
12. Every explicit caption "Figure X.Y" or "Table X.Y" must produce one visual item whose title contains that exact label.
13. Every knowledge item needs exact sourcePages.
14. Allowed source pages: ${pages.join(', ')}.
15. Every supplied page needs at least one meaningful knowledge item.

ACTIVITY / EXPERIMENT CONTRACT — CRITICAL

16. Every activity item MUST preserve a source-grounded scientific purpose explicitly.

17. In details[], include one string beginning exactly with:
    "Purpose: ..."

    Add "Conclusion: ..." separately when the source supports an explicit conclusion.

18. When the source explicitly introduces an activity as demonstrating, showing, verifying, investigating, testing or establishing X, the activity Purpose: MUST preserve that exact scientific proposition in meaning. Preserve the manipulated/contrasted variable and do not replace it with a generic procedural goal. For example, if the source says an activity demonstrates that chlorophyll is essential for photosynthesis, "Purpose: investigate starch in leaf regions" is insufficient. Do not replace that source-stated purpose with a weaker generic description such as merely "testing for starch" if the activity is specifically introduced to demonstrate a scientific relationship.

15. Preserve source-supported procedure details including:
    materials,
    sequence,
    duration,
    direct versus indirect heating,
    measurement conditions,
    observation method.

16. A variable is NOT experimentally proven necessary merely because it was present.

17. Ask what variable was actually manipulated or contrasted, what conditions were held common, and what conclusion the source supports.

18. Do NOT claim an activity proves multiple variables unless the source actually establishes each one.

19. If the source provides an explicit supported conclusion, include a detail beginning:
    "Conclusion: ..."

20. Use short ordered procedural detail strings such as:
    "Purpose: ..."
    "Material: ..."
    "Step 1: ..."
    "Observation: ..."
    "Conclusion: ..."

21. Do not invent safety advice.

REVIEW / EXERCISE PAGES

22. Do not reproduce original questions.
24. Represent useful concepts being reviewed instead.

25. batchSummary may summarize only knowledge actually represented by the topics/items in this batch; do not claim coverage that the stored items omit.

KNOWLEDGE KINDS

concept
definition
formula
example
activity
visual

Return JSON only matching the required schema.
`.trim()
}

function auditPrompt(
  lesson: LessonDefinition,
  range: BatchRange,
  source: string,
  output: StructuredModelOutput,
) {
  const claimPaths =
    expectedClaimPaths(output)

  const activities =
    sourceActivityLabels(source)

  const figures =
    sourceFigureLabels(source)

  const tables =
    sourceTableLabels(source)

  return `
You are a strict SOURCE-FIRST ChalkBox scientific QA auditor.

Class: ${lesson.classLevel}
Subject: ${lesson.subject}
Lesson: ${lesson.title}
Pages: ${rangeLabel(range)}

Do not rubber-stamp the extraction.

FIRST read the original source independently. THEN audit every stored claim.

CHECKLIST

Explicitly evaluate:
concepts
definitions
relationships
examples
exceptions
formulas
activities
visuals
pageCoverage

Use only:
pass
fail
not_applicable

ITEM-BY-ITEM CLAIM VERIFICATION — MANDATORY

Return exactly ONE claimChecks entry for EVERY path below:

${claimPaths.map((path) => `- ${path}`).join('\n')}

Allowed claim verdicts:

supported
incomplete
inaccurate
overgeneralized
unsupported
provenance_error

For each claim:
- compare its actual meaning against the cited source pages;
- check subject scope and quantifiers;
- check causal strength;
- check whether examples/generalizations extend beyond the source;
- check provenance.

SCOPE / GENERALIZATION TEST — CRITICAL

Do NOT accept changes such as:
- "us/humans" → "animals";
- "some bacteria" → "bacteria";
- "may" → "always";
- a specific example → a universal rule;
- a source statement about taking in/utilising material → wording that implies a different biological mechanism.

ACTIVITY-PURPOSE VERIFICATION — MANDATORY

Source activity labels detected:
${activities.length > 0 ? activities.map((label) => `- ${label}`).join('\n') : '- NONE'}

Return exactly one activityPurposeChecks entry for every detected source activity label.

For each activity:
1. State the source-grounded scientific purpose in sourcePurpose.
2. Identify the matching activity item path.
3. Compare the stored Purpose:/Conclusion: against the source purpose.
4. verdict=fail if the stored purpose is generic, weaker, broader, or scientifically different.

A procedure-only goal such as "investigate starch presence" is NOT sufficient if the source explicitly states a scientific proposition such as "chlorophyll is essential for photosynthesis".

A variable is NOT proven merely because it was present. Determine what was actually manipulated/contrasted and what was held common.

EXPLICIT VISUAL/TABLE COVERAGE

Source figure captions detected:
${figures.length > 0 ? figures.map((label) => `- ${label}`).join('\n') : '- NONE'}

Source table captions detected:
${tables.length > 0 ? tables.map((label) => `- ${label}`).join('\n') : '- NONE'}

Every detected Figure/Table caption must have a corresponding visual knowledge item with the label in its title. Otherwise visuals=fail and add a missing NEW issue.

Also populate:
unsupportedClaims
oversimplifications
activityConclusionErrors

If ANY checklist category fails, ANY claimCheck is not supported, ANY activityPurposeCheck fails, or any accuracy array is non-empty:
qualityPass MUST be false and issues MUST be actionable.

Issue targetPath must be one of:
batchSummary
topics[index].overview
topics[index].items[index]
NEW

Do not fail merely because rhetorical prose, headers, repeated wording, decorative text or exercise-question wording was omitted.

ORIGINAL SOURCE
===============

${source}

STRUCTURED KNOWLEDGE
====================

${JSON.stringify(output, null, 2)}

Return audit JSON only.
`.trim()
}

function repairPrompt(
  lesson: LessonDefinition,
  range: BatchRange,
  source: string,
  current: StructuredModelOutput,
  audit: DetailedAudit,
) {
  return `
Correct ONLY the issues identified by this ChalkBox QA audit.

Class: ${lesson.classLevel}
Lesson: ${lesson.title}
Pages: ${rangeLabel(range)}

RULES

1. Keep existing topic order and titles.
2. Keep existing item order, kinds and titles.
3. Modify existing content only when its exact path is flagged.
4. Never modify unflagged existing content.
5. Never delete knowledge.
6. Append missing knowledge.
7. Topic sourcePages may expand for appended knowledge but may not shrink.
8. Use only source facts.
9. Preserve precise scientific meaning.
10. Avoid 10 or more consecutive source words.
11. Keep item provenance accurate.

ACTIVITY REPAIR RULES

12. If an activity_fidelity issue is flagged, preserve the source-stated scientific purpose/conclusion exactly in meaning, but paraphrase the wording.

13. Every repaired activity must contain at least one detail beginning "Purpose:" or "Conclusion:".

14. If the source explicitly supports a conclusion, add/preserve a "Conclusion:" detail.

15. Do not overstate experiment conclusions.

16. Do not infer that a variable was proven merely because it was present.

17. If a claim is flagged overgeneralized, restore the original source scope exactly in meaning (for example, humans must not become all animals).

18. If a Figure/Table label is missing, append a visual item whose title contains that exact source label.

19. If an activity purpose check fails, rewrite the activity Purpose: to preserve the source-stated scientific purpose, not a generic procedural description.

SOURCE
======

${source}

CURRENT KNOWLEDGE
=================

${JSON.stringify(current, null, 2)}

AUDIT
=====

${JSON.stringify(audit, null, 2)}

Return the full corrected structured JSON only.
`.trim()
}

function wordingPrompt(
  output: StructuredModelOutput,
  violations: OverlapViolation[],
) {
  return `
Perform wording-only repair.

These paths contain excessive exact source-like wording:

${violations
  .map((value) => `- ${value.path}`)
  .join('\n')}

The original source is intentionally not supplied.

RULES

- preserve exact scientific meaning;
- do not add or remove facts;
- preserve topic/item structure;
- preserve all sourcePages;
- preserve formulae, quantities, units and symbols;
- keep the same number of detail strings;
- preserve any "Purpose:" and "Conclusion:" semantic role/prefix;
- rewrite prose only.

KNOWLEDGE
=========

${JSON.stringify(output, null, 2)}

Return the full structured JSON only.
`.trim()
}

/* ============================================================
   MODEL CALLS
============================================================ */

async function structuredCall(
  label: string,
  prompt: string,
) {
  const result = await withRetry(
    label,
    () =>
      ai.models.generateContent({
        model: GEMINI_DOCUMENT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          thinkingConfig: {
            thinkingLevel:
              ThinkingLevel.MINIMAL,
          },
          maxOutputTokens:
            MAX_STRUCTURED_OUTPUT_TOKENS,
          responseMimeType:
            'application/json',
          responseJsonSchema:
            structuredSchema,
        },
      }),
  )

  const response = result.value as ResponseLike

  if (!response.text) {
    throw new Error(
      `${label}: empty model response.`,
    )
  }

  let parsed: StructuredModelOutput

  try {
    parsed = JSON.parse(
      response.text,
    ) as StructuredModelOutput
  } catch {
    throw new Error(
      `${label}: invalid JSON response.`,
    )
  }

  return {
    output: normalizeOutput(parsed),
    attempts: result.attempts,
    usage: usage(response),
  }
}

async function auditCall(
  label: string,
  prompt: string,
) {
  const result = await withRetry(
    label,
    () =>
      ai.models.generateContent({
        model: GEMINI_DOCUMENT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          thinkingConfig: {
            thinkingLevel:
              ThinkingLevel.MEDIUM,
          },
          maxOutputTokens:
            MAX_AUDIT_OUTPUT_TOKENS,
          responseMimeType:
            'application/json',
          responseJsonSchema:
            detailedAuditSchema,
        },
      }),
  )

  const response = result.value as ResponseLike

  if (!response.text) {
    throw new Error(
      `${label}: empty audit response.`,
    )
  }

  let parsed: DetailedAudit

  try {
    parsed = JSON.parse(
      response.text,
    ) as DetailedAudit
  } catch {
    throw new Error(
      `${label}: invalid audit JSON.`,
    )
  }

  return {
    audit: normalizeAudit(parsed),
    attempts: result.attempts,
    usage: usage(response),
  }
}

/* ============================================================
   CACHE
============================================================ */

function cachePath(
  lesson: LessonDefinition,
  range: BatchRange,
) {
  return path.join(
    BATCH_DIRECTORY,
    `${lesson.lessonKey}__${range.start}-${range.end}.json`,
  )
}

async function readCache(
  lesson: LessonDefinition,
  range: BatchRange,
  sourceHash: string,
) {
  if (FORCE) {
    return null
  }

  try {
    const parsed = JSON.parse(
      await fs.readFile(
        cachePath(lesson, range),
        'utf8',
      ),
    ) as BatchCache

    if (
      parsed.cacheVersion !== CACHE_VERSION ||
      parsed.promptVersion !== PROMPT_VERSION ||
      parsed.pipelineVersion !== PIPELINE_VERSION ||
      parsed.sourceTextSha256 !== sourceHash ||
      parsed.documentModel !== GEMINI_DOCUMENT_MODEL
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/* ============================================================
   BATCH PIPELINE
============================================================ */

async function processBatch(
  lesson: LessonDefinition,
  range: BatchRange,
  pages: ExtractedPage[],
) {
  const source = buildSourceText(pages)
  const sourceHash = sha256(source)

  const cached = await readCache(
    lesson,
    range,
    sourceHash,
  )

  if (cached) {
    console.log(
      `   ✓ cached FINAL 7.0 ${rangeLabel(range)}`,
    )

    return {
      cache: cached,
      fromCache: true,
      attempts: 0,
    }
  }

  console.log(
    `   ${GEMINI_DOCUMENT_MODEL} → extract pages ${rangeLabel(range)}`,
  )

  const initial = await structuredCall(
    `Extraction ${lesson.title}`,
    [
      extractionPrompt(lesson, range),
      '',
      'SOURCE TEXT',
      '===========',
      source,
    ].join('\n'),
  )

  validateOutput(initial.output, range)

  let current = initial.output
  let totalUsage = initial.usage
  let attempts = initial.attempts
  let qualityAudits = 0
  let qualityRepairs = 0
  let wordingRepairs = 0

  const modelCalls: ModelCallRecord[] = [
    {
      purpose: 'initial-extraction',
      usage: initial.usage,
    },
  ]

  const auditTrail: AuditTrailEntry[] = []

  /* -------------------------
     QUALITY LOOP
  ------------------------- */

  while (true) {
    console.log(
      `   🔎 explicit QA ${qualityAudits + 1}`,
    )

    const result = await auditCall(
      `QA ${lesson.title}`,
      auditPrompt(
        lesson,
        range,
        source,
        current,
      ),
    )

    attempts += result.attempts
    totalUsage = addUsage(
      totalUsage,
      result.usage,
    )

    modelCalls.push({
      purpose: 'quality-audit',
      usage: result.usage,
    })

    qualityAudits += 1

    const audit = augmentAudit(
      result.audit,
      current,
      range,
      source,
    )

    validateAudit(
      audit,
      current,
      range,
      source,
    )

    auditTrail.push({
      stage: 'quality-audit',
      qualityPass: audit.qualityPass,
      summary: audit.summary,
      issueCount: audit.issues.length,
      checklist: checklist(audit),
    })

    if (audit.qualityPass) {
      break
    }

    console.log(
      `   ⚠ QA found ${audit.issues.length} issue(s)`,
    )

    for (const issue of audit.issues) {
      console.log(
        `     ${issue.issueType} · ${issue.targetPath} · ${issue.title}`,
      )
    }

    if (
      qualityRepairs >=
      MAX_QUALITY_REPAIRS
    ) {
      throw new Error(
        [
          `${lesson.title} pages ${rangeLabel(range)} failed QA after maximum repairs.`,
          ...audit.issues.map(
            (issue) =>
              `- ${issue.issueType}: ${issue.description}`,
          ),
        ].join('\n'),
      )
    }

    const repaired = await structuredCall(
      `Quality repair ${lesson.title}`,
      repairPrompt(
        lesson,
        range,
        source,
        current,
        audit,
      ),
    )

    attempts += repaired.attempts
    totalUsage = addUsage(
      totalUsage,
      repaired.usage,
    )

    modelCalls.push({
      purpose: 'quality-repair',
      usage: repaired.usage,
    })

    validateOutput(
      repaired.output,
      range,
    )

    assertRepairAllowed(
      current,
      repaired.output,
      audit,
    )

    current = repaired.output
    qualityRepairs += 1
  }

  /* -------------------------
     DETERMINISTIC ACTIVITY GATE
  ------------------------- */

  validateActivityContract(current)
  validateSourceLabelCoverage(current, source)

  /* -------------------------
     OVERLAP GATE
  ------------------------- */

  let violations = overlapViolations(
    source,
    current,
  )

  while (violations.length > 0) {
    if (
      wordingRepairs >=
      MAX_WORDING_REPAIRS
    ) {
      throw new Error(
        `${lesson.title} ${rangeLabel(range)}: overlap gate still fails.`,
      )
    }

    console.log(
      `   ⚠ ${violations.length} overlap violation(s)`,
    )

    const repaired = await structuredCall(
      `Wording repair ${lesson.title}`,
      wordingPrompt(
        current,
        violations,
      ),
    )

    attempts += repaired.attempts
    totalUsage = addUsage(
      totalUsage,
      repaired.usage,
    )

    modelCalls.push({
      purpose: 'wording-repair',
      usage: repaired.usage,
    })

    validateOutput(
      repaired.output,
      range,
    )

    assertWordingRepairSafe(
      current,
      repaired.output,
    )

    current = repaired.output
    wordingRepairs += 1

    validateActivityContract(current)
    validateSourceLabelCoverage(current, source)

    violations = overlapViolations(
      source,
      current,
    )
  }

  /* -------------------------
     QA AGAIN IF WORDING CHANGED
  ------------------------- */

  if (wordingRepairs > 0) {
    console.log(
      '   🔎 final QA after wording repair',
    )

    const result = await auditCall(
      `Final QA ${lesson.title}`,
      auditPrompt(
        lesson,
        range,
        source,
        current,
      ),
    )

    attempts += result.attempts
    totalUsage = addUsage(
      totalUsage,
      result.usage,
    )

    modelCalls.push({
      purpose: 'final-quality-audit',
      usage: result.usage,
    })

    qualityAudits += 1

    const audit = augmentAudit(
      result.audit,
      current,
      range,
      source,
    )

    validateAudit(
      audit,
      current,
      range,
      source,
    )

    if (!audit.qualityPass) {
      throw new Error(
        `${lesson.title} ${rangeLabel(range)}: final QA failed after wording repair.`,
      )
    }

    auditTrail.push({
      stage: 'final-after-wording',
      qualityPass: true,
      summary: audit.summary,
      issueCount: 0,
      checklist: checklist(audit),
    })
  }

  /* -------------------------
     FINAL DETERMINISTIC GATES
  ------------------------- */

  validateOutput(current, range)
  validateActivityContract(current)
  validateSourceLabelCoverage(current, source)

  const missing = missingItemPages(
    current,
    range,
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing item-level page coverage: ${missing.join(', ')}`,
    )
  }

  const finalOverlap = overlapViolations(
    source,
    current,
  )

  if (finalOverlap.length > 0) {
    throw new Error(
      'Internal error: exact-overlap violations remain after finalization.',
    )
  }

  const topics: StructuredTopic[] =
    current.topics.map((topic) => ({
      ...topic,
      lessonPages: uniqueNumbers(
        topic.sourcePages.map(
          (page) =>
            page - lesson.startPage + 1,
        ),
      ),
    }))

  const cache: BatchCache = {
    cacheVersion: CACHE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    promptVersion: PROMPT_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),

    lessonKey: lesson.lessonKey,
    classLevel: lesson.classLevel,
    subject: lesson.subject,
    lessonTitle: lesson.title,

    sourceFileName: lesson.sourceFileName,
    sourceStartPage: range.start,
    sourceEndPage: range.end,
    sourceTextSha256: sourceHash,

    documentModel: GEMINI_DOCUMENT_MODEL,
    batchSummary: current.batchSummary,
    topics,
    knowledgeItemCount:
      topics.reduce(
        (total, topic) =>
          total + topic.items.length,
        0,
      ),

    qualityAuditCount: qualityAudits,
    qualityRepairCount: qualityRepairs,
    wordingRepairCount: wordingRepairs,

    auditTrail,
    modelCalls,
    usage: totalUsage,
  }

  await fs.writeFile(
    cachePath(lesson, range),
    JSON.stringify(cache, null, 2),
    'utf8',
  )

  console.log(
    [
      `   ✓ cached FINAL 7.0 ${rangeLabel(range)}`,
      `· ${cache.knowledgeItemCount} items`,
      `· ${qualityAudits} QA`,
      `· ${qualityRepairs} quality repairs`,
      `· ${wordingRepairs} wording repairs`,
    ].join(' '),
  )

  return {
    cache,
    fromCache: false,
    attempts,
  }
}

/* ============================================================
   CONSOLIDATE LESSON
============================================================ */

function consolidate(
  lesson: LessonDefinition,
  batches: BatchCache[],
): LessonFile {
  const topics = batches.flatMap(
    (batch) => batch.topics,
  )

  const representedSourcePages =
    uniqueNumbers(
      topics.flatMap((topic) =>
        topic.items.flatMap(
          (item) => item.sourcePages,
        ),
      ),
    )

  const expected = Array.from(
    {
      length:
        lesson.endPage -
        lesson.startPage +
        1,
    },
    (_, index) =>
      lesson.startPage + index,
  )

  const missing = expected.filter(
    (page) =>
      !representedSourcePages.includes(page),
  )

  if (missing.length > 0) {
    throw new Error(
      `${lesson.title}: missing source coverage ${missing.join(', ')}`,
    )
  }

  return {
    schemaVersion: 3,
    pipelineVersion: PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),

    lessonKey: lesson.lessonKey,
    classLevel: lesson.classLevel,
    subject: lesson.subject,
    title: lesson.title,

    sourceFileName: lesson.sourceFileName,
    sourcePageRange:
      `${lesson.startPage}-${lesson.endPage}`,

    documentModel: GEMINI_DOCUMENT_MODEL,
    promptVersion: PROMPT_VERSION,

    totalSourcePages: expected.length,
    representedSourcePages,

    topicCount: topics.length,
    knowledgeItemCount:
      topics.reduce(
        (total, topic) =>
          total + topic.items.length,
        0,
      ),

    qualityAuditCount:
      batches.reduce(
        (total, batch) =>
          total + batch.qualityAuditCount,
        0,
      ),

    qualityRepairCount:
      batches.reduce(
        (total, batch) =>
          total + batch.qualityRepairCount,
        0,
      ),

    wordingRepairCount:
      batches.reduce(
        (total, batch) =>
          total + batch.wordingRepairCount,
        0,
      ),

    batches: batches.map((batch) => ({
      sourceStartPage:
        batch.sourceStartPage,
      sourceEndPage:
        batch.sourceEndPage,
      batchSummary:
        batch.batchSummary,
      topicCount:
        batch.topics.length,
      knowledgeItemCount:
        batch.knowledgeItemCount,
      qualityAuditCount:
        batch.qualityAuditCount,
      qualityRepairCount:
        batch.qualityRepairCount,
      wordingRepairCount:
        batch.wordingRepairCount,
      modelCallCount:
        batch.modelCalls.length,
      usage:
        batch.usage,
    })),

    topics,
  }
}

/* ============================================================
   SAMPLE
============================================================ */

async function runSample() {
  const lesson = lessons.find(
    (item) =>
      item.lessonKey ===
      'class-10-life-processes',
  )

  if (!lesson) {
    throw new Error(
      'Life Processes definition missing.',
    )
  }

  console.log('\nSAMPLE MODE')
  console.log('Life Processes pages 3-4.')
  console.log(
    'FINAL 7.0 uses item-by-item claim checks, labeled-figure coverage, and activity-purpose verification.\n',
  )

  const pages = await extractLesson(lesson)

  const range: BatchRange = {
    start: 3,
    end: 4,
  }

  const result = await processBatch(
    lesson,
    range,
    selectPages(pages, range),
  )

  const cache = result.cache

  const sample = {
    schemaVersion: SCHEMA_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),
    purpose:
      'FINAL 7.0 source-inventory and claim-verification sample.',

    lessonKey: lesson.lessonKey,
    lessonTitle: lesson.title,
    sourcePages: '3-4',

    model: GEMINI_DOCUMENT_MODEL,
    promptVersion: PROMPT_VERSION,
    cacheVersion: CACHE_VERSION,
    fromCache: result.fromCache,

    topicCount: cache.topics.length,
    knowledgeItemCount:
      cache.knowledgeItemCount,
    qualityAuditCount:
      cache.qualityAuditCount,
    qualityRepairCount:
      cache.qualityRepairCount,
    wordingRepairCount:
      cache.wordingRepairCount,

    activityContract:
      'Every activity requires a source-grounded Purpose:, every labeled figure requires a visual item, and every stored claim is audited individually.',

    auditTrail: cache.auditTrail,
    modelCalls: cache.modelCalls,
    batchSummary: cache.batchSummary,
    topics: cache.topics,
    usage: cache.usage,
  }

  await fs.writeFile(
    SAMPLE_PATH,
    JSON.stringify(sample, null, 2),
    'utf8',
  )

  console.log('\n==========================================')
  console.log(' Structured FINAL 7.0 Sample Complete')
  console.log('==========================================\n')

  console.log(
    `Topics          : ${cache.topics.length}`,
  )
  console.log(
    `Knowledge items : ${cache.knowledgeItemCount}`,
  )
  console.log(
    `QA audits       : ${cache.qualityAuditCount}`,
  )
  console.log(
    `Quality repairs : ${cache.qualityRepairCount}`,
  )
  console.log(
    `Wording repairs : ${cache.wordingRepairCount}`,
  )
  console.log(
    `API attempts    : ${result.attempts}`,
  )
  console.log(`\nOutput:\n${SAMPLE_PATH}`)
  console.log(
    '\nSTOP HERE. Review structured-sample.json before the full corpus.\n',
  )
}

/* ============================================================
   FULL CORPUS
============================================================ */

async function runFullCorpus() {
  const lessonResults: LessonFile[] = []

  for (
    let lessonIndex = 0;
    lessonIndex < lessons.length;
    lessonIndex += 1
  ) {
    const lesson = lessons[lessonIndex]

    console.log('\n==========================================')
    console.log(
      `[${lessonIndex + 1}/${lessons.length}] ${lesson.title}`,
    )
    console.log('==========================================')

    const pages = await extractLesson(lesson)
    const ranges = makeRanges(
      lesson.startPage,
      lesson.endPage,
    )

    const batches: BatchCache[] = []

    for (
      let batchIndex = 0;
      batchIndex < ranges.length;
      batchIndex += 1
    ) {
      const range = ranges[batchIndex]

      console.log(
        `\n   Batch ${batchIndex + 1}/${ranges.length} · pages ${rangeLabel(range)}`,
      )

      const result = await processBatch(
        lesson,
        range,
        selectPages(pages, range),
      )

      batches.push(result.cache)
    }

    const lessonFile = consolidate(
      lesson,
      batches,
    )

    validateActivityContract({
      batchSummary: lesson.title,
      topics: lessonFile.topics,
    })

    await fs.writeFile(
      path.join(
        STRUCTURED_DIRECTORY,
        `${lesson.lessonKey}.json`,
      ),
      JSON.stringify(
        lessonFile,
        null,
        2,
      ),
      'utf8',
    )

    lessonResults.push(lessonFile)
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    generatedAt: new Date().toISOString(),
    stage: 'structured-v6.1',

    model: GEMINI_DOCUMENT_MODEL,
    promptVersion: PROMPT_VERSION,
    cacheVersion: CACHE_VERSION,
    batchSize: BATCH_SIZE,

    sourcePages: 100,
    lessons: lessonResults.length,

    totalTopics:
      lessonResults.reduce(
        (total, lesson) =>
          total + lesson.topicCount,
        0,
      ),

    totalKnowledgeItems:
      lessonResults.reduce(
        (total, lesson) =>
          total +
          lesson.knowledgeItemCount,
        0,
      ),

    embeddingsCreated: 0,
    supabaseWrites: 0,
    nextGate:
      'scripts/audit-structured-lessons.ts',
  }

  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify(manifest, null, 2),
    'utf8',
  )

  console.log('\n==========================================')
  console.log(' Structured Corpus FINAL 7.0 Complete')
  console.log('==========================================\n')
  console.log('DO NOT EMBED YET.')
  console.log(
    'Next gate: Gemini 3.7 full-lesson audit.',
  )
}

/* ============================================================
   MAIN
============================================================ */

async function main() {
  console.log('\n==========================================')
  console.log(' ChalkBox Structured Seed Ingestion FINAL 7.0')
  console.log('==========================================')

  console.log(`\nMode                    : ${RUN_MODE}`)
  console.log(`Document model          : ${GEMINI_DOCUMENT_MODEL}`)
  console.log(`Runtime model           : ${GEMINI_RUNTIME_MODEL} (NOT CALLED)`)
  console.log(`Pipeline version        : ${PIPELINE_VERSION}`)
  console.log(`Prompt/cache version    : ${PROMPT_VERSION}/${CACHE_VERSION}`)
  console.log(`Batch size              : ${BATCH_SIZE}`)
  console.log('Detailed checklist QA   : ENABLED')
  console.log('Activity purpose gate   : ENABLED')
  console.log('Experiment causality QA : ENABLED')
  console.log(`Overlap guard           : ${EXACT_OVERLAP_WORDS} words`)
  console.log('Embeddings              : NONE')
  console.log('Supabase writes         : NONE\n')

  if (FORCE) {
    console.log(
      '⚠ --force bypasses FINAL 7.0 caches.\n',
    )
  }

  await fs.mkdir(
    OUTPUT_DIRECTORY,
    { recursive: true },
  )

  await fs.mkdir(
    STRUCTURED_DIRECTORY,
    { recursive: true },
  )

  await fs.mkdir(
    BATCH_DIRECTORY,
    { recursive: true },
  )

  await verifyFiles()

  if (RUN_MODE === 'sample') {
    await runSample()
    return
  }

  await runFullCorpus()
}

main().catch((error) => {
  console.error('\n==========================================')
  console.error(' Structured Ingestion Failed')
  console.error('==========================================\n')
  console.error(errorText(error))
  console.error(
    '\nOnly fully validated FINAL 7.0 batches are cached.',
  )
  console.error(
    'Do not use --force when resuming.\n',
  )
  process.exitCode = 1
})
