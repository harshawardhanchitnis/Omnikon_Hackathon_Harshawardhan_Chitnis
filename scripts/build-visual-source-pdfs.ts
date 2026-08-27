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

import {
  PDFDocument,
} from 'pdf-lib'

/* ============================================================
   CHALKBOX — VISUAL SOURCE PDF BUILDER v1

   PURPOSE

   Preserve the original visual information that plain PDF
   text extraction cannot represent:

   - diagrams
   - figures
   - circuit drawings
   - tables
   - spatial layout
   - labels / arrows / visual relationships

   For each seeded lesson we create an exact chapter-only PDF.

   IMPORTANT:

   ✓ original PDF page content is copied, not recreated
   ✓ canonical RAG text remains unchanged
   ✓ page provenance remains explicit
   ✓ no Gemini calls
   ✓ no Supabase writes
   ============================================================ */

const ROOT =
  process.cwd()

const TEXTBOOK_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'textbooks',
  )

const CONTEXT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'full-chapter-context-v1',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'visual-source-v1',
  )

/* ============================================================
   LESSON DEFINITIONS

   sourcePageStart/sourcePageEnd are 1-based page positions
   inside the local source PDF files.
   ============================================================ */

type LessonDefinition = {
  lessonKey: string

  title: string

  sourceFileName: string

  sourcePageStart: number

  sourcePageEnd: number
}

const LESSONS:
  LessonDefinition[] = [
  {
    lessonKey:
      'class-8-chemical-effects-electric-current',

    title:
      'Chemical Effects of Electric Current',

    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',

    sourcePageStart: 1,

    sourcePageEnd: 12,
  },

  {
    lessonKey:
      'class-8-materials-metals-non-metals',

    title:
      'Materials: Metals and Non-Metals',

    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',

    sourcePageStart: 13,

    sourcePageEnd: 24,
  },

  {
    lessonKey:
      'class-9-force-laws-motion',

    title:
      'Force and Laws of Motion',

    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',

    sourcePageStart: 1,

    sourcePageEnd: 17,
  },

  {
    lessonKey:
      'class-9-work-energy',

    title:
      'Work and Energy',

    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',

    sourcePageStart: 18,

    sourcePageEnd: 31,
  },

  {
    lessonKey:
      'class-10-life-processes',

    title:
      'Life Processes',

    sourceFileName:
      'NCERT-Class-10-Life-Processes-official.pdf',

    sourcePageStart: 1,

    sourcePageEnd: 21,
  },

  {
    lessonKey:
      'class-10-electricity',

    title:
      'Electricity',

    sourceFileName:
      'NCERT-Class-10-Electricity-official.pdf',

    sourcePageStart: 1,

    sourcePageEnd: 24,
  },
]

/* ============================================================
   TYPES
   ============================================================ */

type FullChapterContext = {
  schemaVersion: number

  contextMode: string

  lessonKey: string

  title: string

  sourceFileName: string

  firstPage: number

  lastPage: number

  pageCount: number

  chunkCount: number
}

type PageMapping = {
  chapterPage: number

  sourcePdfPage: number

  textbookPageLabel: number
}

/* ============================================================
   HELPERS
   ============================================================ */

function sha256(
  value:
    Uint8Array,
) {
  return createHash(
    'sha256',
  )
    .update(
      value,
    )
    .digest(
      'hex',
    )
}

function expectedPageCount(
  lesson:
    LessonDefinition,
) {
  return (
    lesson.sourcePageEnd -
    lesson.sourcePageStart +
    1
  )
}

