import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'

import path from 'node:path'
import process from 'node:process'

import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'

/* ============================================================
   CHALKBOX — PRODUCTION CONTEXT QUALITY TEST v3

   Focused-query pipeline:

   query
     ↓
   Gemini Embedding 2
     ↓
   Top-8 semantic candidates
     ↓
   Gemini 3.5 Flash Lite relevance reranker
     ↓
   1–3 anchor pages
     ↓
   ±1 neighbour expansion
     ↓
   generation-ready textbook context

   IMPORTANT

   Gemini 3.7 is NOT used here.

   3.7 is reserved for:
   - final lesson generation
   - grounding / coverage audit
   - targeted repair

   NO Supabase writes.
   NO corpus modification.
   ============================================================ */

dotenv.config({
  path: path.resolve(
    process.cwd(),
    '.env.ingest.local',
  ),
})

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim()

if (!GEMINI_API_KEY) {
  throw new Error(
    [
      'GEMINI_API_KEY is missing.',
      'Expected it in .env.ingest.local.',
      'Do not paste the API key into chat.',
    ].join('\n'),
  )
}

/* ============================================================
   MODELS
   ============================================================ */

const EMBEDDING_MODEL =
  'gemini-embedding-2'

/*
 * Intentionally locked.
 *
 * Do not switch this back to Gemini 3.7.
 * Reranking is classification/ranking work.
 */

const RERANK_MODEL =
  'gemini-3.5-flash-lite'

const RERANK_POLICY_VERSION =
  'flash-lite-rerank-v1'

const DIMENSIONS = 768

const CANDIDATE_COUNT = 8

const MAX_ANCHORS = 3

const MAX_CONTEXT_PAGES = 7

/* ============================================================
   RETRY POLICY
   ============================================================ */

const MAX_API_ATTEMPTS = 4

const INITIAL_RETRY_DELAY_MS =
  5_000

const MAX_RETRY_DELAY_MS =
  30_000

/* ============================================================
   PATHS
   ============================================================ */

const ROOT =
  process.cwd()

const RAW_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'rag-index-v1',
  )

const EMBEDDING_FILE =
  path.resolve(
    ROOT,
    'data',
    'rag-embeddings-v1',
    'embeddings.json',
  )

/*
 * IMPORTANT:
 *
 * Fresh output directory.
 *
 * We intentionally DO NOT reuse the older Gemini 3.7 reranking
 * cache because we want all four tests validated under the
 * production reranker we are actually going to deploy.
 */

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'production-context-tests-flash-lite-v1',
  )

/* ============================================================
   TESTS
   ============================================================ */

type RetrievalTest = {
  id: string
  lessonKey: string
  lessonFile: string
  query: string
}

const TESTS: RetrievalTest[] = [
  {
    id:
      '01-electric-current',

    lessonKey:
      'class-10-electricity',

    lessonFile:
      'class-10-electricity.json',

    query:
      'What is electric current?',
  },

  {
    id:
      '02-double-circulation',

    lessonKey:
      'class-10-life-processes',

    lessonFile:
      'class-10-life-processes.json',

    query:
      'Explain double circulation in humans',
  },

  {
    id:
      '03-newtons-second-law-activity',

    lessonKey:
      'class-9-force-laws-motion',

    lessonFile:
      'class-9-force-laws-motion.json',

    query:
      "Suggest a classroom activity to explain Newton's second law",
  },

  {
    id:
      '04-metals-vs-non-metals',

    lessonKey:
      'class-8-materials-metals-non-metals',

    lessonFile:
      'class-8-materials-metals-non-metals.json',

    query:
      'What is the difference between metals and non-metals?',
  },
]

/* ============================================================
   TYPES
   ============================================================ */

type RawChunk = {
  chunkId: string
  lessonKey: string
  lessonTitle: string
  chunkIndex: number
  content: string
  pageStart: number
  pageEnd: number
  sha256: string
}

