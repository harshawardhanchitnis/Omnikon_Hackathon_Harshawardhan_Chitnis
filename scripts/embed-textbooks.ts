import { createHash } from 'node:crypto'
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
   CHALKBOX — RAW TEXTBOOK EMBEDDING BUILDER v1

   INPUT:
     data/rag-index-v1/*.json

   OUTPUT:
     data/rag-embeddings-v1/embeddings.json
     data/rag-embeddings-v1/manifest.json

   PURPOSE:
   - Embed the 100 faithful raw textbook chunks
   - Gemini embedding model only
   - 768 dimensions
   - resumable
   - checksum protected
   - NO Supabase writes
   - NO generative Gemini calls
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

const MODEL = 'gemini-embedding-2'
const OUTPUT_DIMENSIONALITY = 768

/*
 * IMPORTANT:
 *
 * gemini-embedding-2 does not use taskType for retrieval.
 *
 * Google recommends formatting retrieval documents as:
 *
 * title: {title} | text: {content}
 */
const EMBEDDING_FORMAT_VERSION =
  'retrieval-document-v1'

const INPUT_DIRECTORY = path.resolve(
  process.cwd(),
  'data',
  'rag-index-v1',
)

const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  'data',
  'rag-embeddings-v1',
)

const EMBEDDINGS_FILE = path.join(
  OUTPUT_DIRECTORY,
  'embeddings.json',
)

const MANIFEST_FILE = path.join(
  OUTPUT_DIRECTORY,
  'manifest.json',
)

/*
 * Deliberately sequential.
 *
 * We have only 100 chunks.
 * Reliability matters more than shaving off a minute.
 */
const REQUEST_DELAY_MS = 1200

const MAX_ATTEMPTS = 4

const LESSON_FILES = [
  'class-8-chemical-effects-electric-current.json',
  'class-8-materials-metals-non-metals.json',
  'class-9-force-laws-motion.json',
  'class-9-work-energy.json',
  'class-10-life-processes.json',
  'class-10-electricity.json',
] as const

type RawChunk = {
  chunkId: string
  lessonKey: string
  classLevel: number
  subject: string
  lessonTitle: string
  sourceFileName: string
  chunkIndex: number
  content: string
  pageStart: number
  pageEnd: number
  charCount: number
  approxTokenCount: number
  sha256: string
}

type LessonIndex = {
  schemaVersion: number
  pipeline: string
  chunks: RawChunk[]
}

type EmbeddingRecord = {
  schemaVersion: 1

  chunkId: string
  lessonKey: string
  classLevel: number
  subject: string
  lessonTitle: string
  sourceFileName: string

  chunkIndex: number

  pageStart: number
  pageEnd: number

  contentSha256: string
  embeddingInputSha256: string

  model: string
  dimensions: number
  formatVersion: string

  embedding: number[]

  createdAt: string
}

type EmbeddingStore = {
  schemaVersion: 1
  model: string
  dimensions: number
  formatVersion: string

  records: Record<
    string,
    EmbeddingRecord
  >
}

