import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'

import {
  createHash,
} from 'node:crypto'

import path from 'node:path'
import process from 'node:process'

/* ============================================================
   CHALKBOX — FULL CHAPTER CONTEXT BUILDER v1

   PURPOSE

   Full lesson generation MUST NOT use Top-K RAG.

   Instead:

   selected lesson
      ↓
   ALL source pages
      ↓
   exact source order
      ↓
   page provenance retained
      ↓
   visual-candidate pages identified
      ↓
   generation-ready chapter context

   NO Gemini calls.
   NO embeddings.
   NO Supabase writes.
   ============================================================ */

const ROOT =
  process.cwd()

const INPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'rag-index-v1',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'full-chapter-context-v1',
  )

/* ============================================================
   LESSON EXPECTATIONS
   ============================================================ */

type LessonDefinition = {
  lessonKey: string
  fileName: string
  classLevel: number
  subject: string
  title: string
  expectedChunks: number
  firstPage: number
  lastPage: number
}

const LESSONS:
  LessonDefinition[] = [
  {
    lessonKey:
      'class-8-chemical-effects-electric-current',

    fileName:
      'class-8-chemical-effects-electric-current.json',

    classLevel: 8,

    subject:
      'Science',

    title:
      'Chemical Effects of Electric Current',

    expectedChunks: 12,

    firstPage: 1,

    lastPage: 12,
  },

  {
    lessonKey:
      'class-8-materials-metals-non-metals',

    fileName:
      'class-8-materials-metals-non-metals.json',

    classLevel: 8,

    subject:
      'Science',

    title:
      'Materials: Metals and Non-Metals',

    expectedChunks: 12,

    firstPage: 13,

    lastPage: 24,
  },

  {
    lessonKey:
      'class-9-force-laws-motion',

    fileName:
      'class-9-force-laws-motion.json',

    classLevel: 9,

    subject:
      'Science',

    title:
      'Force and Laws of Motion',

    expectedChunks: 17,

    firstPage: 1,

    lastPage: 17,
  },

  {
    lessonKey:
      'class-9-work-energy',

    fileName:
      'class-9-work-energy.json',

    classLevel: 9,

    subject:
      'Science',

    title:
      'Work and Energy',

    expectedChunks: 14,

    firstPage: 18,

    lastPage: 31,
  },

  {
    lessonKey:
      'class-10-life-processes',

    fileName:
      'class-10-life-processes.json',

    classLevel: 10,

    subject:
      'Science',

    title:
      'Life Processes',

    expectedChunks: 21,

    firstPage: 1,

    lastPage: 21,
  },

  {
    lessonKey:
      'class-10-electricity',

    fileName:
      'class-10-electricity.json',

    classLevel: 10,

    subject:
      'Science',

    title:
      'Electricity',

    expectedChunks: 24,

    firstPage: 1,

    lastPage: 24,
  },
]

/* ============================================================
   TYPES
   ============================================================ */

type RawChunk = {
  chunkId: string
  lessonKey: string
  lessonTitle: string
  sourceFileName: string
  chunkIndex: number
  content: string
  pageStart: number
  pageEnd: number
  charCount?: number
  approxTokenCount?: number
  sha256: string
}

type RawLesson = {
  schemaVersion?: number
  chunks: RawChunk[]
}

type PageContext = {
  pageNumber: number

  visualCandidate:
    boolean

  visualSignals:
    string[]

  chunkIds:
    string[]

  content:
    string
}

/* ============================================================
   VISUAL-CANDIDATE DETECTION

   This does NOT claim the page definitely requires image
   processing.

   It only identifies pages we should inspect/render when
   visual grounding is implemented.
   ============================================================ */

type VisualRule = {
  label: string
  pattern: RegExp
}