type LessonIndex = {
  chunks: RawChunk[]
}

type EmbeddingRecord = {
  chunkId: string
  lessonKey: string
  dimensions: number
  embedding: number[]
}

type EmbeddingStore = {
  model: string
  dimensions: number
  records: Record<
    string,
    EmbeddingRecord
  >
}

type Candidate = {
  chunkId: string
  chunkIndex: number
  pageStart: number
  pageEnd: number
  similarity: number
  content: string
}

type RerankSelection = {
  chunkId: string

  relevance:
    | 'direct'
    | 'supporting'

  reason: string
}

type RerankResult = {
  selected:
    RerankSelection[]

  hasMatchingTextbookActivity:
    boolean

  matchingActivityReason:
    string
}

type ContextPage = {
  chunkId: string
  pageStart: number
  pageEnd: number
  isAnchor: boolean
  content: string
}

type TestReport = {
  schemaVersion: number

  rerankPolicyVersion:
    string

  testId: string

  query: string

  lessonKey: string

  embeddingModel: string

  rerankModel: string

  topCandidates: {
    rank: number
    chunkId: string
    page: number
    similarity: number
  }[]

  rerank:
    RerankResult

  anchorPages:
    number[]

  contextPages:
    number[]

  context:
    ContextPage[]
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
   HELPERS
   ============================================================ */

function sleep(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      )
    },
  )
}

function getErrorText(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message
  }

  try {
    return JSON.stringify(
      error,
    )
  } catch {
    return String(
      error,
    )
  }
}

function extractApiCode(
  error: unknown,
) {
  const text =
    getErrorText(
      error,
    )

  const match =
    text.match(
      /(?:["']?code["']?\s*:\s*|\b)(429|500|502|503|504)\b/i,
    )

  if (!match?.[1]) {
    return null
  }

  return Number(
    match[1],
  )
}

function isRetryableError(
  error: unknown,
) {
  const code =
    extractApiCode(
      error,
    )

  return (
    code === 429 ||
    code === 500 ||
    code === 502 ||
    code === 503 ||
    code === 504
  )
}

async function withRetry<T>(
  label: string,
  operation:
    () => Promise<T>,
) {
  let delay =
    INITIAL_RETRY_DELAY_MS

  let lastError:
    unknown = null

  for (
    let attempt = 1;
    attempt <=
      MAX_API_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await operation()
    } catch (error) {
      lastError =
        error

      if (
        !isRetryableError(
          error,
        )
      ) {
        throw error
      }

      if (
        attempt ===
        MAX_API_ATTEMPTS
      ) {
        break
      }

      console.log(
        `      ⚠ ${label} temporary failure`,
      )

      console.log(
        `      ↳ retrying in ${Math.ceil(
          delay / 1000,
        )}s`,
      )

      await sleep(
        delay,
      )

      delay =
        Math.min(
          delay * 2,
          MAX_RETRY_DELAY_MS,
        )
    }
  }

  throw lastError
}

/* ============================================================
   VECTOR HELPERS
   ============================================================ */

function vectorNorm(
  values: number[],
) {
  return Math.sqrt(
    values.reduce(
      (
        sum,
        value,
      ) =>
        sum +
        value * value,
      0,
    ),
  )
}

function validateVector(
  label: string,
  values: number[],
) {
  if (
    values.length !==
    DIMENSIONS
  ) {
    throw new Error(
      `${label}: expected ${DIMENSIONS} dimensions, received ${values.length}.`,
    )
  }

  if (
    !values.every(
      Number.isFinite,
    )
  ) {
    throw new Error(
      `${label}: vector contains non-finite values.`,
    )
  }

  const norm =
    vectorNorm(
      values,
    )

  if (
    norm < 0.95 ||
    norm > 1.05
  ) {
    throw new Error(
      `${label}: unexpected vector norm ${norm}.`,
    )
  }
}

function dotProduct(
  left: number[],
  right: number[],
) {
  if (
    left.length !==
    right.length
  ) {
    throw new Error(
      'Vector dimension mismatch.',
    )
  }

  let result = 0

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    result +=
      left[index] *
      right[index]
  }

  return result
}

