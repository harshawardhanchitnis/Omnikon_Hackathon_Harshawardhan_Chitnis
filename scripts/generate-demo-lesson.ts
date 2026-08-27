/// <reference types="node" />

import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'

import path from 'node:path'
import process from 'node:process'

import {
  GoogleGenAI,
  MediaResolution,
  ThinkingLevel,
} from '@google/genai'


import dotenv from 'dotenv'

/* ============================================================
   CHALKBOX — FULL CHAPTER LESSON GENERATOR v5

   CATALOG-GROUNDED PROVENANCE

   v5 keeps the proven v4 lesson-quality contract and adds:

   - explicit chapter concept ledger
   - objective -> lesson evidence mapping
   - major-concept coverage contract
   - full-chapter scope cannot shrink to "Part 1"
   - TEXTBOOK_VISUAL vs BOARD_VISUAL distinction
   - exact visualPagesUsed consistency
   - stronger conditional-science wording rules
   - stronger citation / activity / example provenance
   - no section timing arithmetic
   - deterministic provenance before semantic audit

   QUALITY MODEL

     Gemini 3.5 Flash / MEDIUM

   No Gemini 3.7.
   No Groq.
   No Flash-Lite generation fallback.
   No Supabase writes.

   ============================================================ */

dotenv.config({
  path: path.resolve(
    process.cwd(),
    '.env.ingest.local',
  ),
})

import {
  assertCatalogMatchesContext,
  findCatalogObjectByExactLabel,
  findVisualCatalogObject,
  loadSourceCatalogArtifact,
  sourceCatalogPromptBlock,
  sourcePagesOverlap,
  type SourceCatalog,
} from './lib/source-catalog'

/* ============================================================
   ENV
   ============================================================ */

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim()

if (!GEMINI_API_KEY) {
  throw new Error(
    [
      'GEMINI_API_KEY is missing.',
      'Expected it in .env.ingest.local.',
      'Do not paste the key into chat.',
    ].join('\n'),
  )
}

/* ============================================================
   POLICY
   ============================================================ */

const GENERATION_MODEL =
  'gemini-3.5-flash'

const THINKING_LEVEL =
  ThinkingLevel.MEDIUM

const SCHEMA_VERSION =
  5

const POLICY_VERSION =
  'chalkbox-lesson-v5-catalog-grounded-gemini-35'

const MAX_OUTPUT_TOKENS =
  32_768

const REQUEST_TIMEOUT_MS =
  180_000

const MAX_ATTEMPTS =
  1 

const RETRY_BASE_DELAY_MS =
  8_000

/* ============================================================
   PATHS
   ============================================================ */

const ROOT =
  process.cwd()

const CONTEXT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'full-chapter-context-v1',
  )

const VISUAL_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'visual-source-v1',
  )

const PREFLIGHT_FILE =
  path.resolve(
    ROOT,
    'data',
    'generation-preflight-v1',
    'report.json',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'generated-demo-lessons-v5',
  )

/* ============================================================
   LESSON DEFINITIONS
   ============================================================ */

type LessonDefinition = {
  lessonKey: string
  classLevel: number
  subject: string
  title: string
}

const LESSONS:
  LessonDefinition[] = [
  {
    lessonKey:
      'class-8-chemical-effects-electric-current',

    classLevel:
      8,

    subject:
      'Science',

    title:
      'Chemical Effects of Electric Current',
  },

  {
    lessonKey:
      'class-8-materials-metals-non-metals',

    classLevel:
      8,

    subject:
      'Science',

    title:
      'Materials: Metals and Non-Metals',
  },

  {
    lessonKey:
      'class-9-force-laws-motion',

    classLevel:
      9,

    subject:
      'Science',

    title:
      'Force and Laws of Motion',
  },

  {
    lessonKey:
      'class-9-work-energy',

    classLevel:
      9,

    subject:
      'Science',

    title:
      'Work and Energy',
  },

  {
    lessonKey:
      'class-10-life-processes',

    classLevel:
      10,

    subject:
      'Science',

    title:
      'Life Processes',
  },

  {
    lessonKey:
      'class-10-electricity',

    classLevel:
      10,

    subject:
      'Science',

    title:
      'Electricity',
  },
]

/* ============================================================
   CLI
   ============================================================ */

function cliValue(
  name: string,
) {
  const prefix =
    `--${name}=`

  const argument =
    process.argv
      .slice(2)
      .find(
        (value) =>
          value.startsWith(
            prefix,
          ),
      )

  if (!argument) {
    return null
  }

  return argument
    .slice(
      prefix.length,
    )
    .trim()
}

const LESSON_KEY =
  cliValue(
    'lesson',
  ) ??
  'class-10-life-processes'

const durationValue =
  cliValue(
    'duration',
  )

const DURATION =
  durationValue
    ? Number(
        durationValue,
      )
    : 40

if (
  !Number.isInteger(
    DURATION,
  ) ||
  DURATION < 15 ||
  DURATION > 120
) {
  throw new Error(
    '--duration must be an integer between 15 and 120.',
  )
}

function resolveLesson(
  lessonKey: string,
): LessonDefinition {
  const lesson =
    LESSONS.find(
      (candidate) =>
        candidate.lessonKey ===
        lessonKey,
    )

  if (!lesson) {
    throw new Error(
      [
        `Unknown lesson: ${lessonKey}`,
        '',
        'Available lessons:',
        ...LESSONS.map(
          (candidate) =>
            `- ${candidate.lessonKey}`,
        ),
      ].join('\n'),
    )
  }

  return lesson
}

const LESSON =
  resolveLesson(
    LESSON_KEY,
  )

/* ============================================================
   SOURCE TYPES
   ============================================================ */

type CanonicalPage = {
  pageNumber: number
  content: string
}

type FullChapterContext = {
  schemaVersion: number
  contextMode: string
  lessonKey: string
  classLevel: number
  subject: string
  title: string
  sourceFileName: string
  firstPage: number
  lastPage: number
  pageCount: number
  chunkCount: number
  approxTokenCount: number
  pages: CanonicalPage[]
  contextText: string
}

type PageMapping = {
  chapterPage: number
  sourcePdfPage: number
  textbookPageLabel: number
}

type VisualRecord = {
  lessonKey: string
  title: string
  sourceFileName: string
  outputFileName: string
  outputSha256: string
  pageCount: number
  pageMappings: PageMapping[]
}

type VisualManifest = {
  schemaVersion: number
  purpose: string
  results: VisualRecord[]
}

type PreflightResult = {
  lessonKey: string
  status: string
}

type PreflightReport = {
  schemaVersion: number
  status: string
  lessons: number
  totalPages: number
  results: PreflightResult[]
}

/* ============================================================
   VALIDATION TYPES
   ============================================================ */

type Severity =
  | 'ERROR'
  | 'WARNING'

type ValidationIssue = {
  severity: Severity
  field: string
  issueType: string
  message: string
  sourcePages?: number[]
}

/* ============================================================
   ALLOWED EVIDENCE FIELDS
   ============================================================ */

const ALLOWED_EVIDENCE_FIELDS =
  new Set([
    'fullLesson.define',
    'fullLesson.explain',
    'fullLesson.visualize',
    'fullLesson.example',
    'fullLesson.activity',
    'fullLesson.howToTeach',
    'fullLesson.boardPlan',
    'fullLesson.practice',
    'fullLesson.checkUnderstanding',
    'quickIdeas.analogy',
    'quickIdeas.lowResourceActivity',
    'quickIdeas.quickChecks',
  ])

/* ============================================================
   CLIENT
   ============================================================ */

const ai =
  new GoogleGenAI({
    apiKey:
      GEMINI_API_KEY,
  })

/* ============================================================
   HELPERS
   ============================================================ */

function sleep(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  )
}

function normalize(
  value: string,
) {
  return value
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
    .toLowerCase()
}

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    value !== null &&
    typeof value ===
      'object' &&
    !Array.isArray(
      value,
    )
  )
}

function isNonEmptyString(
  value: unknown,
) {
  return (
    typeof value ===
      'string' &&
    value.trim().length > 0
  )
}

function safeNumberArray(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return []
  }

  return value.filter(
    (
      item,
    ): item is number =>
      typeof item ===
        'number' &&
      Number.isInteger(
        item,
      ),
  )
}

