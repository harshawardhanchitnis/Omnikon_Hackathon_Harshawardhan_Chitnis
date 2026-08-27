import { createHash } from 'node:crypto'
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

/* ============================================================
   CHALKBOX — SUPABASE TEXTBOOK SEED GENERATOR v2

   Generates ONE SQL seed per lesson so Supabase SQL Editor
   does not reject the corpus because the query is too large.

   INPUT
     data/rag-index-v1/*.json
     data/rag-embeddings-v1/embeddings.json

   OUTPUT
     data/supabase-seed/
       01-class-8-chemical-effects-electric-current.sql
       02-class-8-materials-metals-non-metals.sql
       03-class-9-force-laws-motion.sql
       04-class-9-work-energy.sql
       05-class-10-life-processes.sql
       06-class-10-electricity.sql
       99-verify-textbook-corpus.sql

   DOES NOT:
   - call Gemini
   - modify embeddings
   - connect to Supabase
   - require private Supabase credentials
   ============================================================ */

const MODEL = 'gemini-embedding-2'
const DIMENSIONS = 768
const FORMAT_VERSION = 'retrieval-document-v1'

const ROOT = process.cwd()

const RAW_DIRECTORY = path.resolve(
  ROOT,
  'data',
  'rag-index-v1',
)

const EMBEDDING_FILE = path.resolve(
  ROOT,
  'data',
  'rag-embeddings-v1',
  'embeddings.json',
)

const OUTPUT_DIRECTORY = path.resolve(
  ROOT,
  'data',
  'supabase-seed',
)

type LessonDefinition = {
  order: number
  lessonKey: string
  title: string
  fileName: string
  expectedChunks: number
  firstPage: number
  lastPage: number
}

const LESSONS: LessonDefinition[] = [
  {
    order: 1,
    lessonKey:
      'class-8-chemical-effects-electric-current',
    title:
      'Chemical Effects of Electric Current',
    fileName:
      'class-8-chemical-effects-electric-current.json',
    expectedChunks: 12,
    firstPage: 1,
    lastPage: 12,
  },

  {
    order: 2,
    lessonKey:
      'class-8-materials-metals-non-metals',
    title:
      'Materials: Metals and Non-Metals',
    fileName:
      'class-8-materials-metals-non-metals.json',
    expectedChunks: 12,
    firstPage: 13,
    lastPage: 24,
  },

  {
    order: 3,
    lessonKey:
      'class-9-force-laws-motion',
    title:
      'Force and Laws of Motion',
    fileName:
      'class-9-force-laws-motion.json',
    expectedChunks: 17,
    firstPage: 1,
    lastPage: 17,
  },

  {
    order: 4,
    lessonKey:
      'class-9-work-energy',
    title:
      'Work and Energy',
    fileName:
      'class-9-work-energy.json',
    expectedChunks: 14,
    firstPage: 18,
    lastPage: 31,
  },

  {
    order: 5,
    lessonKey:
      'class-10-life-processes',
    title:
      'Life Processes',
    fileName:
      'class-10-life-processes.json',
    expectedChunks: 21,
    firstPage: 1,
    lastPage: 21,
  },

  {
    order: 6,
    lessonKey:
      'class-10-electricity',
    title:
      'Electricity',
    fileName:
      'class-10-electricity.json',
    expectedChunks: 24,
    firstPage: 1,
    lastPage: 24,
  },
]

type RawChunk = {
  schemaVersion: number

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

  sectionTitle: string | null

  charCount: number
  approxTokenCount: number

  sha256: string

  metadata?: Record<string, unknown>
}

type LessonIndex = {
  schemaVersion: number
  pipeline: string
  chunks: RawChunk[]
}