function queryEmbeddingInput(
  query: string,
) {
  return (
    `task: search result | ` +
    `query: ${query}`
  )
}

/* ============================================================
   LOAD CORPUS
   ============================================================ */

async function loadEmbeddings() {
  const text =
    await readFile(
      EMBEDDING_FILE,
      'utf8',
    )

  const store =
    JSON.parse(
      text,
    ) as EmbeddingStore

  if (
    store.model !==
    EMBEDDING_MODEL
  ) {
    throw new Error(
      `Expected ${EMBEDDING_MODEL}, found ${store.model}.`,
    )
  }

  if (
    store.dimensions !==
    DIMENSIONS
  ) {
    throw new Error(
      `Expected ${DIMENSIONS}-dimensional corpus embeddings.`,
    )
  }

  return store
}

async function loadLesson(
  test: RetrievalTest,
) {
  const filePath =
    path.join(
      RAW_DIRECTORY,
      test.lessonFile,
    )

  const text =
    await readFile(
      filePath,
      'utf8',
    )

  const lesson =
    JSON.parse(
      text,
    ) as LessonIndex

  if (
    !Array.isArray(
      lesson.chunks,
    ) ||
    lesson.chunks.length === 0
  ) {
    throw new Error(
      `${test.lessonFile}: no chunks found.`,
    )
  }

  for (
    const chunk
    of lesson.chunks
  ) {
    if (
      chunk.lessonKey !==
      test.lessonKey
    ) {
      throw new Error(
        `${chunk.chunkId}: lesson mismatch.`,
      )
    }
  }

  return lesson.chunks
}

/* ============================================================
   QUERY EMBEDDING
   ============================================================ */

async function createQueryEmbedding(
  query: string,
) {
  return withRetry(
    'query embedding',
    async () => {
      const response =
        await ai.models.embedContent({
          model:
            EMBEDDING_MODEL,

          contents:
            queryEmbeddingInput(
              query,
            ),

          config: {
            outputDimensionality:
              DIMENSIONS,
          },
        })

      const embeddings =
        response.embeddings

      if (
        !embeddings ||
        embeddings.length !== 1
      ) {
        throw new Error(
          `Expected one query embedding, received ${
            embeddings?.length ??
            0
          }.`,
        )
      }

      const values =
        embeddings[0]?.values

      if (!values) {
        throw new Error(
          'Gemini returned no query embedding values.',
        )
      }

      validateVector(
        'query',
        values,
      )

      return values
    },
  )
}

/* ============================================================
   SEMANTIC RETRIEVAL
   ============================================================ */

function retrieveCandidates(
  chunks: RawChunk[],
  embeddings:
    EmbeddingStore,
  queryVector:
    number[],
) {
  return chunks
    .map(
      (
        chunk,
      ): Candidate => {
        const record =
          embeddings.records[
            chunk.chunkId
          ]

        if (!record) {
          throw new Error(
            `Missing embedding for ${chunk.chunkId}.`,
          )
        }

        if (
          record.lessonKey !==
          chunk.lessonKey
        ) {
          throw new Error(
            `${chunk.chunkId}: embedding lesson mismatch.`,
          )
        }

        validateVector(
          chunk.chunkId,
          record.embedding,
        )

        return {
          chunkId:
            chunk.chunkId,

          chunkIndex:
            chunk.chunkIndex,

          pageStart:
            chunk.pageStart,

          pageEnd:
            chunk.pageEnd,

          similarity:
            dotProduct(
              queryVector,
              record.embedding,
            ),

          content:
            chunk.content,
        }
      },
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.similarity -
        left.similarity,
    )
    .slice(
      0,
      CANDIDATE_COUNT,
    )
}