function safeStringArray(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
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

function uniqueNumbers(
  values: number[],
) {
  return [
    ...new Set(
      values,
    ),
  ].sort(
    (a, b) =>
      a - b,
  )
}

function sameNumberSet(
  left: number[],
  right: number[],
) {
  const a =
    uniqueNumbers(
      left,
    )

  const b =
    uniqueNumbers(
      right,
    )

  return (
    a.length ===
      b.length &&
    a.every(
      (
        value,
        index,
      ) =>
        value ===
          b[index],
    )
  )
}

function outputPath() {
  return path.resolve(
    OUTPUT_DIRECTORY,
    `${LESSON.lessonKey}-${DURATION}min.json`,
  )
}

/* ============================================================
   ERROR HELPERS
   ============================================================ */

function collectErrorText(
  error: unknown,
) {
  const pieces:
    string[] = []

  let current:
    unknown =
      error

  for (
    let depth = 0;
    depth < 8 &&
    current;
    depth += 1
  ) {
    if (
      current instanceof
      Error
    ) {
      pieces.push(
        current.name,
        current.message,
      )

      const record =
        current as
          Error & {
            cause?: unknown
            code?: unknown
            status?: unknown
            errno?: unknown
          }

      if (
        record.code !==
        undefined
      ) {
        pieces.push(
          `code=${String(
            record.code,
          )}`,
        )
      }

      if (
        record.status !==
        undefined
      ) {
        pieces.push(
          `status=${String(
            record.status,
          )}`,
        )
      }

      if (
        record.errno !==
        undefined
      ) {
        pieces.push(
          `errno=${String(
            record.errno,
          )}`,
        )
      }

      current =
        record.cause

      continue
    }

    if (
      isObject(
        current,
      )
    ) {
      for (
        const key
        of [
          'message',
          'code',
          'status',
          'statusCode',
        ]
      ) {
        if (
          current[key] !==
          undefined
        ) {
          pieces.push(
            `${key}=${String(
              current[key],
            )}`,
          )
        }
      }

      current =
        current.cause

      continue
    }

    pieces.push(
      String(
        current,
      ),
    )

    break
  }

  return pieces.join(
    ' | ',
  )
}

function extractHttpStatus(
  error: unknown,
) {
  if (
    isObject(
      error,
    )
  ) {
    for (
      const key
      of [
        'status',
        'statusCode',
        'httpStatus',
      ]
    ) {
      const value =
        error[key]

      if (
        typeof value ===
        'number'
      ) {
        return value
      }

      if (
        typeof value ===
          'string' &&
        /^\d{3}$/.test(
          value,
        )
      ) {
        return Number(
          value,
        )
      }
    }
  }

  const match =
    collectErrorText(
      error,
    ).match(
      /\b(400|401|403|404|408|409|429|500|502|503|504)\b/,
    )

  return match
    ? Number(
        match[1],
      )
    : null
}

function isTransientError(
  error: unknown,
) {
  const status =
    extractHttpStatus(
      error,
    )

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true
  }

  if (
    status === 429
  ) {
    return false
  }

  const text =
    collectErrorText(
      error,
    )
      .toUpperCase()

  const patterns = [
    'FETCH FAILED',
    'HEADERS TIMEOUT',
    'BODY TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'SOCKET HANG UP',
    'NETWORK ERROR',
    'NETWORKERROR',
  ]

  return patterns.some(
    (pattern) =>
      text.includes(
        pattern,
      ),
  )
}

/* ============================================================
   BOUNDED RETRY
   ============================================================ */

async function withRetry<T>(
  operation:
    () => Promise<T>,
) {
  let lastError:
    unknown

  for (
    let attempt = 1;
    attempt <=
      MAX_ATTEMPTS;
    attempt += 1
  ) {
    const startedAt =
      Date.now()

    console.log(
      `[Gemini] ${GENERATION_MODEL} attempt ${attempt}/${MAX_ATTEMPTS}`,
    )

    try {
      const value =
        await operation()

      const elapsedMs =
        Date.now() -
        startedAt

      console.log(
        `[Gemini] response received in ${elapsedMs} ms\n`,
      )

      return {
        value,
        attempt,
        elapsedMs,
      }
    } catch (
      error
    ) {
      lastError =
        error

      const elapsedMs =
        Date.now() -
        startedAt

      const transient =
        isTransientError(
          error,
        )

      console.error(
        `[Gemini] attempt ${attempt} failed after ${elapsedMs} ms`,
      )

      console.error(
        `[Gemini] status=${extractHttpStatus(
          error,
        ) ?? 'none'} transient=${transient}`,
      )

      console.error(
        `[Gemini] ${collectErrorText(
          error,
        )}\n`,
      )

      if (
        !transient
      ) {
        throw error
      }

      if (
        attempt >=
        MAX_ATTEMPTS
      ) {
        break
      }

      const delay =
        RETRY_BASE_DELAY_MS +
        Math.floor(
          Math.random() *
            4_000,
        )

      console.log(
        `[Gemini] temporary failure; retrying once in ${Math.ceil(
          delay / 1000,
        )}s...\n`,
      )

      await sleep(
        delay,
      )
    }
  }

  throw lastError
}

/* ============================================================
   PREFLIGHT
   ============================================================ */

async function assertPreflight() {
  const text =
    await readFile(
      PREFLIGHT_FILE,
      'utf8',
    )

  const report =
    JSON.parse(
      text,
    ) as PreflightReport

  if (
    report.status !==
      'PASS' ||
    report.lessons !==
      6 ||
    report.totalPages !==
      100
  ) {
    throw new Error(
      'Generation preflight has not passed.',
    )
  }

  const lesson =
    report.results.find(
      (candidate) =>
        candidate.lessonKey ===
        LESSON.lessonKey,
    )

  if (
    !lesson ||
    lesson.status !==
      'PASS'
  ) {
    throw new Error(
      `${LESSON.lessonKey}: preflight missing or failed.`,
    )
  }
}

/* ============================================================
   LOAD CONTEXT
   ============================================================ */

async function loadContext() {
  const filePath =
    path.resolve(
      CONTEXT_DIRECTORY,
      `${LESSON.lessonKey}.json`,
    )

  const text =
    await readFile(
      filePath,
      'utf8',
    )

  const context =
    JSON.parse(
      text,
    ) as FullChapterContext

  if (
    context.contextMode !==
      'FULL_CHAPTER'
  ) {
    throw new Error(
      'Expected FULL_CHAPTER context.',
    )
  }

  if (
    context.lessonKey !==
      LESSON.lessonKey ||
    context.classLevel !==
      LESSON.classLevel ||
    context.subject !==
      LESSON.subject ||
    context.title !==
      LESSON.title
  ) {
    throw new Error(
      'Canonical context metadata mismatch.',
    )
  }

  if (
    context.pages.length !==
      context.pageCount
  ) {
    throw new Error(
      'Canonical page count mismatch.',
    )
  }

  for (
    let index = 0;
    index <
      context.pages.length;
    index += 1
  ) {
    const expected =
      context.firstPage +
      index

    if (
      context.pages[index]
        .pageNumber !==
      expected
    ) {
      throw new Error(
        `Canonical page order mismatch at ${expected}.`,
      )
    }
  }

  return context
}

/* ============================================================
   LOAD VISUAL SOURCE
   ============================================================ */

async function loadVisual() {
  const manifestText =
    await readFile(
      path.resolve(
        VISUAL_DIRECTORY,
        'manifest.json',
      ),
      'utf8',
    )

  const manifest =
    JSON.parse(
      manifestText,
    ) as VisualManifest

  if (
    manifest.purpose !==
      'CHALKBOX_VISUAL_GROUNDING'
  ) {
    throw new Error(
      'Unexpected visual manifest.',
    )
  }

  const record =
    manifest.results.find(
      (candidate) =>
        candidate.lessonKey ===
        LESSON.lessonKey,
    )

  if (!record) {
    throw new Error(
      'Visual manifest entry missing.',
    )
  }

  if (
    record.pageMappings.length !==
      record.pageCount
  ) {
    throw new Error(
      'Visual mapping count mismatch.',
    )
  }

  const bytes =
    await readFile(
      path.resolve(
        VISUAL_DIRECTORY,
        record.outputFileName,
      ),
    )

  if (
    bytes.length ===
    0
  ) {
    throw new Error(
      'Visual PDF is empty.',
    )
  }

  return {
    record,
    bytes,
  }
}

/* ============================================================
   PAGE MAP
   ============================================================ */

function pageMappingText(
  mappings:
    PageMapping[],
) {
  return mappings
    .map(
      (mapping) =>
        [
          `VISUAL PDF PAGE ${mapping.chapterPage}`,
          `SOURCE PDF PAGE ${mapping.sourcePdfPage}`,
          `CANONICAL SOURCE PAGE ${mapping.textbookPageLabel}`,
        ].join(
          ' -> ',
        ),
    )
    .join('\n')
}

/* ============================================================
   PROMPT
   ============================================================ */