const VISUAL_RULES:
  VisualRule[] = [
  {
    label:
      'figure-reference',

    pattern:
      /\b(?:figure|fig\.)\s*\d+(?:\.\d+)?\b/i,
  },

  {
    label:
      'diagram-reference',

    pattern:
      /\b(?:diagram|labelled diagram|labeled diagram)\b/i,
  },

  {
    label:
      'shown-in-figure',

    pattern:
      /\b(?:shown|illustrated|depicted)\s+in\s+(?:the\s+)?(?:figure|fig\.)\b/i,
  },

  {
    label:
      'circuit-visual',

    pattern:
      /\b(?:circuit diagram|electric circuit diagram)\b/i,
  },

  {
    label:
      'draw-instruction',

    pattern:
      /\bdraw\s+(?:a|the|an)\s+(?:labelled\s+|labeled\s+)?(?:diagram|figure|circuit)\b/i,
  },

  {
    label:
      'table-reference',

    pattern:
      /\btable\s+\d+(?:\.\d+)?\b/i,
  },
]

function visualSignals(
  content: string,
) {
  return VISUAL_RULES
    .filter(
      (
        rule,
      ) =>
        rule.pattern.test(
          content,
        ),
    )
    .map(
      (
        rule,
      ) =>
        rule.label,
    )
}

/* ============================================================
   HELPERS
   ============================================================ */

function sha256(
  value: string,
) {
  return createHash(
    'sha256',
  )
    .update(
      value,
      'utf8',
    )
    .digest(
      'hex',
    )
}

function expectedPages(
  lesson:
    LessonDefinition,
) {
  const result:
    number[] = []

  for (
    let page =
      lesson.firstPage;
    page <=
      lesson.lastPage;
    page += 1
  ) {
    result.push(
      page,
    )
  }

  return result
}

