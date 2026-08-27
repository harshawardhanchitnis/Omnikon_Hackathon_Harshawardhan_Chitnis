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

import {
  assertCatalogMatchesContext,
  findCatalogObjectByExactLabel,
  findVisualCatalogObject,
  loadSourceCatalogArtifact,
  sourceCatalogPromptBlock,
  sourcePagesOverlap,
  type SourceCatalog,
} from './lib/source-catalog'

import {
  unsupportedEmbeddedSourceLabelClaims,
} from './lib/source-label-claims'

/* ============================================================
   CHALKBOX — INDEPENDENT LESSON AUDITOR v5

   PURPOSE

   Independent semantic + multimodal quality audit for:

     Generator v5
       ↓
     deterministic catalog provenance
       ↓
     embedded source-claim audit
       ↓
     optional NON-SEMANTIC deterministic normalization
       ↓
     THIS AUDITOR

   The auditor does NOT trust:

   - generator chapterConceptLedger;
   - generator sourceCoverage;
   - generator source labels merely because they passed structure;
   - generator's own scientific claims;
   - board visuals merely because they cite a valid source page.

   It independently checks the COMPLETE canonical chapter and
   the visual PDF.

   IMPORTANT

   - ONE independent Gemini audit.
   - NO repair.
   - NO Supabase writes.
   - NO Gemini 3.7.
   - NO Groq.
   - Full chapter cannot be reduced to "Part 1".
   - Catalog establishes label existence.
   - Auditor establishes semantic fidelity.

   ============================================================ */

dotenv.config({
  path: path.resolve(
    process.cwd(),
    '.env.ingest.local',
  ),
})

/* ============================================================
   ENV
   ============================================================ */

const GEMINI_API_KEY =
  process.env
    .GEMINI_API_KEY
    ?.trim()

if (
  !GEMINI_API_KEY
) {
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

const AUDIT_MODEL =
  'gemini-3.6-flash'

const THINKING_LEVEL =
  ThinkingLevel.MEDIUM

const AUDIT_SCHEMA_VERSION =
  5

const AUDIT_POLICY_VERSION =
  'chalkbox-generated-audit-v5-catalog-grounded-gemini-36'

const EXPECTED_GENERATION_POLICY =
  'chalkbox-lesson-v5-catalog-grounded-gemini-35'

const EXPECTED_SOURCE_CATALOG_POLICY =
  'chalkbox-source-catalog-v1'

const EXPECTED_SOURCE_CLAIM_POLICY =
  'chalkbox-source-claim-audit-v1'

const MAX_OUTPUT_TOKENS =
  24_576

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

const GENERATED_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'generated-demo-lessons-v5',
  )

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