function buildPrompt(
  context:
    FullChapterContext,

  visual:
    VisualRecord,

  catalog:
    SourceCatalog,
) {
  return `
You are ChalkBox, a high-quality CBSE/NCERT lesson-planning
system for teachers.

Generate ONE complete teacher-ready lesson.

Class: ${LESSON.classLevel}
Subject: ${LESSON.subject}
Chapter: ${LESSON.title}
Mode: FULL_CHAPTER
Requested duration metadata: ${DURATION} minutes

============================================================
NON-NEGOTIABLE FULL-CHAPTER CONTRACT
============================================================

This is FULL_CHAPTER mode.

You MUST first derive the chapter's major teachable concepts
from the COMPLETE canonical text.

Every major concept must appear in chapterConceptLedger.

Every CORE concept must then appear meaningfully in the actual
teacher-facing lesson.

Do NOT solve a duration problem by:

- renaming the lesson "Part 1";
- deleting the second half of the chapter;
- removing later major concepts;
- listing a concept only in learningObjectives;
- listing a concept only in sourceCoverage.

The lesson may be concise.

The deterministic ChalkBox timing solver runs AFTER generation.

============================================================
TIMING CONTRACT
============================================================

DO NOT assign minute values to individual sections.

DO NOT make section durations add to ${DURATION}.

requestedDurationMinutes is metadata only.

Use priority:

ESSENTIAL
IMPORTANT
OPTIONAL

ESSENTIAL:
core knowledge that should survive compression.

IMPORTANT:
useful teaching material that should normally remain.

OPTIONAL:
enrichment or material that can be shortened first.

============================================================
SOURCE HIERARCHY
============================================================

CANONICAL TEXT is authoritative for:

- scientific facts
- definitions
- formulas
- terminology
- examples
- activities
- textual claims
- sourcePages

VISUAL PDF is authoritative for:

- figures
- diagrams
- tables
- arrows
- labels
- spatial relationships
- visual structure

If prose differs:

CANONICAL TEXT WINS.

============================================================
VISUAL -> CANONICAL PAGE MAP
============================================================

${pageMappingText(
  visual.pageMappings,
)}

All sourcePages values use CANONICAL SOURCE PAGE numbering.

============================================================
SCIENTIFIC PRECISION
============================================================

Do not over-generalise scientific relationships.

Whenever a relationship is only true under a condition stated
or implied by the textbook, include that condition.

Examples of the general rule:

- proportional relationships must preserve their conditions;
- cause/effect statements must not be made more absolute than
  the source;
- material properties must not be confused with properties of
  a particular object/system;
- definitions must use the chapter's scientific distinction;
- formulas must preserve variables, units and applicable
  conditions.

Do not add advanced science outside the supplied chapter merely
to sound sophisticated.

============================================================
CHAPTER CONCEPT LEDGER
============================================================

Before composing the lesson, derive a compact concept ledger.

chapterConceptLedger must include EVERY major teachable concept.

For each concept provide:

concept:
clear canonical concept name.

importance:
CORE or SUPPORTING.

sourcePages:
canonical pages supporting that concept.

lessonEvidenceFields:
actual teacher-facing fields in which the concept is taught.

Allowed evidence fields:

fullLesson.define
fullLesson.explain
fullLesson.visualize
fullLesson.example
fullLesson.activity
fullLesson.howToTeach
fullLesson.boardPlan
fullLesson.practice
fullLesson.checkUnderstanding
quickIdeas.analogy
quickIdeas.lowResourceActivity
quickIdeas.quickChecks

A concept is NOT covered merely because its name appears in the
ledger.

============================================================
LEARNING OBJECTIVE CONSISTENCY
============================================================

Every learning objective must be actually taught.

objectiveCoverage must contain one record per learningObjective.

objectiveIndex is zero-based.

lessonEvidenceFields must identify actual lesson sections that
teach or assess that objective.

Never create an objective for a topic that disappears from the
lesson.

============================================================
CONTENT ORIGIN
============================================================

Only:

SOURCE_GROUNDED
PEDAGOGICAL_ADDITION
MIXED

SOURCE_GROUNDED:
direct representation of NCERT source.

PEDAGOGICAL_ADDITION:
teacher scaffolding created by ChalkBox.

MIXED:
source knowledge plus ChalkBox teaching scaffolding.

============================================================
VISUAL POLICY — CRITICAL
============================================================

Only:

TEXTBOOK_VISUAL
BOARD_VISUAL
NO_VISUAL_REQUIRED

TEXTBOOK_VISUAL means:

- you are asking the teacher/student to use the actual textbook
  visual as printed;
- sourceLabel must be the genuine visible figure/table label;
- sourcePages must cite the genuine canonical page;
- boardDrawingSteps MUST be [];
- do not claim an exact redraw unless spatial structure is
  truly important and faithfully represented.

BOARD_VISUAL means:

- ChalkBox creates a teacher-friendly board representation;
- sourceLabel MUST be null;
- boardDrawingSteps should be actionable;
- exact top/bottom/left/right source layout is NOT required;
- scientific relationships, topology, connections,
  directionality and labels MUST remain correct;
- sourcePages may cite textbook pages grounding the visual;
- sourceLimitations should state when it is an adapted board
  representation rather than an exact textbook reproduction.

For circuit-like/network diagrams, topology matters more than
cosmetic orientation.

For biological diagrams, preserve scientifically meaningful
anatomical relationships and directions.

NO_VISUAL_REQUIRED means:

- sourceLabel MUST be null;
- boardDrawingSteps MUST be [].

${sourceCatalogPromptBlock(
  catalog,
)}

============================================================
ACTIVITY PROVENANCE
============================================================

Only:

TEXTBOOK_ACTIVITY
CHALKBOX_ACTIVITY

TEXTBOOK_ACTIVITY:

- exact activity genuinely exists;
- sourceLabel matches the textbook label;
- cited sourcePages contain the activity;
- generated procedure remains faithful;
- activity is semantically relevant to the concept being taught.

CHALKBOX_ACTIVITY:

- sourceLabel = null;
- science remains grounded;
- practical and safe for a low-resource classroom.

============================================================
EXAMPLE PROVENANCE
============================================================

Only:

TEXTBOOK_EXAMPLE
CHALKBOX_EXAMPLE

TEXTBOOK_EXAMPLE may be used ONLY when the canonical textbook
contains an explicitly identifiable/labeled example.

Requirements:

- sourceLabel is REQUIRED;
- sourceLabel must be the exact textbook label;
- cited canonical sourcePages must contain that label;
- generated content must remain faithful to the source example.

If the textbook explains a phenomenon, process, calculation or
application but does NOT explicitly identify it as a labelled
example:

DO NOT use TEXTBOOK_EXAMPLE.

Use CHALKBOX_EXAMPLE instead.

CHALKBOX_EXAMPLE includes:

- ChalkBox-created worked examples;
- teacher-facing illustrations synthesized from NCERT content;
- applications derived from source material that are not
  explicitly labelled textbook examples.

For CHALKBOX_EXAMPLE:

- sourceLabel MUST be null;
- scientific content must remain grounded in cited canonical
  pages;
- use contentOrigin=MIXED when source science is combined with
  ChalkBox teaching framing;
- use sourceLimitations to state when the example is a
  ChalkBox teaching construction rather than a labelled NCERT
  example.

============================================================
TEACHER EXPERIENCE
============================================================

This is not a chapter summary.

The output must help a teacher teach.

Use the ChalkBox flow:

Define
Explain
Visualize
Example
Activity
How to Teach
Practice
Check Understanding

Also include:

- prerequisites
- hook
- board plan
- misconceptions
- materials
- Quick Ideas
- source coverage

Prefer low-resource classroom methods.

============================================================
OUTPUT COMPLETENESS
============================================================

Return ONE complete JSON object.

Be comprehensive but economical.

Do not spend most tokens on the first concepts and then omit
later chapter concepts.

Aim for:

- 5–12 chapter ledger concepts depending on chapter complexity
- 2–4 prerequisites
- 4–8 learning objectives
- exactly one main activity object
- 2–5 misconceptions
- 3–6 practice questions
- 3–6 checks for understanding
- 1–3 Quick Ideas checks

============================================================
REQUIRED JSON
============================================================

Return JSON only.

{
  "schemaVersion": ${SCHEMA_VERSION},

  "generationPolicyVersion": "${POLICY_VERSION}",

  "lessonKey": "${LESSON.lessonKey}",

  "title": "${LESSON.title}",

  "classLevel": ${LESSON.classLevel},

  "subject": "${LESSON.subject}",

  "requestedDurationMinutes": ${DURATION},

  "chapterConceptLedger": [
    {
      "concept": "...",
      "importance": "CORE | SUPPORTING",
      "sourcePages": [],
      "lessonEvidenceFields": []
    }
  ],

  "prerequisites": [
    {
      "concept": "...",
      "importance": "REQUIRED | HELPFUL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "sourcePages": [],
      "sourceLimitations": []
    }
  ],

  "learningObjectives": [
    "..."
  ],

  "objectiveCoverage": [
    {
      "objectiveIndex": 0,
      "lessonEvidenceFields": []
    }
  ],

  "hook": {
    "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
    "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
    "teacherPrompt": "...",
    "expectedStudentResponse": "...",
    "sourcePages": [],
    "sourceLimitations": []
  },

  "fullLesson": {
    "define": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "teacherScript": "...",
      "boardWork": [],
      "keyPoints": [],
      "sourcePages": [],
      "sourceLimitations": []
    },

    "explain": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "teacherScript": "...",
      "boardWork": [],
      "keyPoints": [],
      "sourcePages": [],
      "sourceLimitations": []
    },

    "visualize": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "sourceType": "TEXTBOOK_VISUAL | BOARD_VISUAL | NO_VISUAL_REQUIRED",
      "sourceLabel": null,
      "teacherInstructions": "...",
      "boardDrawingSteps": [],
      "whatStudentsShouldNotice": [],
      "sourcePages": [],
      "sourceLimitations": []
    },

    "example": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "sourceType": "TEXTBOOK_EXAMPLE | CHALKBOX_EXAMPLE",
      "sourceLabel": null,
      "title": "...",
      "explanation": "...",
      "steps": [],
      "sourcePages": [],
      "sourceLimitations": []
    },

    "activity": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "sourceType": "TEXTBOOK_ACTIVITY | CHALKBOX_ACTIVITY",
      "sourceLabel": null,
      "title": "...",
      "concepts": [],
      "objective": "...",
      "materials": [],
      "steps": [],
      "safetyNote": null,
      "sourcePages": [],
      "sourceLimitations": []
    },

    "howToTeach": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",

      "teacherMoves": [],

      "misconceptions": [
        {
          "misconception": "...",
          "correction": "...",
          "sourcePages": []
        }
      ],

      "questionsToAsk": [],

      "sourcePages": [],

      "sourceLimitations": []
    },

    "boardPlan": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "text": "...",
      "sourcePages": [],
      "sourceLimitations": []
    },

    "practice": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",

      "questions": [
        {
          "question": "...",
          "expectedAnswer": "...",
          "sourcePages": []
        }
      ]
    },

    "checkUnderstanding": {
      "priority": "ESSENTIAL | IMPORTANT | OPTIONAL",

      "questions": [
        {
          "question": "...",
          "expectedAnswer": "...",
          "difficulty": "basic | intermediate | application",
          "sourcePages": []
        }
      ]
    },

    "materials": []
  },

  "quickIdeas": {
    "analogy": {
      "contentOrigin": "PEDAGOGICAL_ADDITION | MIXED",
      "text": "...",
      "sourcePages": [],
      "sourceLimitations": []
    },

    "lowResourceActivity": {
      "priority": "IMPORTANT | OPTIONAL",
      "contentOrigin": "SOURCE_GROUNDED | PEDAGOGICAL_ADDITION | MIXED",
      "sourceType": "TEXTBOOK_ACTIVITY | CHALKBOX_ACTIVITY",
      "sourceLabel": null,
      "title": "...",
      "concepts": [],
      "objective": "...",
      "materials": [],
      "steps": [],
      "safetyNote": null,
      "sourcePages": [],
      "sourceLimitations": []
    },

    "quickChecks": [
      {
        "question": "...",
        "expectedAnswer": "...",
        "sourcePages": []
      }
    ]
  },

  "sourceCoverage": {
    "pagesUsed": [],
    "keyConceptsCovered": [],
    "visualPagesUsed": [],
    "sourceLimitations": []
  }
}

============================================================
SOURCE COVERAGE CONSISTENCY
============================================================

sourceCoverage.keyConceptsCovered must contain the EXACT
concept strings from chapterConceptLedger, in the same order.

sourceCoverage.pagesUsed must contain all canonical pages used
by the chapter concept ledger and meaningful lesson citations.

sourceCoverage.visualPagesUsed must be EXACTLY the canonical
source pages used by:

TEXTBOOK_VISUAL
or
BOARD_VISUAL

Do not list visual pages that are not actually used.

============================================================
COMPLETE CANONICAL NCERT TEXT
============================================================

${context.contextText}

============================================================
FINAL SELF-CHECK
============================================================

Before returning:

1. Derive all major chapter concepts.

2. Every CORE concept appears in actual teacher-facing content.

3. No major later chapter topic disappears.

4. Every learning objective has actual lesson evidence.

5. Scientific conditions/caveats are preserved.

6. TEXTBOOK_VISUAL means actual source visual use and has no
   boardDrawingSteps.

7. BOARD_VISUAL means an adapted teacher drawing and has
   sourceLabel=null.

8. visualPagesUsed exactly matches actual visual grounding.

9. Textbook activities/examples have genuine labels and pages.

10. sourceCoverage concept list exactly mirrors concept ledger.

11. No section minute arithmetic.

12. Keep the lesson concise enough for later priority-based
    deterministic compression.

Return JSON only.
`.trim()
}