type EmbeddingRecord = {
  schemaVersion: number

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
  schemaVersion: number

  model: string
  dimensions: number
  formatVersion: string

  records: Record<
    string,
    EmbeddingRecord
  >
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

function sqlString(
  value: string,
) {
  return `'${value.replace(
    /'/g,
    "''",
  )}'`
}

function sqlNullableString(
  value: string | null,
) {
  return value === null
    ? 'NULL'
    : sqlString(value)
}

function vectorLiteral(
  values: number[],
) {
  return (
    sqlString(
      `[${values.join(',')}]`,
    ) + '::vector'
  )
}

function validateVector(
  chunkId: string,
  vector: number[],
) {
  if (
    !Array.isArray(vector) ||
    vector.length !==
      DIMENSIONS
  ) {
    throw new Error(
      `${chunkId}: expected ${DIMENSIONS} embedding dimensions.`,
    )
  }

  if (
    !vector.every(
      Number.isFinite,
    )
  ) {
    throw new Error(
      `${chunkId}: embedding contains non-finite values.`,
    )
  }
}

async function loadEmbeddings() {
  const raw =
    await readFile(
      EMBEDDING_FILE,
      'utf8',
    )

  const store =
    JSON.parse(
      raw,
    ) as EmbeddingStore

  if (
    store.model !== MODEL
  ) {
    throw new Error(
      `Expected embedding model ${MODEL}; found ${store.model}.`,
    )
  }

  if (
    store.dimensions !==
    DIMENSIONS
  ) {
    throw new Error(
      `Expected ${DIMENSIONS} dimensions; found ${store.dimensions}.`,
    )
  }

  if (
    store.formatVersion !==
    FORMAT_VERSION
  ) {
    throw new Error(
      `Expected format ${FORMAT_VERSION}; found ${store.formatVersion}.`,
    )
  }

  if (
    Object.keys(
      store.records,
    ).length !== 100
  ) {
    throw new Error(
      `Expected exactly 100 embedding records.`,
    )
  }

  return store
}

async function loadLesson(
  lesson: LessonDefinition,
) {
  const filePath =
    path.join(
      RAW_DIRECTORY,
      lesson.fileName,
    )

  const raw =
    await readFile(
      filePath,
      'utf8',
    )

  const parsed =
    JSON.parse(
      raw,
    ) as LessonIndex

  if (
    !Array.isArray(
      parsed.chunks,
    )
  ) {
    throw new Error(
      `${lesson.title}: chunks array missing.`,
    )
  }

  if (
    parsed.chunks.length !==
    lesson.expectedChunks
  ) {
    throw new Error(
      `${lesson.title}: expected ${lesson.expectedChunks} chunks, found ${parsed.chunks.length}.`,
    )
  }

  return parsed.chunks
}

function validateLesson(
  lesson: LessonDefinition,
  chunks: RawChunk[],
  embeddings: EmbeddingStore,
) {
  const seenIndexes =
    new Set<number>()

  for (
    const chunk
    of chunks
  ) {
    if (
      chunk.lessonKey !==
      lesson.lessonKey
    ) {
      throw new Error(
        `${chunk.chunkId}: wrong lesson key.`,
      )
    }

    if (
      chunk.pageStart <
        lesson.firstPage ||
      chunk.pageEnd >
        lesson.lastPage
    ) {
      throw new Error(
        `${chunk.chunkId}: page provenance outside lesson range.`,
      )
    }

    if (
      sha256(
        chunk.content,
      ) !== chunk.sha256
    ) {
      throw new Error(
        `${chunk.chunkId}: raw content checksum mismatch.`,
      )
    }

    if (
      seenIndexes.has(
        chunk.chunkIndex,
      )
    ) {
      throw new Error(
        `${lesson.title}: duplicate chunk index ${chunk.chunkIndex}.`,
      )
    }

    seenIndexes.add(
      chunk.chunkIndex,
    )

    const record =
      embeddings.records[
        chunk.chunkId
      ]

    if (!record) {
      throw new Error(
        `${chunk.chunkId}: embedding missing.`,
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

    if (
      record.chunkIndex !==
      chunk.chunkIndex
    ) {
      throw new Error(
        `${chunk.chunkId}: embedding chunk-index mismatch.`,
      )
    }

    if (
      record.pageStart !==
        chunk.pageStart ||
      record.pageEnd !==
        chunk.pageEnd
    ) {
      throw new Error(
        `${chunk.chunkId}: embedding provenance mismatch.`,
      )
    }

    if (
      record.contentSha256 !==
      chunk.sha256
    ) {
      throw new Error(
        `${chunk.chunkId}: embedding/content checksum mismatch.`,
      )
    }

    const expectedInputHash =
      sha256(
        embeddingInput(
          chunk,
        ),
      )

    if (
      record.embeddingInputSha256 !==
      expectedInputHash
    ) {
      throw new Error(
        `${chunk.chunkId}: embedding-input checksum mismatch.`,
      )
    }

    if (
      record.model !== MODEL ||
      record.dimensions !==
        DIMENSIONS ||
      record.formatVersion !==
        FORMAT_VERSION
    ) {
      throw new Error(
        `${chunk.chunkId}: embedding metadata mismatch.`,
      )
    }

    validateVector(
      chunk.chunkId,
      record.embedding,
    )
  }

  for (
    let index = 0;
    index <
    lesson.expectedChunks;
    index += 1
  ) {
    if (
      !seenIndexes.has(index)
    ) {
      throw new Error(
        `${lesson.title}: missing chunk index ${index}.`,
      )
    }
  }
}

function metadataJson(
  chunk: RawChunk,
  record: EmbeddingRecord,
) {
  return JSON.stringify({
    pipeline:
      'raw-page-v1',

    chunkId:
      chunk.chunkId,

    sourceFileName:
      chunk.sourceFileName,

    contentSha256:
      chunk.sha256,

    embeddingModel:
      record.model,

    embeddingDimensions:
      record.dimensions,

    embeddingFormat:
      record.formatVersion,
  })
}

function valuesRow(
  chunk: RawChunk,
  record: EmbeddingRecord,
) {
  return [
    '(',

    String(
      chunk.chunkIndex,
    ),

    ', ',

    sqlString(
      chunk.content,
    ),

    ', ',

    String(
      chunk.pageStart,
    ),

    ', ',

    String(
      chunk.pageEnd,
    ),

    ', ',

    sqlNullableString(
      chunk.sectionTitle,
    ),

    ', ',

    String(
      chunk.approxTokenCount,
    ),

    ', ',

    `${sqlString(
      metadataJson(
        chunk,
        record,
      ),
    )}::jsonb`,

    ', ',

    vectorLiteral(
      record.embedding,
    ),

    ')',
  ].join('')
}

function buildLessonSql(
  lesson: LessonDefinition,
  chunks: RawChunk[],
  embeddings: EmbeddingStore,
) {
  const ordered =
    [...chunks].sort(
      (left, right) =>
        left.chunkIndex -
        right.chunkIndex,
    )

  const rows =
    ordered
      .map((chunk) =>
        valuesRow(
          chunk,
          embeddings.records[
            chunk.chunkId
          ],
        ),
      )
      .join(',\n')

  return `-- ============================================================
-- ChalkBox textbook seed
-- ${lesson.title}
--
-- Lesson:
--   ${lesson.lessonKey}
--
-- Expected:
--   ${lesson.expectedChunks} chunks
--   pages ${lesson.firstPage}-${lesson.lastPage}
--   ${DIMENSIONS}-dimensional Gemini embeddings
--
-- Safe to rerun:
-- only THIS lesson's previous chunks are replaced.
-- ============================================================

begin;


-- ============================================================
-- 1. VERIFY LESSON EXISTS
-- ============================================================

do $$
declare
  lesson_count integer;
begin

  select count(*)
  into lesson_count

  from public.textbook_lessons

  where lesson_key =
    ${sqlString(
      lesson.lessonKey,
    )};

  if lesson_count <> 1 then

    raise exception
      'Expected exactly one textbook_lessons row for ${lesson.lessonKey}; found %',
      lesson_count;

  end if;

end
$$;


-- ============================================================
-- 2. REMOVE ONLY THIS LESSON'S OLD CHUNKS
-- ============================================================

delete from public.textbook_chunks

where lesson_id = (

  select id

  from public.textbook_lessons

  where lesson_key =
    ${sqlString(
      lesson.lessonKey,
    )}

);


-- ============================================================
-- 3. INSERT VALIDATED CHUNKS
-- ============================================================

with seed (
  chunk_index,
  content,
  page_start,
  page_end,
  section_title,
  token_count,
  metadata,
  embedding
) as (

  values

${rows}

)

insert into public.textbook_chunks (
  lesson_id,
  chunk_index,
  content,
  page_start,
  page_end,
  section_title,
  token_count,
  metadata,
  embedding
)

select

  tl.id,

  seed.chunk_index,

  seed.content,

  seed.page_start,

  seed.page_end,

  seed.section_title,

  seed.token_count,

  seed.metadata,

  seed.embedding

from seed

cross join public.textbook_lessons tl

where tl.lesson_key =
  ${sqlString(
    lesson.lessonKey,
  )}

order by
  seed.chunk_index;


-- ============================================================
-- 4. STRICT VERIFICATION
-- ============================================================

do $$
declare

  stored_count integer;

  embedded_count integer;

  first_page integer;

  last_page integer;

begin

  select

    count(tc.id)::integer,

    count(tc.embedding)::integer,

    min(tc.page_start),

    max(tc.page_end)

  into

    stored_count,

    embedded_count,

    first_page,

    last_page

  from public.textbook_chunks tc

  join public.textbook_lessons tl
    on tl.id =
       tc.lesson_id

  where tl.lesson_key =
    ${sqlString(
      lesson.lessonKey,
    )};

  if stored_count <>
    ${lesson.expectedChunks}
  then

    raise exception
      '${lesson.lessonKey}: expected ${lesson.expectedChunks} chunks, found %',
      stored_count;

  end if;

  if embedded_count <>
    ${lesson.expectedChunks}
  then

    raise exception
      '${lesson.lessonKey}: expected ${lesson.expectedChunks} embeddings, found %',
      embedded_count;

  end if;

  if first_page <>
    ${lesson.firstPage}
  then

    raise exception
      '${lesson.lessonKey}: expected first page ${lesson.firstPage}, found %',
      first_page;

  end if;

  if last_page <>
    ${lesson.lastPage}
  then

    raise exception
      '${lesson.lessonKey}: expected last page ${lesson.lastPage}, found %',
      last_page;

  end if;

end
$$;


commit;


-- ============================================================
-- 5. RESULT
-- ============================================================

select

  tl.lesson_key,

  tl.title,

  count(tc.id)::integer
    as chunk_count,

  min(tc.page_start)
    as first_page,

  max(tc.page_end)
    as last_page,

  count(tc.embedding)::integer
    as embedded_chunks

from public.textbook_lessons tl

join public.textbook_chunks tc
  on tc.lesson_id =
     tl.id

where tl.lesson_key =
  ${sqlString(
    lesson.lessonKey,
  )}

group by

  tl.lesson_key,

  tl.title;
`
}

function buildVerificationSql() {
  const lessonKeys =
    LESSONS.map(
      (lesson) =>
        sqlString(
          lesson.lessonKey,
        ),
    ).join(',\n    ')

  return `-- ============================================================
-- ChalkBox
-- Final textbook corpus verification
-- ============================================================

select

  tl.lesson_key,

  tl.title,

  count(tc.id)::integer
    as chunk_count,

  min(tc.page_start)
    as first_page,

  max(tc.page_end)
    as last_page,

  count(tc.embedding)::integer
    as embedded_chunks

from public.textbook_lessons tl

left join public.textbook_chunks tc
  on tc.lesson_id =
     tl.id

where tl.lesson_key in (
    ${lessonKeys}
)

group by

  tl.lesson_key,

  tl.title,

  tl.class_level

order by

  tl.class_level,

  tl.lesson_key;


-- Total invariant

select

  count(tc.id)::integer
    as total_chunks,

  count(tc.embedding)::integer
    as total_embeddings

from public.textbook_chunks tc

join public.textbook_lessons tl
  on tl.id =
     tc.lesson_id

where tl.lesson_key in (
    ${lessonKeys}
);
`
}

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Supabase Seed Generator v2',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'Mode: one transaction-safe SQL file per lesson\n',
  )

  const embeddings =
    await loadEmbeddings()

  await rm(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
      force: true,
    },
  )

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  )

  let totalChunks = 0

  for (
    const lesson
    of LESSONS
  ) {
    console.log(
      `[${lesson.order}/6] ${lesson.title}`,
    )

    const chunks =
      await loadLesson(
        lesson,
      )

    validateLesson(
      lesson,
      chunks,
      embeddings,
    )

    const sql =
      buildLessonSql(
        lesson,
        chunks,
        embeddings,
      )

    const prefix =
      String(
        lesson.order,
      ).padStart(
        2,
        '0',
      )

    const outputName =
      `${prefix}-${lesson.lessonKey}.sql`

    const outputPath =
      path.join(
        OUTPUT_DIRECTORY,
        outputName,
      )

    await writeFile(
      outputPath,
      sql,
      'utf8',
    )

    const sizeKb =
      Buffer.byteLength(
        sql,
        'utf8',
      ) /
      1024

    console.log(
      `      ✓ ${chunks.length} chunks`,
    )

    console.log(
      `      ✓ ${sizeKb.toFixed(
        1,
      )} KB`,
    )

    console.log(
      `      ✓ ${outputName}`,
    )

    totalChunks +=
      chunks.length
  }

  const verification =
    buildVerificationSql()

  await writeFile(
    path.join(
      OUTPUT_DIRECTORY,
      '99-verify-textbook-corpus.sql',
    ),
    verification,
    'utf8',
  )

  if (
    totalChunks !== 100
  ) {
    throw new Error(
      `Expected exactly 100 chunks; generated ${totalChunks}.`,
    )
  }

  console.log(
    '\n==========================================',
  )

  console.log(
    ' Split Supabase Seeds Ready',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'Lessons       : 6/6',
  )

  console.log(
    `Chunks        : ${totalChunks}/100`,
  )

  console.log(
    'Embeddings    : 100/100',
  )

  console.log(
    `Dimensions    : ${DIMENSIONS}`,
  )

  console.log(
    'Supabase      : untouched',
  )

  console.log(
    '\nOutput directory:',
  )

  console.log(
    'data/supabase-seed/',
  )

  console.log(
    '\nRun lesson files 01 → 06 in order.',
  )

  console.log(
    'Then run 99-verify-textbook-corpus.sql.\n',
  )
}

main().catch(
  (error: unknown) => {
    console.error(
      '\n==========================================',
    )

    console.error(
      ' Split Seed Generation FAILED',
    )

    console.error(
      '==========================================\n',
    )

    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    )

    process.exitCode = 1
  },
)