const SOURCE_CLAIM_AUDIT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'source-claim-audits-v1',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'lesson-audits-v5',
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

  if (
    !argument
  ) {
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
  'class-9-force-laws-motion'

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
) {
  const lesson =
    LESSONS.find(
      (candidate) =>
        candidate.lessonKey ===
        lessonKey,
    )

  if (
    !lesson
  ) {
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

/* ============================================================
   DETERMINISTIC AUDIT TYPES
   ============================================================ */

type Severity =
  | 'ERROR'
  | 'WARNING'

type DeterministicIssue = {
  severity: Severity
  field: string
  issueType: string
  message: string
  sourcePages?: number[]
}

/* ============================================================
   CLIENT
   ============================================================ */

const ai =
  new GoogleGenAI({
    apiKey:
      GEMINI_API_KEY,
  })

/* ============================================================
   GENERIC HELPERS
   ============================================================ */

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

function sameStringArray(
  left: string[],
  right: string[],
) {
  return (
    left.length ===
      right.length &&
    left.every(
      (
        value,
        index,
      ) =>
        value ===
          right[index],
    )
  )
}

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
   ERROR / RETRY HELPERS
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

  /*
   * Do not retry 429 automatically.
   * Preserve daily/rate quota.
   */
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
      `[Auditor] ${AUDIT_MODEL} attempt ${attempt}/${MAX_ATTEMPTS}`,
    )

    try {
      const value =
        await operation()

      return {
        value,
        attempt,
        elapsedMs:
          Date.now() -
          startedAt,
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
        `[Auditor] attempt ${attempt} failed after ${elapsedMs} ms`,
      )

      console.error(
        `[Auditor] status=${extractHttpStatus(
          error,
        ) ?? 'none'} transient=${transient}`,
      )

      console.error(
        `[Auditor] ${collectErrorText(
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
        `[Auditor] temporary failure; retrying once in ${Math.ceil(
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
   LOAD GENERATED ARTIFACT
   ============================================================ */

async function loadGeneratedArtifact() {
  const filePath =
    path.resolve(
      GENERATED_DIRECTORY,
      `${LESSON.lessonKey}-${DURATION}min.json`,
    )

  const text =
    await readFile(
      filePath,
      'utf8',
    )

  const parsed:
    unknown =
    JSON.parse(
      text,
    )

  if (
    !isObject(
      parsed,
    )
  ) {
    throw new Error(
      'Generated v5 artifact is not an object.',
    )
  }

  if (
    parsed.artifactVersion !==
      5
  ) {
    throw new Error(
      `Expected artifactVersion=5, found ${String(
        parsed.artifactVersion,
      )}.`,
    )
  }

  if (
    parsed.generationPolicyVersion !==
      EXPECTED_GENERATION_POLICY
  ) {
    throw new Error(
      [
        'Unexpected generation policy.',
        `Expected=${EXPECTED_GENERATION_POLICY}`,
        `Found=${String(
          parsed.generationPolicyVersion,
        )}`,
      ].join('\n'),
    )
  }

  if (
    parsed.status !==
      'PROVENANCE_VALIDATED'
  ) {
    throw new Error(
      [
        'Generated artifact is not provenance validated.',
        `Found=${String(
          parsed.status,
        )}`,
      ].join('\n'),
    )
  }

  if (
    parsed.fullyAudited !==
      false ||
    parsed.judgeReady !==
      false
  ) {
    throw new Error(
      'Generated artifact has unexpected audit/judge state.',
    )
  }

  if (
    !isObject(
      parsed.lesson,
    )
  ) {
    throw new Error(
      'Generated lesson missing.',
    )
  }

  if (
    parsed.lesson.schemaVersion !==
      5 ||
    parsed.lesson.generationPolicyVersion !==
      EXPECTED_GENERATION_POLICY
  ) {
    throw new Error(
      'Generated lesson schema/policy mismatch.',
    )
  }

  if (
    parsed.lesson.lessonKey !==
      LESSON.lessonKey ||
    parsed.lesson.classLevel !==
      LESSON.classLevel ||
    parsed.lesson.subject !==
      LESSON.subject ||
    parsed.lesson.title !==
      LESSON.title ||
    parsed.lesson.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Generated lesson metadata mismatch.',
    )
  }

  if (
    !isObject(
      parsed.validation,
    )
  ) {
    throw new Error(
      'Generated validation metadata missing.',
    )
  }

  if (
    parsed.validation
      .deterministicProvenance !==
      'PASS'
  ) {
    throw new Error(
      'Generator deterministic provenance did not PASS.',
    )
  }

  if (
    !Array.isArray(
      parsed.validation.errors,
    ) ||
    parsed.validation.errors.length !==
      0
  ) {
    throw new Error(
      'Generated artifact contains deterministic errors.',
    )
  }

  return {
    filePath,
    text,
    artifact:
      parsed,
    lesson:
      parsed.lesson,
  }
}

/* ============================================================
   LOAD SOURCE-CLAIM REPORT
   ============================================================ */

async function loadSourceClaimReport() {
  const filePath =
    path.resolve(
      SOURCE_CLAIM_AUDIT_DIRECTORY,
      `${LESSON.lessonKey}-${DURATION}min-source-claims.json`,
    )

  const text =
    await readFile(
      filePath,
      'utf8',
    )

  const parsed:
    unknown =
    JSON.parse(
      text,
    )

  if (
    !isObject(
      parsed,
    )
  ) {
    throw new Error(
      'Source-claim audit report is invalid.',
    )
  }

  if (
    parsed.auditPolicyVersion !==
      EXPECTED_SOURCE_CLAIM_POLICY
  ) {
    throw new Error(
      'Unexpected source-claim audit policy.',
    )
  }

  if (
    parsed.status !==
      'PASS'
  ) {
    throw new Error(
      'Embedded source-claim audit has not passed.',
    )
  }

  if (
    parsed.lessonKey !==
      LESSON.lessonKey ||
    parsed.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Source-claim audit lesson metadata mismatch.',
    )
  }

  if (
    !isObject(
      parsed.metrics,
    ) ||
    parsed.metrics.unsupportedClaims !==
      0
  ) {
    throw new Error(
      'Source-claim audit still contains unsupported labels.',
    )
  }

  return {
    filePath,
    report:
      parsed,
  }
}

/* ============================================================
   LOAD CANONICAL CONTEXT
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

  if (
    !record
  ) {
    throw new Error(
      'Visual manifest entry missing.',
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
   DETERMINISTIC PRE-AUDIT
   ============================================================ */

function deterministicPreAudit(
  lesson: Record<string, unknown>,
  context: FullChapterContext,
  catalog: SourceCatalog,
) {
  const issues:
    DeterministicIssue[] = []

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

  /* ----------------------------------------------------------
     Page validity
     ---------------------------------------------------------- */

  const validPages =
    new Set(
      context.pages.map(
        (page) =>
          page.pageNumber,
      ),
    )

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
    lesson,
    '',
  )

  /* ----------------------------------------------------------
     Embedded label claims
     ---------------------------------------------------------- */

  const unsupportedClaims =
    unsupportedEmbeddedSourceLabelClaims(
      lesson,
      catalog,
    )

  for (
    const claim
    of unsupportedClaims
  ) {
    error(
      claim.field,
      'UNSUPPORTED_EMBEDDED_SOURCE_LABEL',
      `"${claim.rawLabel}" is not present in deterministic source catalog.`,
    )
  }

  /* ----------------------------------------------------------
     Concept ledger / source coverage
     ---------------------------------------------------------- */

  const ledger =
    Array.isArray(
      lesson.chapterConceptLedger,
    )
      ? lesson.chapterConceptLedger
      : []

  if (
    ledger.length < 5
  ) {
    error(
      'chapterConceptLedger',
      'INSUFFICIENT_CONCEPT_LEDGER',
      'Full chapter must contain at least five major/supporting concepts.',
    )
  }

  const ledgerConcepts:
    string[] = []

  const ledgerPages:
    number[] = []

  for (
    let index = 0;
    index <
      ledger.length;
    index += 1
  ) {
    const item =
      ledger[index]

    if (
      !isObject(
        item,
      )
    ) {
      error(
        `chapterConceptLedger[${index}]`,
        'INVALID_LEDGER_ITEM',
        'Ledger item is not an object.',
      )

      continue
    }

    if (
      typeof item.concept !==
        'string' ||
      item.concept.trim().length ===
        0
    ) {
      error(
        `chapterConceptLedger[${index}].concept`,
        'MISSING_CONCEPT',
        'Concept name missing.',
      )
    } else {
      ledgerConcepts.push(
        item.concept,
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
        'Every ledger concept requires sourcePages.',
      )
    }

    ledgerPages.push(
      ...pages,
    )
  }

  if (
    !isObject(
      lesson.sourceCoverage,
    )
  ) {
    error(
      'sourceCoverage',
      'SOURCE_COVERAGE_MISSING',
      'sourceCoverage object missing.',
    )
  } else {
    const coveredConcepts =
      safeStringArray(
        lesson
          .sourceCoverage
          .keyConceptsCovered,
      )

    if (
      !sameStringArray(
        ledgerConcepts,
        coveredConcepts,
      )
    ) {
      error(
        'sourceCoverage.keyConceptsCovered',
        'CONCEPT_COVERAGE_LIST_MISMATCH',
        'sourceCoverage.keyConceptsCovered must exactly mirror chapterConceptLedger concepts and order.',
      )
    }

    const pagesUsed =
      safeNumberArray(
        lesson
          .sourceCoverage
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
        `Missing ledger pages: ${missingLedgerPages.join(
          ', ',
        )}.`,
        missingLedgerPages,
      )
    }
  }

  /* ----------------------------------------------------------
     Objective consistency structure
     ---------------------------------------------------------- */

  const objectives =
    safeStringArray(
      lesson.learningObjectives,
    )

  if (
    objectives.length < 4
  ) {
    error(
      'learningObjectives',
      'INSUFFICIENT_OBJECTIVES',
      'At least four objectives required.',
    )
  }

  const objectiveCoverage =
    Array.isArray(
      lesson.objectiveCoverage,
    )
      ? lesson.objectiveCoverage
      : []

  if (
    objectiveCoverage.length !==
      objectives.length
  ) {
    error(
      'objectiveCoverage',
      'OBJECTIVE_COVERAGE_COUNT_MISMATCH',
      [
        `Objectives=${objectives.length}.`,
        `Coverage=${objectiveCoverage.length}.`,
      ].join(' '),
    )
  }

  /* ----------------------------------------------------------
     Provenance catalog checks
     ---------------------------------------------------------- */

  const sourceNodes =
    collectSourceNodes(
      lesson,
    )

  const visualPages:
    number[] = []

  for (
    const node
    of sourceNodes
  ) {
    if (
      node.sourceType ===
        'TEXTBOOK_ACTIVITY'
    ) {
      if (
        !node.sourceLabel
      ) {
        error(
          `${node.field}.sourceLabel`,
          'TEXTBOOK_ACTIVITY_LABEL_MISSING',
          'TEXTBOOK_ACTIVITY requires sourceLabel.',
        )
      } else {
        const object =
          findCatalogObjectByExactLabel(
            catalog,
            'ACTIVITY',
            node.sourceLabel,
          )

        if (
          !object
        ) {
          error(
            `${node.field}.sourceLabel`,
            'ACTIVITY_NOT_IN_CATALOG',
            `"${node.sourceLabel}" is not a catalogued textbook activity.`,
          )
        } else if (
          !sourcePagesOverlap(
            node.sourcePages,
            object.sourcePages,
          )
        ) {
          error(
            `${node.field}.sourcePages`,
            'ACTIVITY_PAGE_MISMATCH',
            `Catalog pages=[${object.sourcePages.join(
              ', ',
            )}], lesson pages=[${node.sourcePages.join(
              ', ',
            )}].`,
            object.sourcePages,
          )
        }
      }
    }

    if (
      node.sourceType ===
        'TEXTBOOK_EXAMPLE'
    ) {
      if (
        !node.sourceLabel
      ) {
        error(
          `${node.field}.sourceLabel`,
          'TEXTBOOK_EXAMPLE_LABEL_MISSING',
          'TEXTBOOK_EXAMPLE requires sourceLabel.',
        )
      } else {
        const object =
          findCatalogObjectByExactLabel(
            catalog,
            'EXAMPLE',
            node.sourceLabel,
          )

        if (
          !object
        ) {
          error(
            `${node.field}.sourceLabel`,
            'EXAMPLE_NOT_IN_CATALOG',
            `"${node.sourceLabel}" is not a catalogued textbook example.`,
          )
        } else if (
          !sourcePagesOverlap(
            node.sourcePages,
            object.sourcePages,
          )
        ) {
          error(
            `${node.field}.sourcePages`,
            'EXAMPLE_PAGE_MISMATCH',
            `Catalog pages=[${object.sourcePages.join(
              ', ',
            )}], lesson pages=[${node.sourcePages.join(
              ', ',
            )}].`,
            object.sourcePages,
          )
        }
      }
    }

    if (
      node.sourceType ===
        'TEXTBOOK_VISUAL'
    ) {
      const object =
        findVisualCatalogObject(
          catalog,
          node.sourceLabel,
        )

      if (
        !object
      ) {
        error(
          `${node.field}.sourceLabel`,
          'TEXTBOOK_VISUAL_NOT_IN_CATALOG',
          'TEXTBOOK_VISUAL label must exist in figure/table catalog.',
        )
      } else if (
        !sourcePagesOverlap(
          node.sourcePages,
          object.sourcePages,
        )
      ) {
        error(
          `${node.field}.sourcePages`,
          'TEXTBOOK_VISUAL_PAGE_MISMATCH',
          `Catalog pages=[${object.sourcePages.join(
            ', ',
          )}], lesson pages=[${node.sourcePages.join(
            ', ',
          )}].`,
          object.sourcePages,
        )
      }

      if (
        node.boardDrawingSteps.length >
          0
      ) {
        error(
          `${node.field}.boardDrawingSteps`,
          'TEXTBOOK_VISUAL_HAS_BOARD_REDRAW',
          'TEXTBOOK_VISUAL must not contain boardDrawingSteps.',
        )
      }

      visualPages.push(
        ...node.sourcePages,
      )
    }

    if (
      node.sourceType ===
        'BOARD_VISUAL'
    ) {
      if (
        node.sourceLabel !==
          null
      ) {
        error(
          `${node.field}.sourceLabel`,
          'BOARD_VISUAL_SOURCE_LABEL_NOT_NULL',
          'BOARD_VISUAL requires sourceLabel=null.',
        )
      }

      if (
        node.boardDrawingSteps.length ===
          0
      ) {
        error(
          `${node.field}.boardDrawingSteps`,
          'BOARD_VISUAL_STEPS_MISSING',
          'BOARD_VISUAL requires actionable boardDrawingSteps.',
        )
      }

      visualPages.push(
        ...node.sourcePages,
      )
    }

    if (
      node.sourceType ===
        'CHALKBOX_ACTIVITY' ||
      node.sourceType ===
        'CHALKBOX_EXAMPLE' ||
      node.sourceType ===
        'NO_VISUAL_REQUIRED'
    ) {
      if (
        node.sourceLabel !==
          null
      ) {
        error(
          `${node.field}.sourceLabel`,
          'GENERATED_CONTENT_SOURCE_LABEL_NOT_NULL',
          `${node.sourceType} requires sourceLabel=null.`,
        )
      }
    }

    if (
      node.sourceType ===
        'NO_VISUAL_REQUIRED' &&
      node.boardDrawingSteps.length >
        0
    ) {
      error(
        `${node.field}.boardDrawingSteps`,
        'NO_VISUAL_HAS_DRAWING_STEPS',
        'NO_VISUAL_REQUIRED must have no boardDrawingSteps.',
      )
    }
  }

  /* ----------------------------------------------------------
     Visual pages exact union
     ---------------------------------------------------------- */

  if (
    isObject(
      lesson.sourceCoverage,
    )
  ) {
    const declaredVisualPages =
      safeNumberArray(
        lesson
          .sourceCoverage
          .visualPagesUsed,
      )

    if (
      !sameNumberSet(
        declaredVisualPages,
        visualPages,
      )
    ) {
      error(
        'sourceCoverage.visualPagesUsed',
        'VISUAL_PAGE_SET_MISMATCH',
        [
          `Declared=[${uniqueNumbers(
            declaredVisualPages,
          ).join(', ')}].`,
          `Actual=[${uniqueNumbers(
            visualPages,
          ).join(', ')}].`,
        ].join(' '),
      )
    }
  }

  /* ----------------------------------------------------------
     Non-semantic normalization records
     ---------------------------------------------------------- */

  /*
   * Normalizations are stored on outer artifact and checked
   * separately in main().
   */

  if (
    issues.filter(
      (issue) =>
        issue.severity ===
          'ERROR',
    ).length ===
      0
  ) {
    /*
     * Semantic validity remains pending model audit.
     */
    warning(
      'lesson',
      'SEMANTIC_MULTIMODAL_AUDIT_PENDING',
      'Deterministic provenance passed; independent semantic and multimodal audit is still required.',
    )
  }

  return issues
}

/* ============================================================
   NORMALIZATION SAFETY
   ============================================================ */

function validateNormalizations(
  artifact:
    Record<string, unknown>,
) {
  const normalizations =
    artifact
      .postGenerationNormalizations

  if (
    normalizations ===
      undefined
  ) {
    return {
      count:
        0,

      policies:
        [] as string[],
    }
  }

  if (
    !Array.isArray(
      normalizations,
    )
  ) {
    throw new Error(
      'postGenerationNormalizations must be an array.',
    )
  }

  const policies:
    string[] = []

  for (
    let index = 0;
    index <
      normalizations.length;
    index += 1
  ) {
    const record =
      normalizations[index]

    if (
      !isObject(
        record,
      )
    ) {
      throw new Error(
        `Invalid postGenerationNormalization at index ${index}.`,
      )
    }

    if (
      record.semanticRepair !==
        false
    ) {
      throw new Error(
        [
          'Auditor refused.',
          `Normalization ${index} is marked semanticRepair=${String(
            record.semanticRepair,
          )}.`,
        ].join('\n'),
      )
    }

    if (
      record.llmCalls !==
        0
    ) {
      throw new Error(
        [
          'Auditor refused.',
          `Normalization ${index} reports llmCalls=${String(
            record.llmCalls,
          )}.`,
        ].join('\n'),
      )
    }

    if (
      typeof record.policyVersion ===
        'string'
    ) {
      policies.push(
        record.policyVersion,
      )
    }
  }

  return {
    count:
      normalizations.length,

    policies,
  }
}

/* ============================================================
   PAGE MAP TEXT
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
   AUDIT PROMPT
   ============================================================ */

function buildAuditPrompt(
  context:
    FullChapterContext,

  visual:
    VisualRecord,

  catalog:
    SourceCatalog,

  lesson:
    Record<string, unknown>,
) {
  return `
You are the INDEPENDENT final quality auditor for ChalkBox.

You are NOT the lesson generator.

You must audit one generated lesson against:

1. the COMPLETE canonical NCERT chapter text;
2. the deterministic source-object catalog;
3. the supplied visual PDF;
4. the actual lesson JSON.

Class: ${LESSON.classLevel}
Subject: ${LESSON.subject}
Chapter: ${LESSON.title}
Mode: FULL_CHAPTER
Requested duration metadata: ${DURATION} minutes

============================================================
AUDIT INDEPENDENCE — CRITICAL
============================================================

DO NOT trust the generator's:

- chapterConceptLedger;
- keyConceptsCovered;
- objectiveCoverage;
- sourcePages;
- source labels;
- sourceType;
- scientific claims;
- example calculations;
- activity procedure;
- board visual;
- sourceCoverage declaration.

Derive the chapter's major concepts independently from the
COMPLETE canonical source.

Then compare your independent concept set with both:

A. chapterConceptLedger
B. actual teacher-facing lesson content

A concept listed only in metadata is NOT covered.

============================================================
FULL-CHAPTER CONTRACT
============================================================

This lesson is FULL_CHAPTER.

The requested ${DURATION}-minute value is metadata for the later
deterministic priority/timing solver.

DO NOT accept:

- "Part 1" narrowing;
- omission of later chapter topics;
- omission of major concepts merely because the requested duration
  is short;
- objectives that mention topics absent from teaching content.

A concise full-chapter lesson is acceptable.

A truncated chapter is not.

============================================================
SOURCE HIERARCHY
============================================================

CANONICAL TEXT is authoritative for:

- scientific facts;
- definitions;
- conditions;
- formulas;
- units;
- calculations;
- terminology;
- activity procedure and observations;
- example values and calculations;
- sourcePages.

VISUAL PDF is authoritative for:

- diagrams;
- arrows;
- direction;
- visual labels;
- topology;
- relative connections;
- meaningful spatial relationships.

If textual prose conflicts with visual appearance:

Use canonical text for factual prose and the PDF for visual layout.

============================================================
CATALOG RULE
============================================================

The deterministic catalog establishes whether a numbered textbook
Activity / Example / Figure / Table label actually exists.

Passing the catalog does NOT prove semantic fidelity.

You must independently verify:

TEXTBOOK_ACTIVITY:
- correct activity;
- correct purpose;
- faithful materials;
- faithful procedure;
- faithful observation/conclusion;
- pedagogically relevant to claimed concept.

TEXTBOOK_EXAMPLE:
- correct example identity;
- correct values;
- correct units;
- correct calculation;
- correct result;
- no rewritten numerical facts.

TEXTBOOK_VISUAL:
- correct visual identity;
- correct source page;
- faithful meaningful structure.

BOARD_VISUAL:
- may rotate, reflect, rearrange, simplify or reposition;
- must preserve scientific relationships;
- must preserve topology/connectivity;
- must preserve directionality where scientifically meaningful;
- must preserve correct labels;
- need NOT match cosmetic textbook placement;
- sourceLabel must remain null.

A BOARD_VISUAL can mention in sourceLimitations that it is grounded
in a real Figure/Table, but it is still an adapted board visual.

${sourceCatalogPromptBlock(
  catalog,
)}

============================================================
SCIENTIFIC ACCURACY
============================================================

Check every important scientific claim.

Pay special attention to:

- conditional statements;
- proportional relationships;
- vector direction;
- signs;
- formulas;
- units;
- derivations;
- numerical substitutions;
- action/reaction body assignment;
- conservation-law conditions;
- causal wording;
- definitions that the generator may have broadened.

Do not penalize harmless teaching simplification.

Do penalize scientifically wrong or materially misleading claims.

============================================================
EXAMPLE / NUMERICAL AUDIT
============================================================

For every example and meaningful calculation:

- verify source values when textbook provenance is claimed;
- independently calculate arithmetic;
- verify units;
- verify formula;
- verify result;
- verify physical interpretation.

============================================================
ACTIVITY AUDIT
============================================================

For every activity:

TEXTBOOK_ACTIVITY:
- exact activity semantics;
- materials;
- setup;
- sequence;
- observations;
- conclusion;
- safety;
- relevance.

CHALKBOX_ACTIVITY:
- sourceLabel=null;
- grounded scientific principle;
- safe;
- classroom feasible;
- must NOT masquerade as a numbered textbook activity.

============================================================
VISUAL AUDIT
============================================================

Use the PDF.

For TEXTBOOK_VISUAL:
exact/source visual fidelity matters.

For BOARD_VISUAL:
scientific topology and relationships matter more than orientation.

Examples:

- collision diagram:
  verify which force acts ON which object;
  verify equal/opposite directions;
  verify velocity arrows;
  verify before/during/after meaning;
  verify conservation equation.

- electrical diagram:
  verify connectivity/polarity/current direction where relevant.

- biological diagram:
  verify anatomy/flow relationships rather than artistic fidelity.

Rotation, reflection or re-layout ALONE is NOT an error for
BOARD_VISUAL.

============================================================
OBJECTIVE CONSISTENCY
============================================================

For every learning objective:

- is it supported by source?
- is it actually taught or assessed?
- do the declared evidence fields genuinely contain that evidence?

============================================================
CITATION AUDIT
============================================================

Audit important citation groups.

A page number being valid is not enough.

Check whether cited page(s) actually support the claim.

============================================================
PEDAGOGY
============================================================

The lesson must be teacher-ready.

Evaluate:

- Define
- Explain
- Visualize
- Example
- Activity
- How to Teach
- Practice
- Check Understanding
- misconceptions
- board plan
- low-resource practicality
- quick ideas

It should be more useful than a chapter summary.

============================================================
TIMING READINESS
============================================================

DO NOT assign minutes.

Evaluate whether:

- priorities are usable by a deterministic timing solver;
- ESSENTIAL content contains the real chapter core;
- OPTIONAL material can be compressed first;
- no explicit nested timing arithmetic exists;
- the lesson can later be compressed without destroying chapter
  coverage.

============================================================
DECISION
============================================================

Return exactly one:

PASS
REPAIR_REQUIRED
REJECT

PASS:
- all major concepts covered;
- no ERROR issues;
- scientific content sound;
- activities faithful;
- visuals sound;
- citations sound;
- objectives consistent.

REPAIR_REQUIRED:
- lesson architecture is fundamentally usable;
- one bounded targeted semantic repair could resolve all important
  defects.

REJECT:
- major reconstruction is required;
- multiple central concepts are absent or seriously wrong;
- provenance/grounding is fundamentally unreliable.

Do NOT recommend shrinking the lesson into "Part 1".

============================================================
SCORE CONTRACT
============================================================

Every score is integer 0–10.

Return:

scientificAccuracy
sourceGrounding
citationAccuracy
conceptLedger
objectiveConsistency
coverage
activityProvenance
exampleFidelity
visualGrounding
pedagogy
internalConsistency
timingReadiness
overall

A 10 means no substantive defect was found.

============================================================
REQUIRED AUDIT JSON
============================================================

Return JSON only:

{
  "decision": "PASS | REPAIR_REQUIRED | REJECT",

  "summary": "...",

  "scores": {
    "scientificAccuracy": 0,
    "sourceGrounding": 0,
    "citationAccuracy": 0,
    "conceptLedger": 0,
    "objectiveConsistency": 0,
    "coverage": 0,
    "activityProvenance": 0,
    "exampleFidelity": 0,
    "visualGrounding": 0,
    "pedagogy": 0,
    "internalConsistency": 0,
    "timingReadiness": 0,
    "overall": 0
  },

  "independentConceptAudit": {
    "status": "PASS | FAIL",
    "majorConcepts": [
      {
        "concept": "...",
        "sourcePages": [],
        "ledgerStatus": "PRESENT | MISSING",
        "lessonStatus": "COVERED | PARTIAL | MISSING",
        "lessonEvidenceFields": [],
        "explanation": "..."
      }
    ]
  },

  "objectiveAudit": [
    {
      "objectiveIndex": 0,
      "status": "PASS | ERROR",
      "evidenceFields": [],
      "explanation": "..."
    }
  ],

  "citationAudit": [
    {
      "field": "...",
      "sourcePages": [],
      "status": "PASS | ERROR",
      "explanation": "..."
    }
  ],

  "activityAudit": [
    {
      "field": "...",
      "sourceType": "TEXTBOOK_ACTIVITY | CHALKBOX_ACTIVITY",
      "sourceLabel": null,
      "sourcePages": [],
      "status": "PASS | ERROR",
      "explanation": "..."
    }
  ],

  "exampleAudit": [
    {
      "field": "...",
      "sourceType": "TEXTBOOK_EXAMPLE | CHALKBOX_EXAMPLE",
      "sourceLabel": null,
      "sourcePages": [],
      "status": "PASS | ERROR",
      "calculationVerified": true,
      "explanation": "..."
    }
  ],

  "visualAudit": [
    {
      "field": "...",
      "sourceType": "TEXTBOOK_VISUAL | BOARD_VISUAL | NO_VISUAL_REQUIRED",
      "sourceLabel": null,
      "sourcePages": [],
      "status": "PASS | ERROR",
      "topologyCorrect": true,
      "directionalityCorrect": true,
      "explanation": "..."
    }
  ],

  "pedagogy": {
    "status": "PASS | ERROR",
    "explanation": "..."
  },

  "timingReadiness": {
    "status": "PASS | ERROR",
    "explanation": "..."
  },

  "issues": [
    {
      "severity": "ERROR | WARNING | INFO",
      "category": "SCIENCE | COVERAGE | OBJECTIVE | CITATION | ACTIVITY | EXAMPLE | VISUAL | PEDAGOGY | CONSISTENCY | TIMING | PROVENANCE",
      "field": "...",
      "issueType": "...",
      "explanation": "...",
      "sourcePages": [],
      "repairInstruction": "..."
    }
  ],

  "repairTargets": [
    {
      "field": "...",
      "instruction": "...",
      "sourcePages": []
    }
  ]
}

============================================================
VISUAL -> CANONICAL PAGE MAP
============================================================

${pageMappingText(
  visual.pageMappings,
)}

All lesson sourcePages use CANONICAL SOURCE PAGE numbers.

============================================================
COMPLETE CANONICAL CHAPTER
============================================================

${context.contextText}

============================================================
GENERATED LESSON TO AUDIT
============================================================

${JSON.stringify(
  lesson,
  null,
  2,
)}

============================================================
FINAL AUDITOR SELF-CHECK
============================================================

Before returning:

1. Independently derive major concepts from the complete chapter.
2. Verify ALL major concepts appear meaningfully in lesson content.
3. Verify later chapter concepts are not omitted.
4. Recalculate textbook numerical examples.
5. Verify every textbook activity semantically, not just by label.
6. Verify BOARD_VISUAL topology/relationships from PDF.
7. Do not fail a BOARD_VISUAL merely because it is rotated,
   reflected or rearranged.
8. Verify objective/evidence consistency.
9. Verify citations semantically.
10. PASS only if there are zero ERROR issues and every independent
    major concept is PRESENT + COVERED.
11. Do not recommend "Part 1".
12. Return JSON only.
`.trim()
}

/* ============================================================
   MODEL AUDIT VALIDATION
   ============================================================ */

const SCORE_FIELDS = [
  'scientificAccuracy',
  'sourceGrounding',
  'citationAccuracy',
  'conceptLedger',
  'objectiveConsistency',
  'coverage',
  'activityProvenance',
  'exampleFidelity',
  'visualGrounding',
  'pedagogy',
  'internalConsistency',
  'timingReadiness',
  'overall',
] as const

function validateModelAudit(
  raw: unknown,
) {
  if (
    !isObject(
      raw,
    )
  ) {
    throw new Error(
      'Audit response is not an object.',
    )
  }

  if (
    raw.decision !==
      'PASS' &&
    raw.decision !==
      'REPAIR_REQUIRED' &&
    raw.decision !==
      'REJECT'
  ) {
    throw new Error(
      `Invalid audit decision: ${String(
        raw.decision,
      )}`,
    )
  }

  if (
    !isObject(
      raw.scores,
    )
  ) {
    throw new Error(
      'Audit scores missing.',
    )
  }

  for (
    const field
    of SCORE_FIELDS
  ) {
    const value =
      raw.scores[field]

    if (
      typeof value !==
        'number' ||
      !Number.isInteger(
        value,
      ) ||
      value < 0 ||
      value > 10
    ) {
      throw new Error(
        `Invalid audit score ${field}: ${String(
          value,
        )}`,
      )
    }
  }

  if (
    !isObject(
      raw.independentConceptAudit,
    ) ||
    !Array.isArray(
      raw
        .independentConceptAudit
        .majorConcepts,
    ) ||
    raw
      .independentConceptAudit
      .majorConcepts
      .length ===
        0
  ) {
    throw new Error(
      'Independent concept audit missing.',
    )
  }

  if (
    !Array.isArray(
      raw.objectiveAudit,
    ) ||
    !Array.isArray(
      raw.citationAudit,
    ) ||
    !Array.isArray(
      raw.activityAudit,
    ) ||
    !Array.isArray(
      raw.exampleAudit,
    ) ||
    !Array.isArray(
      raw.visualAudit,
    ) ||
    !Array.isArray(
      raw.issues,
    ) ||
    !Array.isArray(
      raw.repairTargets,
    )
  ) {
    throw new Error(
      'One or more required audit arrays are missing.',
    )
  }

  if (
    !isObject(
      raw.pedagogy,
    ) ||
    !isObject(
      raw.timingReadiness,
    )
  ) {
    throw new Error(
      'Pedagogy/timing audit missing.',
    )
  }

  /*
   * Internal consistency:
   * model is not allowed to say PASS while reporting ERROR issues.
   */
  if (
    raw.decision ===
      'PASS'
  ) {
    const errors =
      raw.issues.filter(
        (issue) =>
          isObject(
            issue,
          ) &&
          issue.severity ===
            'ERROR',
      )

    if (
      errors.length >
        0
    ) {
      throw new Error(
        'Audit returned PASS while also reporting ERROR issues.',
      )
    }

    const badConcepts =
      raw
        .independentConceptAudit
        .majorConcepts
        .filter(
          (concept) =>
            !isObject(
              concept,
            ) ||
            concept.ledgerStatus !==
              'PRESENT' ||
            concept.lessonStatus !==
              'COVERED',
        )

    if (
      badConcepts.length >
        0
    ) {
      throw new Error(
        'Audit returned PASS while independent major concepts are incomplete.',
      )
    }
  }

  return raw
}

/* ============================================================
   RUN AUDIT
   ============================================================ */

async function runAudit(
  context:
    FullChapterContext,

  visual:
    VisualRecord,

  catalog:
    SourceCatalog,

  lesson:
    Record<
      string,
      unknown
    >,

  pdfBytes:
    Buffer,
) {
  const prompt =
    buildAuditPrompt(
      context,
      visual,
      catalog,
      lesson,
    )

  /*
   * Entire stream lifecycle is wrapped by withRetry.
   *
   * A stream failure midway through output therefore remains
   * retryable under our existing bounded transient policy.
   */
  const result =
    await withRetry(
      async () => {
        const stream =
          await ai.models.generateContentStream({
            model:
              AUDIT_MODEL,

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
                '[Auditor] stream opened; receiving audit...',
              )

              streamOpened =
                true
            }

            responseText +=
              chunkText

            receivedChunks +=
              1

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
            'Audit stream returned no output.',
          )
        }

        if (
          !lastCandidate
        ) {
          throw new Error(
            'Audit stream returned no candidate.',
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
      'AUDIT_OUTPUT_TRUNCATED',
    )
  }

  if (
    finishReason !==
      'STOP'
  ) {
    throw new Error(
      `AUDIT_NOT_COMPLETED: ${finishReason}`,
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
      'Audit returned empty output.',
    )
  }

  return {
    modelAudit:
      validateModelAudit(
        parseJson(
          responseText,
        ),
      ),

    attempt:
      result.attempt,

    elapsedMs:
      result.elapsedMs,

    finishReason,

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
    ' ChalkBox Independent Lesson Audit v5',
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
    `Duration metadata  : ${DURATION} min`,
  )

  console.log(
    `Audit model        : ${AUDIT_MODEL}`,
  )

  console.log(
    'Thinking           : MEDIUM',
  )

  console.log(
    `Audit schema       : v${AUDIT_SCHEMA_VERSION}`,
  )

  console.log(
    `Audit policy       : ${AUDIT_POLICY_VERSION}`,
  )

  console.log(
    'Generator policy   : v5 catalog-grounded',
  )

  console.log(
    'Source catalog     : REQUIRED',
  )

  console.log(
    'Catalog SHA bind   : REQUIRED',
  )

  console.log(
    'Source-claim gate  : REQUIRED',
  )

  console.log(
    'Full chapter       : REQUIRED',
  )

  console.log(
    'Visual PDF         : YES',
  )

  console.log(
    'Repairs            : NO',
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

  /* ----------------------------------------------------------
     Generated artifact
     ---------------------------------------------------------- */

  const generated =
    await loadGeneratedArtifact()

  console.log(
    '✓ generator v5 artifact: PROVENANCE_VALIDATED',
  )

  /* ----------------------------------------------------------
     Canonical source
     ---------------------------------------------------------- */

  const context =
    await loadContext()

  console.log(
    `✓ canonical pages: ${context.pageCount}`,
  )

  /* ----------------------------------------------------------
     Catalog
     ---------------------------------------------------------- */

  const loadedCatalog =
    await loadSourceCatalogArtifact(
      LESSON.lessonKey,
    )

  const catalog =
    loadedCatalog.catalog

  if (
    catalog.catalogPolicyVersion !==
      EXPECTED_SOURCE_CATALOG_POLICY
  ) {
    throw new Error(
      'Unexpected source catalog policy.',
    )
  }

  assertCatalogMatchesContext(
    catalog,
    context,
  )

  if (
    !isObject(
      generated.artifact.source,
    ) ||
    !isObject(
      generated
        .artifact
        .source
        .sourceCatalog,
    )
  ) {
    throw new Error(
      'Generated sourceCatalog metadata missing.',
    )
  }

  if (
    generated
      .artifact
      .source
      .sourceCatalog
      .canonicalContentSha256 !==
    catalog
      .canonicalSource
      .canonicalContentSha256
  ) {
    throw new Error(
      'Generated artifact/catalog canonical SHA mismatch.',
    )
  }

  const generatedCatalogSha =
    generated
      .artifact
      .source
      .sourceCatalog
      .sourceCatalogArtifactSha256

  if (
    typeof generatedCatalogSha !==
      'string' ||
    generatedCatalogSha.length ===
      0
  ) {
    throw new Error(
      [
        'Generated artifact is missing sourceCatalogArtifactSha256.',
        'This auditor requires exact source-catalog revision binding.',
        'Do not audit legacy/frozen artifacts with this hardened path.',
      ].join('\n'),
    )
  }

  if (
    generatedCatalogSha !==
      loadedCatalog.artifactSha256
  ) {
    throw new Error(
      [
        'Generated artifact/current source catalog artifact SHA mismatch.',
        `Generated=${generatedCatalogSha}`,
        `Current=${loadedCatalog.artifactSha256}`,
        '',
        'The deterministic source catalog changed after generation.',
        'Do not run the semantic audit against a different catalog revision.',
      ].join('\n'),
    )
  }

  console.log(
    '✓ deterministic source catalog: VERIFIED',
  )

  console.log(
    '✓ exact source catalog SHA: VERIFIED',
  )

  /* ----------------------------------------------------------
     Source claim report
     ---------------------------------------------------------- */

  const sourceClaimReport =
    await loadSourceClaimReport()

  if (
    sourceClaimReport
      .report
      .canonicalContentSha256 !==
    catalog
      .canonicalSource
      .canonicalContentSha256
  ) {
    throw new Error(
      'Source-claim report/catalog SHA mismatch.',
    )
  }

  console.log(
    '✓ embedded source-claim audit: PASS',
  )

  /* ----------------------------------------------------------
     Normalization safety
     ---------------------------------------------------------- */

  const normalization =
    validateNormalizations(
      generated.artifact,
    )

  console.log(
    `✓ deterministic normalizations: ${normalization.count}`,
  )

  if (
    normalization.count >
      0
  ) {
    console.log(
      '✓ normalization semantic repair: NO',
    )

    console.log(
      '✓ normalization LLM calls: 0',
    )
  }

  /* ----------------------------------------------------------
     Visual source
     ---------------------------------------------------------- */

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
        `Visual/canonical mapping mismatch at index ${index}.`,
      )
    }
  }

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

  /* ----------------------------------------------------------
     Deterministic pre-audit
     ---------------------------------------------------------- */

  const deterministicIssues =
    deterministicPreAudit(
      generated.lesson,
      context,
      catalog,
    )

  const deterministicErrors =
    deterministicIssues.filter(
      (issue) =>
        issue.severity ===
          'ERROR',
    )

  /*
   * SEMANTIC_MULTIMODAL_AUDIT_PENDING is expected and should
   * not be treated as a final warning.
   */
  const deterministicWarnings =
    deterministicIssues.filter(
      (issue) =>
        issue.severity ===
          'WARNING' &&
        issue.issueType !==
          'SEMANTIC_MULTIMODAL_AUDIT_PENDING',
    )

  console.log(
    `✓ deterministic errors: ${deterministicErrors.length}`,
  )

  console.log(
    `✓ deterministic warnings: ${deterministicWarnings.length}`,
  )

  if (
    deterministicErrors.length >
      0
  ) {
    console.log(
      '\nDeterministic errors:',
    )

    for (
      const issue
      of deterministicErrors
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

    throw new Error(
      'V5_DETERMINISTIC_PRE_AUDIT_FAILED',
    )
  }

  /* ----------------------------------------------------------
     Prevent overwrite
     ---------------------------------------------------------- */

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive:
        true,
    },
  )

  const outputFile =
    path.resolve(
      OUTPUT_DIRECTORY,
      `${LESSON.lessonKey}-${DURATION}min-audit.json`,
    )

  try {
    await readFile(
      outputFile,
    )

    throw new Error(
      [
        'A v5 audit artifact already exists.',
        'Audit refused to preserve reproducibility.',
        '',
        path.relative(
          ROOT,
          outputFile,
        ),
      ].join('\n'),
    )
  } catch (
    error
  ) {
    if (
      (
        error as
          NodeJS.ErrnoException
      ).code !==
        'ENOENT'
    ) {
      throw error
    }
  }

  /* ----------------------------------------------------------
     Independent audit
     ---------------------------------------------------------- */

  console.log(
    '\nRunning one independent catalog-grounded multimodal audit...\n',
  )

  const audit =
    await runAudit(
      context,
      visual.record,
      catalog,
      generated.lesson,
      visual.bytes,
    )

  const modelAudit =
    audit.modelAudit

  /* ----------------------------------------------------------
     Safe narrowing
     ---------------------------------------------------------- */

  if (
    !isObject(
      modelAudit
        .independentConceptAudit,
    ) ||
    !Array.isArray(
      modelAudit
        .independentConceptAudit
        .majorConcepts,
    )
  ) {
    throw new Error(
      'Independent concept audit malformed after validation.',
    )
  }

  const concepts =
    modelAudit
      .independentConceptAudit
      .majorConcepts

  const covered =
    concepts.filter(
      (concept) =>
        isObject(
          concept,
        ) &&
        concept.ledgerStatus ===
          'PRESENT' &&
        concept.lessonStatus ===
          'COVERED',
    ).length

  const partial =
    concepts.filter(
      (concept) =>
        isObject(
          concept,
        ) &&
        concept.lessonStatus ===
          'PARTIAL',
    ).length

  const missing =
    concepts.filter(
      (concept) =>
        isObject(
          concept,
        ) &&
        (
          concept.ledgerStatus ===
            'MISSING' ||
          concept.lessonStatus ===
            'MISSING'
        ),
    ).length

  /* ----------------------------------------------------------
   Safely narrow model audit issues

   validateModelAudit() already verifies this at runtime, but
   TypeScript does not preserve that narrowing across the
   function boundary.
   ---------------------------------------------------------- */