/* ============================================================
   JSON PARSE
   ============================================================ */

function parseJson(
  text: string,
) {
  const cleaned =
    text
      .trim()
      .replace(
        /^```json\s*/i,
        '',
      )
      .replace(
        /^```\s*/,
        '',
      )
      .replace(
        /\s*```$/,
        '',
      )
      .trim()

  return JSON.parse(
    cleaned,
  ) as unknown
}

/* ============================================================
   SOURCE NODE COLLECTION
   ============================================================ */

type SourceNode = {
  field: string
  sourceType: string
  sourceLabel: string | null
  sourcePages: number[]
  boardDrawingSteps: string[]
}

function collectSourceNodes(
  value: unknown,
) {
  const nodes:
    SourceNode[] = []

  function visit(
    current: unknown,
    field: string,
  ) {
    if (
      Array.isArray(
        current,
      )
    ) {
      current.forEach(
        (
          child,
          index,
        ) =>
          visit(
            child,
            `${field}[${index}]`,
          ),
      )

      return
    }

    if (
      !isObject(
        current,
      )
    ) {
      return
    }

    if (
      typeof current.sourceType ===
        'string'
    ) {
      nodes.push({
        field,

        sourceType:
          current.sourceType,

        sourceLabel:
          typeof current.sourceLabel ===
            'string'
            ? current.sourceLabel
            : null,

        sourcePages:
          safeNumberArray(
            current.sourcePages,
          ),

        boardDrawingSteps:
          safeStringArray(
            current.boardDrawingSteps,
          ),
      })
    }

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        current,
      )
    ) {
      visit(
        child,
        field
          ? `${field}.${key}`
          : key,
      )
    }
  }

  visit(
    value,
    '',
  )

  return nodes
}

/* ============================================================
   VALIDATION
   ============================================================ */

function validateLesson(
  raw: unknown,

  context:
    FullChapterContext,

  catalog:
    SourceCatalog,
) {
  const issues:
    ValidationIssue[] = []

  function error(
    field: string,
    issueType: string,
    message: string,
    sourcePages?: number[],
  ) {
    issues.push({
      severity:
        'ERROR',

      field,

      issueType,

      message,

      sourcePages,
    })
  }

  function warning(
    field: string,
    issueType: string,
    message: string,
    sourcePages?: number[],
  ) {
    issues.push({
      severity:
        'WARNING',

      field,

      issueType,

      message,

      sourcePages,
    })
  }

  if (
    !isObject(
      raw,
    )
  ) {
    error(
      'lesson',
      'INVALID_ROOT',
      'Generated lesson is not an object.',
    )

    return issues
  }

  /* ----------------------------------------------------------
     Metadata
     ---------------------------------------------------------- */

  const metadata:
    Array<
      [
        string,
        unknown,
      ]
    > = [
      [
        'schemaVersion',
        SCHEMA_VERSION,
      ],

      [
        'generationPolicyVersion',
        POLICY_VERSION,
      ],

      [
        'lessonKey',
        LESSON.lessonKey,
      ],

      [
        'title',
        LESSON.title,
      ],

      [
        'classLevel',
        LESSON.classLevel,
      ],

      [
        'subject',
        LESSON.subject,
      ],

      [
        'requestedDurationMinutes',
        DURATION,
      ],
    ]

  for (
    const [
      key,
      expected,
    ]
    of metadata
  ) {
    if (
      raw[key] !==
      expected
    ) {
      error(
        key,
        'METADATA_MISMATCH',
        [
          `Expected ${JSON.stringify(
            expected,
          )}.`,
          `Found ${JSON.stringify(
            raw[key],
          )}.`,
        ].join(' '),
      )
    }
  }

  const validPages =
    new Set(
      context.pages.map(
        (page) =>
          page.pageNumber,
      ),
    )

  /* ----------------------------------------------------------
     Recursive page validation
     ---------------------------------------------------------- */

  function visitPages(
    value: unknown,
    field: string,
  ) {
    if (
      Array.isArray(
        value,
      )
    ) {
      value.forEach(
        (
          child,
          index,
        ) =>
          visitPages(
            child,
            `${field}[${index}]`,
          ),
      )

      return
    }

    if (
      !isObject(
        value,
      )
    ) {
      return
    }

    if (
      'sourcePages' in
        value
    ) {
      if (
        !Array.isArray(
          value.sourcePages,
        )
      ) {
        error(
          `${field}.sourcePages`,
          'INVALID_SOURCE_PAGES',
          'sourcePages must be an array.',
        )
      } else {
        for (
          const page
          of value.sourcePages
        ) {
          if (
            !Number.isInteger(
              page,
            ) ||
            !validPages.has(
              page as number,
            )
          ) {
            error(
              `${field}.sourcePages`,
              'INVALID_CANONICAL_PAGE',
              `Invalid canonical page ${String(
                page,
              )}.`,
            )
          }
        }
      }
    }

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        value,
      )
    ) {
      visitPages(
        child,
        field
          ? `${field}.${key}`
          : key,
      )
    }
  }

  visitPages(
    raw,
    '',
  )

  /* ----------------------------------------------------------
     Concept ledger
     ---------------------------------------------------------- */

  if (
    !Array.isArray(
      raw.chapterConceptLedger,
    ) ||
    raw.chapterConceptLedger.length <
      5
  ) {
    error(
      'chapterConceptLedger',
      'INSUFFICIENT_CONCEPT_LEDGER',
      'Full-chapter mode requires at least five major/supporting concepts.',
    )
  }

  const ledgerConcepts:
    string[] = []

  const ledgerPages:
    number[] = []

  if (
    Array.isArray(
      raw.chapterConceptLedger,
    )
  ) {
    raw.chapterConceptLedger.forEach(
      (
        item,
        index,
      ) => {
        if (
          !isObject(
            item,
          )
        ) {
          error(
            `chapterConceptLedger[${index}]`,
            'INVALID_LEDGER_ITEM',
            'Concept ledger item must be an object.',
          )

          return
        }

        if (
          !isNonEmptyString(
            item.concept,
          )
        ) {
          error(
            `chapterConceptLedger[${index}].concept`,
            'MISSING_CONCEPT',
            'Concept name is required.',
          )
        } else {
          ledgerConcepts.push(
            item.concept as
              string,
          )
        }

        if (
          item.importance !==
            'CORE' &&
          item.importance !==
            'SUPPORTING'
        ) {
          error(
            `chapterConceptLedger[${index}].importance`,
            'INVALID_CONCEPT_IMPORTANCE',
            'importance must be CORE or SUPPORTING.',
          )
        }

        const pages =
          safeNumberArray(
            item.sourcePages,
          )

        if (
          pages.length ===
          0
        ) {
          error(
            `chapterConceptLedger[${index}].sourcePages`,
            'EMPTY_CONCEPT_SOURCE',
            'Every concept needs canonical source pages.',
          )
        }

        ledgerPages.push(
          ...pages,
        )

        const evidence =
          safeStringArray(
            item.lessonEvidenceFields,
          )

        if (
          evidence.length ===
          0
        ) {
          error(
            `chapterConceptLedger[${index}].lessonEvidenceFields`,
            'CONCEPT_HAS_NO_LESSON_EVIDENCE',
            'Every ledger concept must identify actual lesson evidence.',
          )
        }

        for (
          const field
          of evidence
        ) {
          if (
            !ALLOWED_EVIDENCE_FIELDS.has(
              field,
            )
          ) {
            error(
              `chapterConceptLedger[${index}].lessonEvidenceFields`,
              'INVALID_EVIDENCE_FIELD',
              `Unsupported evidence field: ${field}`,
            )
          }
        }
      },
    )
  }

  /* ----------------------------------------------------------
     Learning objectives
     ---------------------------------------------------------- */

  const objectives =
    safeStringArray(
      raw.learningObjectives,
    )

  if (
    objectives.length <
      4
  ) {
    error(
      'learningObjectives',
      'INSUFFICIENT_OBJECTIVES',
      'At least four learning objectives are required.',
    )
  }

  if (
    !Array.isArray(
      raw.objectiveCoverage,
    )
  ) {
    error(
      'objectiveCoverage',
      'MISSING_OBJECTIVE_COVERAGE',
      'objectiveCoverage must be an array.',
    )
  } else {
    if (
      raw.objectiveCoverage.length !==
      objectives.length
    ) {
      error(
        'objectiveCoverage',
        'OBJECTIVE_COVERAGE_COUNT_MISMATCH',
        [
          `Objectives=${objectives.length}.`,
          `Coverage records=${raw.objectiveCoverage.length}.`,
        ].join(' '),
      )
    }

    const indexes =
      new Set<number>()

    raw.objectiveCoverage.forEach(
      (
        entry,
        index,
      ) => {
        if (
          !isObject(
            entry,
          )
        ) {
          error(
            `objectiveCoverage[${index}]`,
            'INVALID_OBJECTIVE_COVERAGE',
            'Coverage record must be an object.',
          )

          return
        }

        if (
          !Number.isInteger(
            entry.objectiveIndex,
          )
        ) {
          error(
            `objectiveCoverage[${index}].objectiveIndex`,
            'INVALID_OBJECTIVE_INDEX',
            'objectiveIndex must be an integer.',
          )

          return
        }

        const objectiveIndex =
          entry.objectiveIndex as
            number

        if (
          objectiveIndex < 0 ||
          objectiveIndex >=
            objectives.length
        ) {
          error(
            `objectiveCoverage[${index}].objectiveIndex`,
            'OBJECTIVE_INDEX_OUT_OF_RANGE',
            `Invalid objective index ${objectiveIndex}.`,
          )
        }

        if (
          indexes.has(
            objectiveIndex,
          )
        ) {
          error(
            `objectiveCoverage[${index}].objectiveIndex`,
            'DUPLICATE_OBJECTIVE_INDEX',
            `Duplicate objective index ${objectiveIndex}.`,
          )
        }

        indexes.add(
          objectiveIndex,
        )

        const evidence =
          safeStringArray(
            entry.lessonEvidenceFields,
          )

        if (
          evidence.length ===
          0
        ) {
          error(
            `objectiveCoverage[${index}].lessonEvidenceFields`,
            'OBJECTIVE_HAS_NO_LESSON_EVIDENCE',
            'Every objective must have lesson evidence.',
          )
        }

        for (
          const field
          of evidence
        ) {
          if (
            !ALLOWED_EVIDENCE_FIELDS.has(
              field,
            )
          ) {
            error(
              `objectiveCoverage[${index}].lessonEvidenceFields`,
              'INVALID_EVIDENCE_FIELD',
              `Unsupported evidence field: ${field}`,
            )
          }
        }
      },
    )
  }

  /* ----------------------------------------------------------
     Structural requirements
     ---------------------------------------------------------- */

  for (
    const key
    of [
      'hook',
      'fullLesson',
      'quickIdeas',
      'sourceCoverage',
    ]
  ) {
    if (
      !isObject(
        raw[key],
      )
    ) {
      error(
        key,
        'MISSING_REQUIRED_OBJECT',
        `${key} must be an object.`,
      )
    }
  }

  if (
    isObject(
      raw.fullLesson,
    )
  ) {
    for (
      const key
      of [
        'define',
        'explain',
        'visualize',
        'example',
        'activity',
        'howToTeach',
        'boardPlan',
        'practice',
        'checkUnderstanding',
      ]
    ) {
      if (
        !isObject(
          raw.fullLesson[
            key
          ],
        )
      ) {
        error(
          `fullLesson.${key}`,
          'MISSING_REQUIRED_SECTION',
          `fullLesson.${key} must be an object.`,
        )
      }
    }
  }

  /* ----------------------------------------------------------
     Provenance nodes — catalog grounded
     ---------------------------------------------------------- */

  const sourceNodes =
    collectSourceNodes(
      raw,
    )

  for (
    const node
    of sourceNodes
  ) {
    /* --------------------------------------------------------
       Generated / adapted content may never claim a textbook
       source label.
       -------------------------------------------------------- */

    if (
      node.sourceType ===
        'CHALKBOX_ACTIVITY' ||
      node.sourceType ===
        'CHALKBOX_EXAMPLE' ||
      node.sourceType ===
        'BOARD_VISUAL' ||
      node.sourceType ===
        'NO_VISUAL_REQUIRED'
    ) {
      if (
        node.sourceLabel !==
        null
      ) {
        error(
          `${node.field}.sourceLabel`,
          'GENERATED_CONTENT_HAS_SOURCE_LABEL',
          `${node.sourceType} requires sourceLabel=null.`,
        )
      }
    }

    /* --------------------------------------------------------
       CATALOG-GROUNDED TEXTBOOK ACTIVITY
       -------------------------------------------------------- */

    if (
      node.sourceType ===
        'TEXTBOOK_ACTIVITY'
    ) {
      if (
        !node.sourceLabel
      ) {
        error(
          `${node.field}.sourceLabel`,
          'MISSING_TEXTBOOK_LABEL',
          'TEXTBOOK_ACTIVITY requires a catalogued sourceLabel.',
        )
      } else {
        const sourceObject =
          findCatalogObjectByExactLabel(
            catalog,
            'ACTIVITY',
            node.sourceLabel,
          )

        if (
          !sourceObject
        ) {
          error(
            `${node.field}.sourceLabel`,
            'SOURCE_LABEL_NOT_IN_CATALOG',
            [
              `"${node.sourceLabel}" is not a catalogued textbook activity.`,
              'Use CHALKBOX_ACTIVITY with sourceLabel=null if no suitable textbook activity exists.',
            ].join(' '),
          )
        } else if (
          !sourcePagesOverlap(
            node.sourcePages,
            sourceObject.sourcePages,
          )
        ) {
          error(
            `${node.field}.sourcePages`,
            'CATALOG_SOURCE_PAGE_MISMATCH',
            [
              `"${node.sourceLabel}" is catalogued on canonical pages`,
              `[${sourceObject.sourcePages.join(
                ', ',
              )}]`,
              `but lesson claims [${node.sourcePages.join(
                ', ',
              )}].`,
            ].join(' '),
            sourceObject.sourcePages,
          )
        } else {
          warning(
            node.field,
            'FINAL_ACTIVITY_SEMANTIC_AUDIT_REQUIRED',
            'Textbook activity label/page provenance passed catalog validation; semantic relevance must still be independently audited.',
            node.sourcePages,
          )
        }
      }
    }

    /* --------------------------------------------------------
       CATALOG-GROUNDED TEXTBOOK EXAMPLE
       -------------------------------------------------------- */

    if (
      node.sourceType ===
        'TEXTBOOK_EXAMPLE'
    ) {
      if (
        !node.sourceLabel
      ) {
        error(
          `${node.field}.sourceLabel`,
          'MISSING_TEXTBOOK_LABEL',
          [
            'TEXTBOOK_EXAMPLE requires a catalogued sourceLabel.',
            'Unlabelled source-derived teaching examples must use CHALKBOX_EXAMPLE.',
          ].join(' '),
        )
      } else {
        const sourceObject =
          findCatalogObjectByExactLabel(
            catalog,
            'EXAMPLE',
            node.sourceLabel,
          )

        if (
          !sourceObject
        ) {
          error(
            `${node.field}.sourceLabel`,
            'SOURCE_LABEL_NOT_IN_CATALOG',
            [
              `"${node.sourceLabel}" is not a catalogued textbook example.`,
              'Use CHALKBOX_EXAMPLE with sourceLabel=null instead.',
            ].join(' '),
          )
        } else if (
          !sourcePagesOverlap(
            node.sourcePages,
            sourceObject.sourcePages,
          )
        ) {
          error(
            `${node.field}.sourcePages`,
            'CATALOG_SOURCE_PAGE_MISMATCH',
            [
              `"${node.sourceLabel}" is catalogued on canonical pages`,
              `[${sourceObject.sourcePages.join(
                ', ',
              )}]`,
              `but lesson claims [${node.sourcePages.join(
                ', ',
              )}].`,
            ].join(' '),
            sourceObject.sourcePages,
          )
        }
      }
    }

    /* --------------------------------------------------------
       CATALOG-GROUNDED TEXTBOOK VISUAL
       -------------------------------------------------------- */

    if (
      node.sourceType ===
        'TEXTBOOK_VISUAL'
    ) {
      if (
        !node.sourceLabel
      ) {
        error(
          `${node.field}.sourceLabel`,
          'TEXTBOOK_VISUAL_LABEL_REQUIRED',
          'TEXTBOOK_VISUAL requires a catalogued Figure/Table label.',
        )
      } else {
        const sourceObject =
          findVisualCatalogObject(
            catalog,
            node.sourceLabel,
          )

        if (
          !sourceObject
        ) {
          error(
            `${node.field}.sourceLabel`,
            'VISUAL_LABEL_NOT_IN_CATALOG',
            [
              `"${node.sourceLabel}" is not a catalogued textbook figure/table.`,
              'Use BOARD_VISUAL with sourceLabel=null for an adapted teacher drawing.',
            ].join(' '),
          )
        } else if (
          !sourcePagesOverlap(
            node.sourcePages,
            sourceObject.sourcePages,
          )
        ) {
          error(
            `${node.field}.sourcePages`,
            'CATALOG_VISUAL_PAGE_MISMATCH',
            [
              `"${node.sourceLabel}" is catalogued on canonical pages`,
              `[${sourceObject.sourcePages.join(
                ', ',
              )}]`,
              `but lesson claims [${node.sourcePages.join(
                ', ',
              )}].`,
            ].join(' '),
            sourceObject.sourcePages,
          )
        }
      }

      if (
        node.boardDrawingSteps.length >
          0
      ) {
        error(
          `${node.field}.boardDrawingSteps`,
          'TEXTBOOK_VISUAL_CANNOT_BE_ADAPTED_REDRAW',
          [
            'TEXTBOOK_VISUAL means use of the source visual.',
            'Use BOARD_VISUAL for teacher redraws.',
          ].join(' '),
        )
      }

      warning(
        node.field,
        'FINAL_TEXTBOOK_VISUAL_AUDIT_REQUIRED',
        'Catalog provenance passed; exact textbook visual still requires multimodal verification.',
        node.sourcePages,
      )
    }

    /* --------------------------------------------------------
       BOARD VISUAL
       -------------------------------------------------------- */

    if (
      node.sourceType ===
        'BOARD_VISUAL'
    ) {
      if (
        node.boardDrawingSteps.length ===
          0
      ) {
        error(
          `${node.field}.boardDrawingSteps`,
          'BOARD_VISUAL_HAS_NO_DRAWING_STEPS',
          'BOARD_VISUAL requires actionable drawing steps.',
        )
      }

      warning(
        node.field,
        'FINAL_BOARD_VISUAL_AUDIT_REQUIRED',
        'Board visual requires later scientific/topological verification.',
        node.sourcePages,
      )
    }

    /* --------------------------------------------------------
       NO VISUAL
       -------------------------------------------------------- */

    if (
      node.sourceType ===
        'NO_VISUAL_REQUIRED' &&
      node.boardDrawingSteps.length >
        0
    ) {
      error(
        `${node.field}.boardDrawingSteps`,
        'NO_VISUAL_HAS_DRAWING_STEPS',
        'NO_VISUAL_REQUIRED must not contain drawing steps.',
      )
    }
  }

  /* ----------------------------------------------------------
     Source coverage consistency
     ---------------------------------------------------------- */

  if (
    isObject(
      raw.sourceCoverage,
    )
  ) {
    const claimedConcepts =
      safeStringArray(
        raw.sourceCoverage
          .keyConceptsCovered,
      )

    if (
      claimedConcepts.length !==
        ledgerConcepts.length ||
      claimedConcepts.some(
        (
          concept,
          index,
        ) =>
          concept !==
          ledgerConcepts[index],
      )
    ) {
      error(
        'sourceCoverage.keyConceptsCovered',
        'CONCEPT_LEDGER_COVERAGE_MISMATCH',
        'keyConceptsCovered must exactly mirror chapterConceptLedger concept names in order.',
      )
    }

    const pagesUsed =
      safeNumberArray(
        raw.sourceCoverage
          .pagesUsed,
      )

    const missingLedgerPages =
      uniqueNumbers(
        ledgerPages,
      ).filter(
        (page) =>
          !pagesUsed.includes(
            page,
          ),
      )

    if (
      missingLedgerPages.length >
        0
    ) {
      error(
        'sourceCoverage.pagesUsed',
        'LEDGER_PAGES_MISSING_FROM_COVERAGE',
        `Missing ledger source pages: ${missingLedgerPages.join(
          ', ',
        )}`,
        missingLedgerPages,
      )
    }

    const expectedVisualPages =
      uniqueNumbers(
        sourceNodes
          .filter(
            (node) =>
              node.sourceType ===
                'TEXTBOOK_VISUAL' ||
              node.sourceType ===
                'BOARD_VISUAL',
          )
          .flatMap(
            (node) =>
              node.sourcePages,
          ),
      )

    const claimedVisualPages =
      safeNumberArray(
        raw.sourceCoverage
          .visualPagesUsed,
      )

    if (
      !sameNumberSet(
        expectedVisualPages,
        claimedVisualPages,
      )
    ) {
      error(
        'sourceCoverage.visualPagesUsed',
        'VISUAL_PAGE_SET_MISMATCH',
        [
          `Expected [${expectedVisualPages.join(
            ', ',
          )}]`,
          `but found [${claimedVisualPages.join(
            ', ',
          )}].`,
        ].join(' '),
      )
    }
  }

  /* ----------------------------------------------------------
     Minimum classroom completeness
     ---------------------------------------------------------- */

  if (
    isObject(
      raw.fullLesson,
    )
  ) {
    const practice =
      raw.fullLesson
        .practice

    if (
      isObject(
        practice,
      ) &&
      safeStringArray(
        [],
      ) !==
      null
    ) {
      if (
        !Array.isArray(
          practice.questions,
        ) ||
        practice.questions.length <
          3
      ) {
        error(
          'fullLesson.practice.questions',
          'INSUFFICIENT_PRACTICE',
          'At least three practice questions are required.',
        )
      }
    }

    const checks =
      raw.fullLesson
        .checkUnderstanding

    if (
      isObject(
        checks,
      )
    ) {
      if (
        !Array.isArray(
          checks.questions,
        ) ||
        checks.questions.length <
          3
      ) {
        error(
          'fullLesson.checkUnderstanding.questions',
          'INSUFFICIENT_CHECKS',
          'At least three understanding checks are required.',
        )
      }
    }

    const howToTeach =
      raw.fullLesson
        .howToTeach

    if (
      isObject(
        howToTeach,
      )
    ) {
      if (
        !Array.isArray(
          howToTeach.misconceptions,
        ) ||
        howToTeach.misconceptions.length <
          2
      ) {
        error(
          'fullLesson.howToTeach.misconceptions',
          'INSUFFICIENT_MISCONCEPTIONS',
          'At least two misconception/correction pairs are required.',
        )
      }
    }
  }

  /* ----------------------------------------------------------
     No nested timing arithmetic fields.
     ---------------------------------------------------------- */

  function inspectTimingKeys(
    value: unknown,
    field: string,
  ) {
    if (
      Array.isArray(
        value,
      )
    ) {
      value.forEach(
        (
          child,
          index,
        ) =>
          inspectTimingKeys(
            child,
            `${field}[${index}]`,
          ),
      )

      return
    }

    if (
      !isObject(
        value,
      )
    ) {
      return
    }

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        value,
      )
    ) {
      const childField =
        field
          ? `${field}.${key}`
          : key

      if (
        childField !==
          'requestedDurationMinutes' &&
        (
          key ===
            'minutes' ||
          key ===
            'durationMinutes' ||
          key ===
            'timing' ||
          key ===
            'timeAllocation'
        )
      ) {
        error(
          childField,
          'MODEL_TIMING_FIELD_NOT_ALLOWED',
          'Exact timing belongs to the deterministic solver, not generation.',
        )
      }

      inspectTimingKeys(
        child,
        childField,
      )
    }
  }

  inspectTimingKeys(
    raw,
    '',
  )

  return issues
}

/* ============================================================
   GENERATE
   ============================================================ */

async function generateLesson(
  context:
    FullChapterContext,

  visual:
    VisualRecord,

  catalog:
    SourceCatalog,

  pdfBytes:
    Buffer,
) {
  const prompt =
    buildPrompt(
      context,
      visual,
      catalog,
    )

  /*
   * IMPORTANT:
   *
   * withRetry wraps BOTH stream creation AND stream consumption.
   *
   * If the connection dies while chunks are being consumed,
   * the whole attempt is still considered transient/retryable.
   */
  const result =
    await withRetry(
      async () => {
        const stream =
          await ai.models.generateContentStream({
            model:
              GENERATION_MODEL,

            contents: [
              {
                text:
                  prompt,
              },

              {
                inlineData: {
                  mimeType:
                    'application/pdf',

                  data:
                    pdfBytes.toString(
                      'base64',
                    ),
                },
              },
            ],

            config: {
              responseMimeType:
                'application/json',

              maxOutputTokens:
                MAX_OUTPUT_TOKENS,

              thinkingConfig: {
                thinkingLevel:
                  THINKING_LEVEL,
              },

              mediaResolution:
                MediaResolution
                  .MEDIA_RESOLUTION_HIGH,

              httpOptions: {
                timeout:
                  REQUEST_TIMEOUT_MS,
              },
            },
          })

        let responseText =
          ''

        let receivedChunks =
          0

        let streamOpened =
          false

        let lastCandidate:
          {
            finishReason?:
              unknown

            finishMessage?:
              string | null
          } |
          null =
          null

        let usageMetadata:
          {
            promptTokenCount?:
              number

            candidatesTokenCount?:
              number

            thoughtsTokenCount?:
              number

            totalTokenCount?:
              number
          } |
          null =
          null

        let modelVersion:
          string |
          null =
          null

        let responseId:
          string |
          null =
          null

        for await (
          const chunk
          of stream
        ) {
          const chunkText =
            chunk.text ??
            ''

          if (
            chunkText.length >
              0
          ) {
            if (
              !streamOpened
            ) {
              console.log(
                '[Gemini] stream opened; receiving output...',
              )

              streamOpened =
                true
            }

            responseText +=
              chunkText

            receivedChunks +=
              1

            /*
             * Give terminal feedback without dumping the lesson JSON.
             */
            if (
              receivedChunks %
                8 ===
              0
            ) {
              process.stdout.write(
                '.',
              )
            }
          }

          const candidate =
            chunk
              .candidates?.[0]

          if (
            candidate
          ) {
            lastCandidate =
              candidate
          }

          if (
            chunk.usageMetadata
          ) {
            usageMetadata =
              chunk.usageMetadata
          }

          if (
            typeof chunk
              .modelVersion ===
              'string'
          ) {
            modelVersion =
              chunk.modelVersion
          }

          if (
            typeof chunk
              .responseId ===
              'string'
          ) {
            responseId =
              chunk.responseId
          }
        }

        if (
          streamOpened
        ) {
          process.stdout.write(
            '\n',
          )
        }

        if (
          receivedChunks ===
            0 ||
          responseText.trim()
            .length ===
            0
        ) {
          throw new Error(
            'Generation stream returned no output.',
          )
        }

        if (
          !lastCandidate
        ) {
          throw new Error(
            'Generation stream returned no candidate.',
          )
        }

        return {
          responseText,

          candidate:
            lastCandidate,

          usageMetadata,

          modelVersion,

          responseId,

          receivedChunks,
        }
      },
    )

  const streamed =
    result.value

  const candidate =
    streamed.candidate

  const finishReason =
    String(
      candidate.finishReason ??
        'FINISH_REASON_UNSPECIFIED',
    )

  const finishMessage =
    candidate.finishMessage ??
    null

  const usage = {
    promptTokens:
      streamed
        .usageMetadata
        ?.promptTokenCount ??
      null,

    outputTokens:
      streamed
        .usageMetadata
        ?.candidatesTokenCount ??
      null,

    thoughtTokens:
      streamed
        .usageMetadata
        ?.thoughtsTokenCount ??
      null,

    totalTokens:
      streamed
        .usageMetadata
        ?.totalTokenCount ??
      null,
  }

  console.log(
    `Stream chunks       : ${streamed.receivedChunks}`,
  )

  console.log(
    `Finish reason       : ${finishReason}`,
  )

  console.log(
    `Prompt tokens       : ${usage.promptTokens ?? 'n/a'}`,
  )

  console.log(
    `Output tokens       : ${usage.outputTokens ?? 'n/a'}`,
  )

  console.log(
    `Thought tokens      : ${usage.thoughtTokens ?? 'n/a'}`,
  )

  console.log(
    `Total tokens        : ${usage.totalTokens ?? 'n/a'}\n`,
  )

  if (
    finishReason ===
      'MAX_TOKENS'
  ) {
    throw new Error(
      'GENERATION_OUTPUT_TRUNCATED',
    )
  }

  if (
    finishReason ===
      'RECITATION'
  ) {
    throw new Error(
      'GENERATION_RECITATION_BLOCK',
    )
  }

  if (
    finishReason !==
      'STOP'
  ) {
    throw new Error(
      `GENERATION_NOT_COMPLETED: ${finishReason}`,
    )
  }

  const responseText =
    streamed
      .responseText
      .trim()

  if (
    !responseText
  ) {
    throw new Error(
      'Generation returned empty output.',
    )
  }

  return {
    lesson:
      parseJson(
        responseText,
      ),

    attempt:
      result.attempt,

    elapsedMs:
      result.elapsedMs,

    finishReason,

    finishMessage,

    usage,

    modelVersion:
      streamed.modelVersion,

    responseId:
      streamed.responseId,
  }
}

/* ============================================================
   MAIN
   ============================================================ */

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Full-Chapter Generator v5',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Lesson             : ${LESSON.title}`,
  )

  console.log(
    `Lesson key         : ${LESSON.lessonKey}`,
  )

  console.log(
    `Class              : ${LESSON.classLevel}`,
  )

  console.log(
    `Duration metadata  : ${DURATION} min`,
  )

  console.log(
    `Generation model   : ${GENERATION_MODEL}`,
  )

  console.log(
    'Thinking           : MEDIUM',
  )

  console.log(
    `Schema             : v${SCHEMA_VERSION}`,
  )

  console.log(
    `Policy             : ${POLICY_VERSION}`,
  )

  console.log(
    `Max output tokens  : ${MAX_OUTPUT_TOKENS.toLocaleString(
      'en-IN',
    )}`,
  )

  console.log(
    'Full chapter       : REQUIRED',
  )

  console.log(
    'Concept ledger     : REQUIRED',
  )

  console.log(
    'Source catalog     : REQUIRED',
  )

  console.log(
    'Visual grounding   : YES',
  )

  console.log(
    'Fallback           : NONE',
  )

  console.log(
    'Gemini 3.7 calls   : 0',
  )

  console.log(
    'Groq calls         : 0',
  )

  console.log(
    'Supabase writes    : 0\n',
  )

  await assertPreflight()

  console.log(
    '✓ generation preflight: PASS',
  )

  const context =
    await loadContext()

  const loadedCatalog =
    await loadSourceCatalogArtifact(
      LESSON.lessonKey,
    )

  const catalog =
    loadedCatalog.catalog

  assertCatalogMatchesContext(
    catalog,
    context,
  )

  const visual =
    await loadVisual()

  if (
    visual.record.pageCount !==
      context.pageCount
  ) {
    throw new Error(
      'Canonical/visual page count mismatch.',
    )
  }

  for (
    let index = 0;
    index <
      context.pages.length;
    index += 1
  ) {
    const mapping =
      visual.record
        .pageMappings[index]

    const page =
      context.pages[index]

    if (
      mapping.chapterPage !==
        index + 1 ||
      mapping.textbookPageLabel !==
        page.pageNumber
    ) {
      throw new Error(
        `Visual/canonical page mapping mismatch at index ${index}.`,
      )
    }
  }

  console.log(
    `✓ canonical pages: ${context.pageCount}`,
  )

  console.log(
    `✓ canonical range: ${context.firstPage}-${context.lastPage}`,
  )

  console.log(
    `✓ approx source tokens: ${context.approxTokenCount.toLocaleString(
      'en-IN',
    )}`,
  )

  console.log(
    `✓ visual PDF: ${(
      visual.bytes.length /
      1024 /
      1024
    ).toFixed(
      2,
    )} MB`,
  )

  console.log(
    '✓ visual -> canonical mapping: VERIFIED',
  )

  console.log(
    '✓ deterministic source catalog: VERIFIED',
  )

  console.log(
    `✓ catalog artifact SHA-256: ${loadedCatalog.artifactSha256}`,
  )

  console.log(
    `✓ catalog activities: ${catalog.statistics.activities}`,
  )

  console.log(
    `✓ catalog examples: ${catalog.statistics.examples}`,
  )

  console.log(
    `✓ catalog figures: ${catalog.statistics.figureLabels}`,
  )

  console.log(
    `✓ catalog tables: ${catalog.statistics.tableLabels}\n`,
  )

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive:
        true,
    },
  )

  try {
    await readFile(
      outputPath(),
    )

    throw new Error(
      [
        'A v5 artifact already exists for this lesson.',
        'Generation refused to preserve reproducibility.',
        '',
        path.relative(
          ROOT,
          outputPath(),
        ),
      ].join('\n'),
    )
  } catch (
    error
  ) {
    if (
      (
        error as NodeJS.ErrnoException
      ).code !==
        'ENOENT'
    ) {
      throw error
    }
  }

  console.log(
    'Generating one complete v5 lesson...\n',
  )

  const generation =
    await generateLesson(
      context,
      visual.record,
      catalog,
      visual.bytes,
    )

  const issues =
    validateLesson(
      generation.lesson,
      context,
      catalog,
    )

  const errors =
    issues.filter(
      (issue) =>
        issue.severity ===
          'ERROR',
    )

  const warnings =
    issues.filter(
      (issue) =>
        issue.severity ===
          'WARNING',
    )

  const status =
    errors.length ===
      0
      ? 'PROVENANCE_VALIDATED'
      : 'PROVENANCE_FAILED'

  const artifact = {
    artifactVersion:
      5,

    generationPolicyVersion:
      POLICY_VERSION,

    status,

    fullyAudited:
      false,

    judgeReady:
      false,

    lesson:
      generation.lesson,

    generation: {
      provider:
        'google',

      model:
        GENERATION_MODEL,

      thinkingLevel:
        'MEDIUM',

      attempt:
        generation.attempt,

      elapsedMs:
        generation.elapsedMs,

      finishReason:
        generation.finishReason,

      finishMessage:
        generation.finishMessage,

      modelVersion:
        generation.modelVersion,

      responseId:
        generation.responseId,

      maxOutputTokens:
        MAX_OUTPUT_TOKENS,

      requestTimeoutMs:
        REQUEST_TIMEOUT_MS,

      usage:
        generation.usage,
    },

    source: {
      mode:
        'FULL_CHAPTER',

      lessonKey:
        LESSON.lessonKey,

      sourceFileName:
        context.sourceFileName,

      canonicalPageStart:
        context.firstPage,

      canonicalPageEnd:
        context.lastPage,

      canonicalPageCount:
        context.pageCount,

      visualFileName:
        visual.record
          .outputFileName,

      visualPageCount:
        visual.record
          .pageCount,

      visualMappingVerified:
        true,

      sourceCatalog: {
        policyVersion:
          catalog.catalogPolicyVersion,

        canonicalContentSha256:
          catalog
            .canonicalSource
            .canonicalContentSha256,

        sourceCatalogArtifactSha256:
          loadedCatalog
            .artifactSha256,

        activities:
          catalog
            .statistics
            .activities,

        examples:
          catalog
            .statistics
            .examples,

        figures:
          catalog
            .statistics
            .figureLabels,

        tables:
          catalog
            .statistics
            .tableLabels,

        verifiedBeforeGeneration:
          true,
      },
    },

    validation: {
      deterministicProvenance:
        errors.length ===
          0
          ? 'PASS'
          : 'FAIL',

      independentQualityAudit:
        'PENDING',

      errors,

      warnings,
    },

    generatedAt:
      new Date()
        .toISOString(),
  }

  await writeFile(
    outputPath(),

    `${JSON.stringify(
      artifact,
      null,
      2,
    )}\n`,

    'utf8',
  )

  console.log(
    '==========================================',
  )

  console.log(
    errors.length ===
      0
      ? ' Generator v5 Provenance PASSED'
      : ' Generator v5 Provenance FAILED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Status               : ${status}`,
  )

  console.log(
    `Deterministic errors : ${errors.length}`,
  )

  console.log(
    `Warnings             : ${warnings.length}`,
  )

  console.log(
    `Generation attempt   : ${generation.attempt}/${MAX_ATTEMPTS}`,
  )

  console.log(
    `Latency              : ${generation.elapsedMs} ms`,
  )

  console.log(
    `Finish reason        : ${generation.finishReason}`,
  )

  console.log(
    `Prompt tokens        : ${generation.usage.promptTokens ?? 'n/a'}`,
  )

  console.log(
    `Output tokens        : ${generation.usage.outputTokens ?? 'n/a'}`,
  )

  console.log(
    `Thought tokens       : ${generation.usage.thoughtTokens ?? 'n/a'}`,
  )

  console.log(
    `Total tokens         : ${generation.usage.totalTokens ?? 'n/a'}`,
  )

  console.log(
    'Fully audited        : NO',
  )

  console.log(
    'Judge ready          : NO',
  )

  console.log(
    'Gemini 3.7 calls     : 0',
  )

  console.log(
    'Groq calls           : 0',
  )

  console.log(
    'Supabase writes      : 0',
  )

  console.log(
    '\nOutput:',
  )

  console.log(
    `${path.relative(
      ROOT,
      outputPath(),
    )}\n`,
  )

  if (
    errors.length >
      0
  ) {
    console.log(
      'Deterministic errors:',
    )

    for (
      const issue
      of errors
    ) {
      console.log(
        `- ${issue.field}`,
      )

      console.log(
        `  ${issue.issueType}`,
      )

      console.log(
        `  ${issue.message}`,
      )
    }

    console.log()

    process.exitCode =
      2

    return
  }

  if (
    warnings.length >
      0
  ) {
    console.log(
      'Pending final-audit warnings:',
    )

    for (
      const issue
      of warnings
    ) {
      console.log(
        `- ${issue.field}`,
      )

      console.log(
        `  ${issue.issueType}`,
      )

      console.log(
        `  ${issue.message}`,
      )
    }

    console.log()
  }

  console.log(
    'NEXT GATE:',
  )

  console.log(
    [
      'Generator v5 provenance passed.',
      'Do not run the old v2 auditor yet.',
      'Send this v5 artifact/output for review before the auditor is upgraded.',
    ].join(' '),
  )

  console.log()
}

/* ============================================================
   FAILURE
   ============================================================ */

main().catch(
  (
    error: unknown,
  ) => {
    console.error(
      '\n==========================================',
    )

    console.error(
      ' Generator v5 FAILED',
    )

    console.error(
      '==========================================\n',
    )

    console.error(
      collectErrorText(
        error,
      ) ||
      String(
        error,
      ),
    )

    console.error(
      '\nNo weaker generation model was used.',
    )

    console.error(
      'Gemini 3.7 was not used.',
    )

    console.error(
      'Groq was not used.',
    )

    console.error(
      'No Supabase data was changed.\n',
    )

    process.exitCode =
      1
  },
)