type ManifestLesson = {
  lessonKey: string
  title: string
  chunks: number
  embedded: number
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function sha256(value: string) {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('hex')
}

function embeddingInput(
  chunk: RawChunk,
) {
  return (
    `title: ${chunk.lessonTitle} | ` +
    `text: ${chunk.content}`
  )
}

function vectorNorm(values: number[]) {
  return Math.sqrt(
    values.reduce(
      (sum, value) =>
        sum + value * value,
      0,
    ),
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error)
}

function retryable(error: unknown) {
  const message =
    errorMessage(error)

  return /429|500|502|503|504|RESOURCE_EXHAUSTED|UNAVAILABLE|fetch failed|ECONNRESET|ETIMEDOUT|rate.?limit|overloaded/i.test(
    message,
  )
}

async function loadStore(): Promise<EmbeddingStore> {
  try {
    const raw =
      await readFile(
        EMBEDDINGS_FILE,
        'utf8',
      )

    const parsed =
      JSON.parse(raw) as EmbeddingStore

    if (
      parsed.schemaVersion !== 1 ||
      parsed.model !== MODEL ||
      parsed.dimensions !==
        OUTPUT_DIMENSIONALITY ||
      parsed.formatVersion !==
        EMBEDDING_FORMAT_VERSION
    ) {
      throw new Error(
        [
          'Existing embedding cache is incompatible.',
          `Expected model=${MODEL}`,
          `Expected dimensions=${OUTPUT_DIMENSIONALITY}`,
          `Expected format=${EMBEDDING_FORMAT_VERSION}`,
          '',
          'Do not delete it blindly.',
          'Rename data/rag-embeddings-v1 if you intentionally want a fresh embedding corpus.',
        ].join('\n'),
      )
    }

    return parsed
  } catch (error) {
    const message =
      errorMessage(error)

    if (
      /ENOENT|no such file/i.test(
        message,
      )
    ) {
      return {
        schemaVersion: 1,
        model: MODEL,
        dimensions:
          OUTPUT_DIMENSIONALITY,
        formatVersion:
          EMBEDDING_FORMAT_VERSION,
        records: {},
      }
    }

    throw error
  }
}

async function saveStore(
  store: EmbeddingStore,
) {
  await writeFile(
    EMBEDDINGS_FILE,
    `${JSON.stringify(
      store,
      null,
      2,
    )}\n`,
    'utf8',
  )
}

function validateVector(
  chunkId: string,
  values: number[],
) {
  if (
    values.length !==
    OUTPUT_DIMENSIONALITY
  ) {
    throw new Error(
      `${chunkId}: expected ${OUTPUT_DIMENSIONALITY} dimensions, received ${values.length}.`,
    )
  }

  const invalid =
    values.filter(
      (value) =>
        !Number.isFinite(value),
    )

  if (invalid.length > 0) {
    throw new Error(
      `${chunkId}: embedding contains ${invalid.length} non-finite value(s).`,
    )
  }

  const norm =
    vectorNorm(values)

  if (
    !Number.isFinite(norm) ||
    norm === 0
  ) {
    throw new Error(
      `${chunkId}: invalid vector norm ${norm}.`,
    )
  }

  /*
   * Reduced gemini-embedding-2
   * vectors are expected to be normalized.
   *
   * Keep a small tolerance for floating
   * point representation.
   */
  if (
    norm < 0.95 ||
    norm > 1.05
  ) {
    throw new Error(
      `${chunkId}: unexpected vector norm ${norm.toFixed(
        6,
      )}.`,
    )
  }

  return norm
}

function cacheMatches(
  record: EmbeddingRecord,
  chunk: RawChunk,
) {
  const prepared =
    embeddingInput(chunk)

  return (
    record.chunkId ===
      chunk.chunkId &&
    record.contentSha256 ===
      chunk.sha256 &&
    record.embeddingInputSha256 ===
      sha256(prepared) &&
    record.model === MODEL &&
    record.dimensions ===
      OUTPUT_DIMENSIONALITY &&
    record.formatVersion ===
      EMBEDDING_FORMAT_VERSION &&
    Array.isArray(
      record.embedding,
    ) &&
    record.embedding.length ===
      OUTPUT_DIMENSIONALITY &&
    record.embedding.every(
      Number.isFinite,
    )
  )
}

async function requestEmbedding(
  ai: GoogleGenAI,
  chunk: RawChunk,
) {
  const prepared =
    embeddingInput(chunk)

  let lastError: unknown

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await ai.models.embedContent({
          model: MODEL,

          /*
           * ONE text input per request.
           *
           * This avoids gemini-embedding-2
           * aggregation semantics for
           * multi-input requests.
           */
          contents: prepared,

          config: {
            outputDimensionality:
              OUTPUT_DIMENSIONALITY,
          },
        })

      const embeddings =
        response.embeddings

      if (
        !embeddings ||
        embeddings.length !== 1
      ) {
        throw new Error(
          `${chunk.chunkId}: expected exactly 1 embedding, received ${
            embeddings?.length ?? 0
          }.`,
        )
      }

      const values =
        embeddings[0]?.values

      if (!values) {
        throw new Error(
          `${chunk.chunkId}: Gemini returned no embedding values.`,
        )
      }

      const norm =
        validateVector(
          chunk.chunkId,
          values,
        )

      return {
        values,
        norm,
        prepared,
      }
    } catch (error) {
      lastError = error

      if (
        !retryable(error) ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error
      }

      const seconds =
        attempt === 1
          ? 15
          : attempt === 2
            ? 30
            : 60

      console.log(
        `      temporary API/network error`,
      )

      console.log(
        `      retry ${attempt}/${MAX_ATTEMPTS} in ${seconds}s`,
      )

      await sleep(
        seconds * 1000,
      )
    }
  }

  throw lastError
}