const modelIssues =
  modelAudit.issues

if (
  !Array.isArray(
    modelIssues,
  )
) {
  throw new Error(
    'Model audit issues array is missing after validation.',
  )
}

const auditErrors =
  modelIssues.filter(
    (issue) =>
      isObject(
        issue,
      ) &&
      issue.severity ===
        'ERROR',
  )

const auditWarnings =
  modelIssues.filter(
    (issue) =>
      isObject(
        issue,
      ) &&
      issue.severity ===
        'WARNING',
  )

  let finalDecision =
    modelAudit.decision as
      'PASS' |
      'REPAIR_REQUIRED' |
      'REJECT'

  /*
   * Hard final consistency gates.
   */
  if (
    finalDecision ===
      'PASS' &&
    (
      deterministicErrors.length >
        0 ||
      auditErrors.length >
        0 ||
      partial >
        0 ||
      missing >
        0 ||
      covered !==
        concepts.length
    )
  ) {
    finalDecision =
      'REPAIR_REQUIRED'
  }

  const judgeReady =
    finalDecision ===
      'PASS' &&
    deterministicErrors.length ===
      0 &&
    auditErrors.length ===
      0 &&
    partial ===
      0 &&
    missing ===
      0 &&
    covered ===
      concepts.length

  /* ----------------------------------------------------------
     Output
     ---------------------------------------------------------- */

  const output = {
    artifactVersion:
      AUDIT_SCHEMA_VERSION,

    auditPolicyVersion:
      AUDIT_POLICY_VERSION,

    status:
      'AUDIT_COMPLETED',

    lessonKey:
      LESSON.lessonKey,

    requestedDurationMinutes:
      DURATION,

    generationPolicyVersion:
      EXPECTED_GENERATION_POLICY,

    sourceCatalogPolicyVersion:
      catalog
        .catalogPolicyVersion,

    sourceClaimAuditPolicyVersion:
      EXPECTED_SOURCE_CLAIM_POLICY,

    finalDecision,

    judgeReady,

    deterministicNormalizations:
      normalization.count,

    deterministicPreAudit: {
      status:
        deterministicErrors.length ===
          0
          ? 'PASS'
          : 'FAIL',

      errors:
        deterministicErrors,

      warnings:
        deterministicWarnings,
    },

    sourceClaimGate: {
      status:
        'PASS',

      auditFile:
        path.relative(
          ROOT,
          sourceClaimReport.filePath,
        ),

      canonicalContentSha256:
        catalog
          .canonicalSource
          .canonicalContentSha256,

      sourceCatalogArtifactSha256:
        loadedCatalog
          .artifactSha256,

      unsupportedClaims:
        0,
    },

    modelAudit,

    auditGeneration: {
      provider:
        'google',

      model:
        AUDIT_MODEL,

      thinkingLevel:
        'MEDIUM',

      attempt:
        audit.attempt,

      elapsedMs:
        audit.elapsedMs,

      finishReason:
        audit.finishReason,

      modelVersion:
        audit.modelVersion,

      responseId:
        audit.responseId,

      maxOutputTokens:
        MAX_OUTPUT_TOKENS,

      requestTimeoutMs:
        REQUEST_TIMEOUT_MS,

      usage:
        audit.usage,
    },

    source: {
      mode:
        'FULL_CHAPTER',

      sourceFileName:
        context.sourceFileName,

      canonicalPageStart:
        context.firstPage,

      canonicalPageEnd:
        context.lastPage,

      canonicalPageCount:
        context.pageCount,

      canonicalContentSha256:
        catalog
          .canonicalSource
          .canonicalContentSha256,

      sourceCatalogArtifactSha256:
        loadedCatalog
          .artifactSha256,

      sourceCatalogFile:
        path.relative(
          ROOT,
          loadedCatalog.filePath,
        ),

      visualFileName:
        visual.record
          .outputFileName,

      visualPageCount:
        visual.record
          .pageCount,

      visualMappingVerified:
        true,

      catalogStatistics: {
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
      },
    },

    auditedAt:
      new Date()
        .toISOString(),
  }

  await writeFile(
    outputFile,

    `${JSON.stringify(
      output,
      null,
      2,
    )}\n`,

    'utf8',
  )

  /* ----------------------------------------------------------
     Console summary
     ---------------------------------------------------------- */

  console.log(
    '==========================================',
  )

  console.log(
    ' Independent Audit v5 Completed',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Final decision         : ${finalDecision}`,
  )

  console.log(
    `Deterministic errors   : ${deterministicErrors.length}`,
  )

  console.log(
    `Deterministic warnings : ${deterministicWarnings.length}`,
  )

  console.log(
    `Audit errors           : ${auditErrors.length}`,
  )

  console.log(
    `Audit warnings         : ${auditWarnings.length}`,
  )

  console.log(
    `Concepts COVERED       : ${covered}`,
  )

  console.log(
    `Concepts PARTIAL       : ${partial}`,
  )

  console.log(
    `Concepts MISSING       : ${missing}`,
  )

  console.log(
    `Judge ready            : ${judgeReady
      ? 'YES'
      : 'NO'}`,
  )

  console.log(
    'Gemini 3.7 calls       : 0',
  )

  console.log(
    'Groq calls             : 0',
  )

  console.log(
    'Supabase writes        : 0',
  )

  console.log(
  '\nScores:',
)

const modelScores =
  modelAudit.scores

if (
  !isObject(
    modelScores,
  )
) {
  throw new Error(
    'Model audit scores object is missing after validation.',
  )
}

for (
  const field
  of SCORE_FIELDS
) {
  console.log(
    `- ${field}: ${String(
      modelScores[field],
    )}/10`,
  )
}

  console.log(
    '\nOutput:',
  )

  console.log(
    path.relative(
      ROOT,
      outputFile,
    ),
  )

  console.log(
    '\nNEXT GATE:',
  )

  if (
    finalDecision ===
      'PASS'
  ) {
    console.log(
      [
        'Force and Laws passed the complete Generator v5 quality pipeline.',
        'Do not regenerate it.',
        'Send the audit artifact/output for final review before immutable promotion.',
      ].join(' '),
    )
  } else if (
    finalDecision ===
      'REPAIR_REQUIRED'
  ) {
    console.log(
      [
        'Do not regenerate the lesson.',
        'Do not perform a repair yet.',
        'Send the audit artifact/output so the single permitted semantic repair can be scoped exactly.',
      ].join(' '),
    )
  } else {
    console.log(
      [
        'Audit returned REJECT.',
        'Do not auto-repair or regenerate.',
        'Inspect the independent audit first because major reconstruction may be required.',
      ].join(' '),
    )
  }

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
      ' Independent Audit v5 FAILED',
    )

    console.error(
      '==========================================\n',
    )

    console.error(
      error instanceof Error
        ? error.stack ??
          error.message
        : String(
            error,
          ),
    )

    console.error(
      '\nNo repair was performed.',
    )

    console.error(
      'No Gemini 3.7 call was made.',
    )

    console.error(
      'No Groq call was made.',
    )

    console.error(
      'No Supabase data was changed.\n',
    )

    process.exitCode =
      1
  },
)