function arraysEqual(
  left: number[],
  right: number[],
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

/* ============================================================
   LOAD + VALIDATE ONE LESSON
   ============================================================ */

async function loadLesson(
  definition:
    LessonDefinition,
) {
  const fullPath =
    path.join(
      INPUT_DIRECTORY,
      definition.fileName,
    )

  const text =
    await readFile(
      fullPath,
      'utf8',
    )

  const lesson =
    JSON.parse(
      text,
    ) as RawLesson

  if (
    !Array.isArray(
      lesson.chunks,
    )
  ) {
    throw new Error(
      `${definition.lessonKey}: chunks array missing.`,
    )
  }

  if (
    lesson.chunks.length !==
    definition.expectedChunks
  ) {
    throw new Error(
      `${definition.lessonKey}: expected ${definition.expectedChunks} chunks, found ${lesson.chunks.length}.`,
    )
  }

  for (
    const chunk
    of lesson.chunks
  ) {
    if (
      chunk.lessonKey !==
      definition.lessonKey
    ) {
      throw new Error(
        `${chunk.chunkId}: incorrect lessonKey.`,
      )
    }

    if (
      !chunk.content.trim()
    ) {
      throw new Error(
        `${chunk.chunkId}: empty content.`,
      )
    }

    if (
      !chunk.sha256
    ) {
      throw new Error(
        `${chunk.chunkId}: missing source checksum.`,
      )
    }

    if (
      sha256(
        chunk.content,
      ) !==
      chunk.sha256
    ) {
      throw new Error(
        `${chunk.chunkId}: source checksum mismatch.`,
      )
    }
  }

  return lesson.chunks
}

/* ============================================================
   PAGE GROUPING
   ============================================================ */

function buildPages(
  definition:
    LessonDefinition,
  chunks:
    RawChunk[],
) {
  const orderedChunks =
    [...chunks]
      .sort(
        (
          left,
          right,
        ) => {
          if (
            left.pageStart !==
            right.pageStart
          ) {
            return (
              left.pageStart -
              right.pageStart
            )
          }

          return (
            left.chunkIndex -
            right.chunkIndex
          )
        },
      )

  const pageMap =
    new Map<
      number,
      RawChunk[]
    >()

  for (
    const chunk
    of orderedChunks
  ) {
    const existing =
      pageMap.get(
        chunk.pageStart,
      ) ?? []

    existing.push(
      chunk,
    )

    pageMap.set(
      chunk.pageStart,
      existing,
    )
  }

  const actualPages =
    [...pageMap.keys()]
      .sort(
        (
          left,
          right,
        ) =>
          left - right,
      )

  const requiredPages =
    expectedPages(
      definition,
    )

  if (
    !arraysEqual(
      actualPages,
      requiredPages,
    )
  ) {
    throw new Error(
      [
        `${definition.lessonKey}: page coverage mismatch.`,
        `Expected: ${requiredPages.join(', ')}`,
        `Actual:   ${actualPages.join(', ')}`,
      ].join('\n'),
    )
  }

  const pages:
    PageContext[] = []

  for (
    const pageNumber
    of actualPages
  ) {
    const pageChunks =
      pageMap.get(
        pageNumber,
      ) ?? []

    const content =
      pageChunks
        .map(
          (
            chunk,
          ) =>
            chunk.content.trim(),
        )
        .join(
          '\n\n',
        )
        .trim()

    const signals =
      visualSignals(
        content,
      )

    pages.push({
      pageNumber,

      visualCandidate:
        signals.length > 0,

      visualSignals:
        signals,

      chunkIds:
        pageChunks.map(
          (
            chunk,
          ) =>
            chunk.chunkId,
        ),

      content,
    })
  }

  return pages
}

/* ============================================================
   GENERATION CONTEXT TEXT

   Explicit page delimiters are important.

   Gemini must always be able to distinguish:
   - page boundaries
   - provenance
   - exact source order
   ============================================================ */

function buildContextText(
  definition:
    LessonDefinition,
  pages:
    PageContext[],
) {
  return pages
    .map(
      (
        page,
      ) => `
============================================================
TEXTBOOK SOURCE PAGE ${page.pageNumber}
Lesson: ${definition.title}
Lesson key: ${definition.lessonKey}
============================================================

${page.content}
`.trim(),
    )
    .join(
      '\n\n',
    )
}

/* ============================================================
   PROCESS ONE LESSON
   ============================================================ */

async function processLesson(
  definition:
    LessonDefinition,
) {
  const chunks =
    await loadLesson(
      definition,
    )

  const pages =
    buildPages(
      definition,
      chunks,
    )

  const contextText =
    buildContextText(
      definition,
      pages,
    )

  const visualCandidatePages =
    pages
      .filter(
        (
          page,
        ) =>
          page.visualCandidate,
      )
      .map(
        (
          page,
        ) => ({
          pageNumber:
            page.pageNumber,

          signals:
            page.visualSignals,
        }),
      )

  const approxTokenCount =
    chunks.reduce(
      (
        total,
        chunk,
      ) =>
        total +
        (
          chunk.approxTokenCount ??
          Math.ceil(
            chunk.content.length /
              4,
          )
        ),
      0,
    )

  const sourceFileName =
    chunks[0]
      ?.sourceFileName

  if (!sourceFileName) {
    throw new Error(
      `${definition.lessonKey}: source filename missing.`,
    )
  }

  const sourceOrderChecksum =
    sha256(
      chunks
        .sort(
          (
            left,
            right,
          ) =>
            left.chunkIndex -
            right.chunkIndex,
        )
        .map(
          (
            chunk,
          ) =>
            `${chunk.chunkId}:${chunk.sha256}`,
        )
        .join(
          '\n',
        ),
    )

  const output = {
    schemaVersion: 1,

    contextMode:
      'FULL_CHAPTER',

    lessonKey:
      definition.lessonKey,

    classLevel:
      definition.classLevel,

    subject:
      definition.subject,

    title:
      definition.title,

    sourceFileName,

    firstPage:
      definition.firstPage,

    lastPage:
      definition.lastPage,

    pageCount:
      pages.length,

    chunkCount:
      chunks.length,

    approxTokenCount,

    sourceOrderChecksum,

    visualCandidatePages,

    pages,

    contextText,
  }

  const outputPath =
    path.join(
      OUTPUT_DIRECTORY,
      `${definition.lessonKey}.json`,
    )

  await writeFile(
    outputPath,

    `${JSON.stringify(
      output,
      null,
      2,
    )}\n`,

    'utf8',
  )

  return {
    lessonKey:
      definition.lessonKey,

    pageCount:
      pages.length,

    chunkCount:
      chunks.length,

    approxTokenCount,

    visualCandidatePages:
      visualCandidatePages.map(
        (
          item,
        ) =>
          item.pageNumber,
      ),

    sourceOrderChecksum,
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
    ' ChalkBox Full Chapter Context Builder v1',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'Mode             : FULL_CHAPTER',
  )

  console.log(
    'Top-K retrieval  : DISABLED',
  )

  console.log(
    'Page order       : STRICT',
  )

  console.log(
    'Visual detection : ENABLED',
  )

  console.log(
    'Gemini calls     : 0',
  )

  console.log(
    'Supabase writes  : 0\n',
  )

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  )

  const results = []

  for (
    let index = 0;
    index <
      LESSONS.length;
    index += 1
  ) {
    const lesson =
      LESSONS[index]

    console.log(
      `[${index + 1}/${LESSONS.length}] ${lesson.title}`,
    )

    const result =
      await processLesson(
        lesson,
      )

    results.push(
      result,
    )

    console.log(
      `      ✓ pages: ${result.pageCount}`,
    )

    console.log(
      `      ✓ chunks: ${result.chunkCount}`,
    )

    console.log(
      `      ✓ approx tokens: ${result.approxTokenCount.toLocaleString(
        'en-IN',
      )}`,
    )

    console.log(
      `      ✓ visual candidates: ${
        result.visualCandidatePages.length > 0
          ? result.visualCandidatePages.join(
              ', ',
            )
          : 'none detected'
      }`,
    )

    console.log(
      '      ✓ source order validated\n',
    )
  }

  const totalPages =
    results.reduce(
      (
        total,
        result,
      ) =>
        total +
        result.pageCount,
      0,
    )

  const totalChunks =
    results.reduce(
      (
        total,
        result,
      ) =>
        total +
        result.chunkCount,
      0,
    )

  if (
    totalPages !== 100
  ) {
    throw new Error(
      `Expected 100 total pages, found ${totalPages}.`,
    )
  }

  if (
    totalChunks !== 100
  ) {
    throw new Error(
      `Expected 100 total chunks, found ${totalChunks}.`,
    )
  }

  const manifest = {
    schemaVersion: 1,

    contextMode:
      'FULL_CHAPTER',

    lessons:
      results.length,

    totalPages,

    totalChunks,

    generatedAt:
      new Date()
        .toISOString(),

    results,
  }

  await writeFile(
    path.join(
      OUTPUT_DIRECTORY,
      'manifest.json',
    ),

    `${JSON.stringify(
      manifest,
      null,
      2,
    )}\n`,

    'utf8',
  )

  console.log(
    '==========================================',
  )

  console.log(
    ' Full Chapter Context Ready',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Lessons          : ${results.length}/6`,
  )

  console.log(
    `Source pages     : ${totalPages}/100`,
  )

  console.log(
    `Source chunks    : ${totalChunks}/100`,
  )

  console.log(
    'Page order       : VERIFIED',
  )

  console.log(
    'Gemini calls     : 0',
  )

  console.log(
    'Supabase writes  : 0',
  )

  console.log(
    '\nOutput:',
  )

  console.log(
    'data/full-chapter-context-v1/\n',
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
      ' Full Chapter Context Build FAILED',
    )

    console.error(
      '==========================================\n',
    )

    console.error(
      error instanceof Error
        ? error.message
        : String(
            error,
          ),
    )

    process.exitCode = 1
  },
)