async function loadAllChunks() {
  const chunks: RawChunk[] = []

  for (
    const fileName
    of LESSON_FILES
  ) {
    const fullPath =
      path.join(
        INPUT_DIRECTORY,
        fileName,
      )

    const raw =
      await readFile(
        fullPath,
        'utf8',
      )

    const lesson =
      JSON.parse(
        raw,
      ) as LessonIndex

    if (
      !Array.isArray(
        lesson.chunks,
      ) ||
      lesson.chunks.length === 0
    ) {
      throw new Error(
        `${fileName}: no chunks found.`,
      )
    }

    chunks.push(
      ...lesson.chunks,
    )
  }

  return chunks
}

function validateRawCorpus(
  chunks: RawChunk[],
) {
  if (
    chunks.length !== 100
  ) {
    throw new Error(
      `Expected exactly 100 raw chunks, received ${chunks.length}.`,
    )
  }

  const ids =
    new Set<string>()

  for (const chunk of chunks) {
    if (
      ids.has(chunk.chunkId)
    ) {
      throw new Error(
        `Duplicate chunk ID: ${chunk.chunkId}`,
      )
    }

    ids.add(chunk.chunkId)

    if (
      sha256(chunk.content) !==
      chunk.sha256
    ) {
      throw new Error(
        `${chunk.chunkId}: raw content checksum mismatch.`,
      )
    }
  }
}

function validateCompletedStore(
  store: EmbeddingStore,
  chunks: RawChunk[],
) {
  for (const chunk of chunks) {
    const record =
      store.records[
        chunk.chunkId
      ]

    if (!record) {
      throw new Error(
        `Missing embedding record: ${chunk.chunkId}`,
      )
    }

    if (
      !cacheMatches(
        record,
        chunk,
      )
    ) {
      throw new Error(
        `Invalid embedding cache record: ${chunk.chunkId}`,
      )
    }

    validateVector(
      chunk.chunkId,
      record.embedding,
    )
  }

  const expectedIds =
    new Set(
      chunks.map(
        (chunk) =>
          chunk.chunkId,
      ),
    )

  const unexpected =
    Object.keys(
      store.records,
    ).filter(
      (chunkId) =>
        !expectedIds.has(
          chunkId,
        ),
    )

  if (
    unexpected.length > 0
  ) {
    throw new Error(
      [
        'Embedding cache contains unexpected chunk(s):',
        ...unexpected.map(
          (id) => `- ${id}`,
        ),
      ].join('\n'),
    )
  }
}