/* ============================================================
   RERANKING
   ============================================================ */

function createRerankPrompt(
  test: RetrievalTest,
  candidates:
    Candidate[],
) {
  const candidateText =
    candidates
      .map(
        (
          candidate,
          index,
        ) => `
CANDIDATE ${index + 1}

chunkId:
${candidate.chunkId}

page:
${candidate.pageStart}

semanticSimilarity:
${candidate.similarity.toFixed(6)}

SOURCE TEXT:
${candidate.content}
`,
      )
      .join(
        '\n============================================================\n',
      )

  return `
You are a source-selection classifier for ChalkBox,
a textbook-grounded lesson-planning system.

You are NOT writing the lesson.

USER REQUEST:

${test.query}

SELECTED TEXTBOOK LESSON:

${test.lessonKey}

Your only task is to identify the strongest source pages
needed to answer the request accurately.

STRICT RULES:

1. Select between 1 and ${MAX_ANCHORS} supplied candidates.

2. Never invent a chunkId.

3. "direct":
   the page directly defines, explains, demonstrates,
   calculates, compares, or provides evidence for the
   requested concept.

4. "supporting":
   genuinely useful adjacent evidence.

5. Do not select something merely because it contains
   similar vocabulary.

6. Prefer concept-specific evidence over chapter summaries.

7. For requests asking for an activity:

   hasMatchingTextbookActivity=true ONLY when an explicit
   textbook activity in the supplied text actually
   demonstrates the requested concept.

8. An activity from the same chapter that teaches another
   concept is NOT a matching textbook activity.

9. If no genuinely matching textbook activity exists:

   hasMatchingTextbookActivity=false

10. Do not answer the user's question.

Return ONLY valid JSON:

{
  "selected": [
    {
      "chunkId": "exact supplied chunkId",
      "relevance": "direct",
      "reason": "short evidence-based reason"
    }
  ],
  "hasMatchingTextbookActivity": false,
  "matchingActivityReason": "short explanation"
}

CANDIDATES:

${candidateText}
`.trim()
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

function validateRerankResult(
  raw: unknown,
  candidates:
    Candidate[],
): RerankResult {
  if (
    !raw ||
    typeof raw !==
      'object'
  ) {
    throw new Error(
      'Reranker returned invalid JSON.',
    )
  }

  const result =
    raw as Record<
      string,
      unknown
    >

  if (
    !Array.isArray(
      result.selected,
    )
  ) {
    throw new Error(
      'Reranker selected array missing.',
    )
  }

  if (
    result.selected.length <
      1 ||
    result.selected.length >
      MAX_ANCHORS
  ) {
    throw new Error(
      `Reranker must choose 1-${MAX_ANCHORS} anchors.`,
    )
  }

  const validIds =
    new Set(
      candidates.map(
        (
          candidate,
        ) =>
          candidate.chunkId,
      ),
    )

  const seen =
    new Set<string>()

  const selected:
    RerankSelection[] = []

  for (
    const item
    of result.selected
  ) {
    if (
      !item ||
      typeof item !==
        'object'
    ) {
      throw new Error(
        'Invalid reranker selection.',
      )
    }

    const record =
      item as Record<
        string,
        unknown
      >

    const chunkId =
      String(
        record.chunkId ??
          '',
      )

    const relevance =
      String(
        record.relevance ??
          '',
      )

    const reason =
      String(
        record.reason ??
          '',
      ).trim()

    if (
      !validIds.has(
        chunkId,
      )
    ) {
      throw new Error(
        `Reranker invented chunkId ${chunkId}.`,
      )
    }

    if (
      seen.has(
        chunkId,
      )
    ) {
      throw new Error(
        `Reranker duplicated ${chunkId}.`,
      )
    }

    if (
      relevance !==
        'direct' &&
      relevance !==
        'supporting'
    ) {
      throw new Error(
        `${chunkId}: invalid relevance type.`,
      )
    }

    if (!reason) {
      throw new Error(
        `${chunkId}: missing reason.`,
      )
    }

    seen.add(
      chunkId,
    )

    selected.push({
      chunkId,

      relevance:
        relevance as
          | 'direct'
          | 'supporting',

      reason,
    })
  }

  if (
    typeof
      result.hasMatchingTextbookActivity !==
    'boolean'
  ) {
    throw new Error(
      'Activity decision missing.',
    )
  }

  const activityReason =
    String(
      result.matchingActivityReason ??
        '',
    ).trim()

  if (!activityReason) {
    throw new Error(
      'Activity reason missing.',
    )
  }

  return {
    selected,

    hasMatchingTextbookActivity:
      result.hasMatchingTextbookActivity,

    matchingActivityReason:
      activityReason,
  }
}

async function rerankCandidates(
  test: RetrievalTest,
  candidates:
    Candidate[],
) {
  return withRetry(
    'Flash Lite reranker',
    async () => {
      const response =
        await ai.models.generateContent({
          model:
            RERANK_MODEL,

          contents:
            createRerankPrompt(
              test,
              candidates,
            ),

          config: {
            temperature: 0,

            responseMimeType:
              'application/json',
          },
        })

      const text =
        response.text?.trim()

      if (!text) {
        throw new Error(
          'Reranker returned empty output.',
        )
      }

      return validateRerankResult(
        parseJson(
          text,
        ),
        candidates,
      )
    },
  )
}

/* ============================================================
   NEIGHBOUR EXPANSION
   ============================================================ */

function buildContext(
  chunks: RawChunk[],
  rerank:
    RerankResult,
) {
  const chunkById =
    new Map(
      chunks.map(
        (
          chunk,
        ) => [
          chunk.chunkId,
          chunk,
        ],
      ),
    )

  const chunkByPage =
    new Map<
      number,
      RawChunk[]
    >()

  for (
    const chunk
    of chunks
  ) {
    const pageChunks =
      chunkByPage.get(
        chunk.pageStart,
      ) ?? []

    pageChunks.push(
      chunk,
    )

    chunkByPage.set(
      chunk.pageStart,
      pageChunks,
    )
  }

  const anchorPages =
    new Set<number>()

  for (
    const selection
    of rerank.selected
  ) {
    const chunk =
      chunkById.get(
        selection.chunkId,
      )

    if (!chunk) {
      throw new Error(
        `Missing selected chunk ${selection.chunkId}.`,
      )
    }

    anchorPages.add(
      chunk.pageStart,
    )
  }

  const selectedPages =
    new Set<number>(
      anchorPages,
    )

  const neighbours =
    new Set<number>()

  for (
    const page
    of anchorPages
  ) {
    if (
      chunkByPage.has(
        page - 1,
      )
    ) {
      neighbours.add(
        page - 1,
      )
    }

    if (
      chunkByPage.has(
        page + 1,
      )
    ) {
      neighbours.add(
        page + 1,
      )
    }
  }

  for (
    const page
    of [...neighbours]
      .sort(
        (
          left,
          right,
        ) =>
          left - right,
      )
  ) {
    if (
      selectedPages.size >=
      MAX_CONTEXT_PAGES
    ) {
      break
    }

    selectedPages.add(
      page,
    )
  }

  const contextPages =
    [...selectedPages]
      .sort(
        (
          left,
          right,
        ) =>
          left - right,
      )

  const context:
    ContextPage[] = []

  for (
    const page
    of contextPages
  ) {
    const pageChunks =
      [
        ...(
          chunkByPage.get(
            page,
          ) ?? []
        ),
      ]
        .sort(
          (
            left,
            right,
          ) =>
            left.chunkIndex -
            right.chunkIndex,
        )

    for (
      const chunk
      of pageChunks
    ) {
      context.push({
        chunkId:
          chunk.chunkId,

        pageStart:
          chunk.pageStart,

        pageEnd:
          chunk.pageEnd,

        isAnchor:
          anchorPages.has(
            page,
          ),

        content:
          chunk.content,
      })
    }
  }

  return {
    anchorPages:
      [...anchorPages]
        .sort(
          (
            left,
            right,
          ) =>
            left - right,
        ),

    contextPages,

    context,
  }
}

/* ============================================================
   CACHE
   ============================================================ */

function validNumberArray(
  value: unknown,
) {
  return (
    Array.isArray(
      value,
    ) &&
    value.length > 0 &&
    value.every(
      (
        item,
      ) =>
        typeof item ===
          'number' &&
        Number.isFinite(
          item,
        ),
    )
  )
}

function validateCachedReport(
  raw: unknown,
  test: RetrievalTest,
): raw is TestReport {
  if (
    !raw ||
    typeof raw !==
      'object'
  ) {
    return false
  }

  const value =
    raw as Record<
      string,
      unknown
    >

  return (
    value.schemaVersion ===
      1 &&
    value.rerankPolicyVersion ===
      RERANK_POLICY_VERSION &&
    value.testId ===
      test.id &&
    value.query ===
      test.query &&
    value.lessonKey ===
      test.lessonKey &&
    value.embeddingModel ===
      EMBEDDING_MODEL &&
    value.rerankModel ===
      RERANK_MODEL &&
    Array.isArray(
      value.topCandidates,
    ) &&
    value.topCandidates.length ===
      CANDIDATE_COUNT &&
    validNumberArray(
      value.anchorPages,
    ) &&
    validNumberArray(
      value.contextPages,
    ) &&
    Array.isArray(
      value.context,
    ) &&
    value.context.length > 0
  )
}

async function loadCachedReport(
  test: RetrievalTest,
) {
  const outputFile =
    path.join(
      OUTPUT_DIRECTORY,
      `${test.id}.json`,
    )

  try {
    const text =
      await readFile(
        outputFile,
        'utf8',
      )

    const parsed =
      JSON.parse(
        text,
      ) as unknown

    if (
      validateCachedReport(
        parsed,
        test,
      )
    ) {
      return parsed
    }

    return null
  } catch (
    error
  ) {
    const code =
      (
        error as
          NodeJS.ErrnoException
      ).code

    if (
      code ===
      'ENOENT'
    ) {
      return null
    }

    if (
      error instanceof
      SyntaxError
    ) {
      return null
    }

    throw error
  }
}

/* ============================================================
   TEST EXECUTION
   ============================================================ */

async function runTest(
  test: RetrievalTest,
  embeddingStore:
    EmbeddingStore,
) {
  const chunks =
    await loadLesson(
      test,
    )

  const queryVector =
    await createQueryEmbedding(
      test.query,
    )

  const candidates =
    retrieveCandidates(
      chunks,
      embeddingStore,
      queryVector,
    )

  const rerank =
    await rerankCandidates(
      test,
      candidates,
    )

  const context =
    buildContext(
      chunks,
      rerank,
    )

  const report:
    TestReport = {
    schemaVersion: 1,

    rerankPolicyVersion:
      RERANK_POLICY_VERSION,

    testId:
      test.id,

    query:
      test.query,

    lessonKey:
      test.lessonKey,

    embeddingModel:
      EMBEDDING_MODEL,

    rerankModel:
      RERANK_MODEL,

    topCandidates:
      candidates.map(
        (
          candidate,
          index,
        ) => ({
          rank:
            index + 1,

          chunkId:
            candidate.chunkId,

          page:
            candidate.pageStart,

          similarity:
            Number(
              candidate.similarity.toFixed(
                6,
              ),
            ),
        }),
      ),

    rerank,

    anchorPages:
      context.anchorPages,

    contextPages:
      context.contextPages,

    context:
      context.context,
  }

  await writeFile(
    path.join(
      OUTPUT_DIRECTORY,
      `${test.id}.json`,
    ),

    `${JSON.stringify(
      report,
      null,
      2,
    )}\n`,

    'utf8',
  )

  return report
}

/* ============================================================
   MAIN
   ============================================================ */

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Production Context Test v3',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Embedding model : ${EMBEDDING_MODEL}`,
  )

  console.log(
    `Rerank model    : ${RERANK_MODEL}`,
  )

  console.log(
    `Policy          : ${RERANK_POLICY_VERSION}`,
  )

  console.log(
    `Candidates      : Top ${CANDIDATE_COUNT}`,
  )

  console.log(
    `Max anchors     : ${MAX_ANCHORS}`,
  )

  console.log(
    `Max context     : ${MAX_CONTEXT_PAGES}`,
  )

  console.log(
    'Gemini 3.7 calls: 0',
  )

  console.log(
    'Supabase writes : 0\n',
  )

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  )

  const embeddingStore =
    await loadEmbeddings()

  let reused = 0
  let generated = 0

  for (
    let index = 0;
    index < TESTS.length;
    index += 1
  ) {
    const test =
      TESTS[index]

    console.log(
      `[${index + 1}/${TESTS.length}] ${test.id}`,
    )

    console.log(
      `      Query: ${test.query}`,
    )

    const cached =
      await loadCachedReport(
        test,
      )

    if (cached) {
      reused += 1

      console.log(
        '      ✓ valid Flash-Lite cache',
      )

      console.log(
        `      ✓ anchors: ${cached.anchorPages.join(
          ', ',
        )}`,
      )

      console.log(
        `      ✓ context: ${cached.contextPages.join(
          ', ',
        )}`,
      )

      console.log(
        `      ✓ textbook activity: ${
          cached.rerank
            .hasMatchingTextbookActivity
            ? 'YES'
            : 'NO'
        }`,
      )

      console.log(
        '      ✓ REUSED\n',
      )

      continue
    }

    const report =
      await runTest(
        test,
        embeddingStore,
      )

    generated += 1

    console.log(
      `      ✓ anchors: ${report.anchorPages.join(
        ', ',
      )}`,
    )

    console.log(
      `      ✓ context: ${report.contextPages.join(
        ', ',
      )}`,
    )

    console.log(
      `      ✓ textbook activity: ${
        report.rerank
          .hasMatchingTextbookActivity
          ? 'YES'
          : 'NO'
      }`,
    )

    console.log(
      '      ✓ SAVED\n',
    )

    if (
      index <
      TESTS.length - 1
    ) {
      await sleep(
        2500,
      )
    }
  }

  console.log(
    '==========================================',
  )

  console.log(
    ' Production Context Suite Complete',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Tests total      : ${TESTS.length}`,
  )

  console.log(
    `Reused cache     : ${reused}`,
  )

  console.log(
    `Generated now    : ${generated}`,
  )

  console.log(
    `Completed        : ${reused + generated}/${TESTS.length}`,
  )

  console.log(
    `Reranker         : ${RERANK_MODEL}`,
  )

  console.log(
    'Gemini 3.7 calls : 0',
  )

  console.log(
    'Supabase writes  : 0',
  )

  console.log(
    '\nOutput:',
  )

  console.log(
    'data/production-context-tests-flash-lite-v1/\n',
  )
}

main().catch(
  (
    error: unknown,
  ) => {
    console.error(
      '\n==========================================',
    )

    console.error(
      ' Production Context Test FAILED',
    )

    console.error(
      '==========================================\n',
    )

    console.error(
      getErrorText(
        error,
      ),
    )

    console.error(
      '\nCompleted Flash-Lite results remain cached safely.\n',
    )

    process.exitCode = 1
  },
)