function formatBytes(
  bytes: number,
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`
  }

  const kb =
    bytes /
    1024

  if (
    kb <
    1024
  ) {
    return `${kb.toFixed(
      1,
    )} KB`
  }

  return `${(
    kb /
    1024
  ).toFixed(
    2,
  )} MB`
}

/* ============================================================
   CROSS-CHECK AGAINST FULL-CHAPTER CONTEXT

   The visual representation and canonical text representation
   must describe the same lesson/page range.
   ============================================================ */

async function validateExistingContext(
  lesson:
    LessonDefinition,
) {
  const contextPath =
    path.join(
      CONTEXT_DIRECTORY,
      `${lesson.lessonKey}.json`,
    )

  const raw =
    await readFile(
      contextPath,
      'utf8',
    )

  const context =
    JSON.parse(
      raw,
    ) as FullChapterContext

  if (
    context.lessonKey !==
    lesson.lessonKey
  ) {
    throw new Error(
      `${lesson.lessonKey}: full-chapter context lessonKey mismatch.`,
    )
  }

  if (
    context.contextMode !==
    'FULL_CHAPTER'
  ) {
    throw new Error(
      `${lesson.lessonKey}: expected FULL_CHAPTER context.`,
    )
  }

  if (
    context.sourceFileName !==
    lesson.sourceFileName
  ) {
    throw new Error(
      [
        `${lesson.lessonKey}: source filename mismatch.`,
        `Context: ${context.sourceFileName}`,
        `Visual:  ${lesson.sourceFileName}`,
      ].join(
        '\n',
      ),
    )
  }

  const expected =
    expectedPageCount(
      lesson,
    )

  if (
    context.pageCount !==
    expected
  ) {
    throw new Error(
      `${lesson.lessonKey}: context has ${context.pageCount} pages; visual definition expects ${expected}.`,
    )
  }

  return context
}

/* ============================================================
   BUILD ONE CHAPTER PDF
   ============================================================ */

async function buildVisualSource(
  lesson:
    LessonDefinition,
) {
  const context =
    await validateExistingContext(
      lesson,
    )

  const sourcePath =
    path.join(
      TEXTBOOK_DIRECTORY,
      lesson.sourceFileName,
    )

  const sourceBytes =
    await readFile(
      sourcePath,
    )

  const sourcePdf =
    await PDFDocument.load(
      sourceBytes,
      {
        updateMetadata:
          false,
      },
    )

  const sourcePageCount =
    sourcePdf.getPageCount()

  if (
    lesson.sourcePageStart <
      1 ||
    lesson.sourcePageEnd >
      sourcePageCount ||
    lesson.sourcePageStart >
      lesson.sourcePageEnd
  ) {
    throw new Error(
      [
        `${lesson.lessonKey}: invalid source page range.`,
        `Requested: ${lesson.sourcePageStart}-${lesson.sourcePageEnd}`,
        `PDF pages: ${sourcePageCount}`,
      ].join(
        '\n',
      ),
    )
  }

  const outputPdf =
    await PDFDocument.create()

  /*
   * pdf-lib uses zero-based page indexes.
   */

  const sourceIndexes:
    number[] = []

  for (
    let page =
      lesson.sourcePageStart;
    page <=
      lesson.sourcePageEnd;
    page += 1
  ) {
    sourceIndexes.push(
      page - 1,
    )
  }

  const copiedPages =
    await outputPdf.copyPages(
      sourcePdf,
      sourceIndexes,
    )

  for (
    const copiedPage
    of copiedPages
  ) {
    outputPdf.addPage(
      copiedPage,
    )
  }

  const outputBytes =
    await outputPdf.save({
      useObjectStreams:
        true,
    })

  /*
   * Re-open the result as a structural integrity check.
   */

  const verifiedPdf =
    await PDFDocument.load(
      outputBytes,
      {
        updateMetadata:
          false,
      },
    )

  const actualPageCount =
    verifiedPdf.getPageCount()

  const expected =
    expectedPageCount(
      lesson,
    )

  if (
    actualPageCount !==
    expected
  ) {
    throw new Error(
      `${lesson.lessonKey}: output PDF contains ${actualPageCount} pages; expected ${expected}.`,
    )
  }

  if (
    actualPageCount !==
    context.pageCount
  ) {
    throw new Error(
      `${lesson.lessonKey}: visual/text page-count mismatch.`,
    )
  }

  const outputFileName =
    `${lesson.lessonKey}.pdf`

  const outputPath =
    path.join(
      OUTPUT_DIRECTORY,
      outputFileName,
    )

  await writeFile(
    outputPath,
    outputBytes,
  )

  /* ==========================================================
     PAGE MAPPING

     chapterPage:
       page position in generated chapter-only PDF.

     sourcePdfPage:
       page position inside the local original source PDF.

     textbookPageLabel:
       our canonical page provenance used by the RAG corpus.

     For the current prepared corpus, textbookPageLabel matches
     the page numbers already stored in textbook_chunks.
     ========================================================== */

  const pageMappings:
    PageMapping[] = []

  for (
    let offset = 0;
    offset <
      actualPageCount;
    offset += 1
  ) {
    const sourcePdfPage =
      lesson.sourcePageStart +
      offset

    pageMappings.push({
      chapterPage:
        offset + 1,

      sourcePdfPage,

      textbookPageLabel:
        sourcePdfPage,
    })
  }

  return {
    lessonKey:
      lesson.lessonKey,

    title:
      lesson.title,

    sourceFileName:
      lesson.sourceFileName,

    sourcePdfSha256:
      sha256(
        sourceBytes,
      ),

    outputFileName,

    outputSha256:
      sha256(
        outputBytes,
      ),

    sourcePageStart:
      lesson.sourcePageStart,

    sourcePageEnd:
      lesson.sourcePageEnd,

    pageCount:
      actualPageCount,

    byteSize:
      outputBytes.length,

    pageMappings,
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
    ' ChalkBox Visual Source Builder v1',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'Source           : original NCERT PDFs',
  )

  console.log(
    'Method           : lossless PDF page copy',
  )

  console.log(
    'Visual fidelity  : PRESERVED',
  )

  console.log(
    'Text corpus      : UNCHANGED',
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

  let totalPages = 0

  let totalBytes = 0

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
      await buildVisualSource(
        lesson,
      )

    results.push(
      result,
    )

    totalPages +=
      result.pageCount

    totalBytes +=
      result.byteSize

    console.log(
      `      ✓ pages: ${result.pageCount}`,
    )

    console.log(
      `      ✓ range: ${result.sourcePageStart}-${result.sourcePageEnd}`,
    )

    console.log(
      `      ✓ size: ${formatBytes(
        result.byteSize,
      )}`,
    )

    console.log(
      '      ✓ PDF integrity verified',
    )

    console.log(
      '      ✓ visual content preserved\n',
    )
  }

  if (
    results.length !==
    6
  ) {
    throw new Error(
      `Expected 6 visual sources, generated ${results.length}.`,
    )
  }

  if (
    totalPages !==
    100
  ) {
    throw new Error(
      `Expected 100 total visual pages, generated ${totalPages}.`,
    )
  }

  const manifest = {
    schemaVersion: 1,

    purpose:
      'CHALKBOX_VISUAL_GROUNDING',

    lessons:
      results.length,

    totalPages,

    totalBytes,

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
    ' Visual Source Corpus Ready',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Lessons          : ${results.length}/6`,
  )

  console.log(
    `Visual pages     : ${totalPages}/100`,
  )

  console.log(
    `Total size       : ${formatBytes(
      totalBytes,
    )}`,
  )

  console.log(
    'PDF integrity    : VERIFIED',
  )

  console.log(
    'Canonical text   : UNCHANGED',
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
    'data/visual-source-v1/\n',
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
      ' Visual Source Build FAILED',
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