async function main() {
  console.log(
    '\n==========================================',
  )
  console.log(
    ' ChalkBox Textbook Embedding Builder v1',
  )
  console.log(
    '==========================================\n',
  )

  console.log(
    `Model       : ${MODEL}`,
  )
  console.log(
    `Dimensions  : ${OUTPUT_DIMENSIONALITY}`,
  )
  console.log(
    `Format      : ${EMBEDDING_FORMAT_VERSION}`,
  )
  console.log(
    'Supabase    : untouched',
  )
  console.log(
    'Expected    : 100 chunks\n',
  )

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  )

  const chunks =
    await loadAllChunks()

  validateRawCorpus(
    chunks,
  )

  console.log(
    `✓ Raw corpus validated: ${chunks.length}/100 chunks\n`,
  )

  const store =
    await loadStore()

  const ai =
    new GoogleGenAI({
      apiKey:
        GEMINI_API_KEY,
    })

  let reused = 0
  let generated = 0

  const lessonStats =
    new Map<
      string,
      ManifestLesson
    >()

  for (const chunk of chunks) {
    if (
      !lessonStats.has(
        chunk.lessonKey,
      )
    ) {
      lessonStats.set(
        chunk.lessonKey,
        {
          lessonKey:
            chunk.lessonKey,
          title:
            chunk.lessonTitle,
          chunks: 0,
          embedded: 0,
        },
      )
    }

    const stat =
      lessonStats.get(
        chunk.lessonKey,
      )!

    stat.chunks += 1
  }

  for (
    let index = 0;
    index <
    chunks.length;
    index += 1
  ) {
    const chunk =
      chunks[index]

    const existing =
      store.records[
        chunk.chunkId
      ]

    console.log(
      `[${String(
        index + 1,
      ).padStart(
        3,
        '0',
      )}/${chunks.length}] ${chunk.lessonTitle} · page ${chunk.pageStart}`,
    )

    if (
      existing &&
      cacheMatches(
        existing,
        chunk,
      )
    ) {
      validateVector(
        chunk.chunkId,
        existing.embedding,
      )

      reused += 1

      lessonStats.get(
        chunk.lessonKey,
      )!.embedded += 1

      console.log(
        `      ✓ cached ${chunk.chunkId}`,
      )

      continue
    }

    const result =
      await requestEmbedding(
        ai,
        chunk,
      )

    store.records[
      chunk.chunkId
    ] = {
      schemaVersion: 1,

      chunkId:
        chunk.chunkId,

      lessonKey:
        chunk.lessonKey,

      classLevel:
        chunk.classLevel,

      subject:
        chunk.subject,

      lessonTitle:
        chunk.lessonTitle,

      sourceFileName:
        chunk.sourceFileName,

      chunkIndex:
        chunk.chunkIndex,

      pageStart:
        chunk.pageStart,

      pageEnd:
        chunk.pageEnd,

      contentSha256:
        chunk.sha256,

      embeddingInputSha256:
        sha256(
          result.prepared,
        ),

      model: MODEL,

      dimensions:
        OUTPUT_DIMENSIONALITY,

      formatVersion:
        EMBEDDING_FORMAT_VERSION,

      embedding:
        result.values,

      createdAt:
        new Date().toISOString(),
    }

    /*
     * Save after EVERY successful chunk.
     *
     * If request 73/100 fails,
     * requests 1-72 are preserved.
     */
    await saveStore(
      store,
    )

    generated += 1

    lessonStats.get(
      chunk.lessonKey,
    )!.embedded += 1

    console.log(
      `      ✓ embedded · norm ${result.norm.toFixed(
        6,
      )}`,
    )

    if (
      index <
      chunks.length - 1
    ) {
      await sleep(
        REQUEST_DELAY_MS,
      )
    }
  }

  validateCompletedStore(
    store,
    chunks,
  )

  const lessons =
    [...lessonStats.values()]

  for (
    const lesson
    of lessons
  ) {
    if (
      lesson.embedded !==
      lesson.chunks
    ) {
      throw new Error(
        `${lesson.title}: only ${lesson.embedded}/${lesson.chunks} chunks embedded.`,
      )
    }
  }

  const manifest = {
    schemaVersion: 1,

    generatedAt:
      new Date().toISOString(),

    model: MODEL,

    dimensions:
      OUTPUT_DIMENSIONALITY,

    formatVersion:
      EMBEDDING_FORMAT_VERSION,

    rawPipeline:
      'raw-page-v1',

    chunkCount:
      chunks.length,

    embeddedCount:
      Object.keys(
        store.records,
      ).length,

    reusedThisRun:
      reused,

    generatedThisRun:
      generated,

    lessons,
  }

  await writeFile(
    MANIFEST_FILE,
    `${JSON.stringify(
      manifest,
      null,
      2,
    )}\n`,
    'utf8',
  )

  console.log(
    '\n==========================================',
  )
  console.log(
    ' Textbook Embeddings Complete',
  )
  console.log(
    '==========================================\n',
  )

  console.log(
    `Raw chunks       : ${chunks.length}/100`,
  )
  console.log(
    `Embedded chunks  : ${Object.keys(
      store.records,
    ).length}/100`,
  )
  console.log(
    `Dimensions       : ${OUTPUT_DIMENSIONALITY}`,
  )
  console.log(
    `Model            : ${MODEL}`,
  )
  console.log(
    `Generated now    : ${generated}`,
  )
  console.log(
    `Reused cache     : ${reused}`,
  )
  console.log(
    'Finite vectors   : YES',
  )
  console.log(
    'Supabase writes  : 0',
  )

  console.log(
    '\nPer lesson:',
  )

  for (
    const lesson
    of lessons
  ) {
    console.log(
      `✓ ${lesson.title}: ${lesson.embedded}/${lesson.chunks}`,
    )
  }

  console.log(
    '\nNext gate: fix Class 10 lesson filenames in Supabase, then load these 100 vectors.\n',
  )
}

main().catch(
  (error: unknown) => {
    console.error(
      '\n==========================================',
    )
    console.error(
      ' Textbook Embedding Build FAILED',
    )
    console.error(
      '==========================================\n',
    )

    console.error(
      errorMessage(error),
    )

    console.error(
      '\nAlready completed vectors remain cached.',
    )
    console.error(
      'Rerun the same command to resume.',
    )
    console.error(
      'Do not delete data/rag-embeddings-v1.\n',
    )

    process.exitCode = 1
  },
)
