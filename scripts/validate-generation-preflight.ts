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
   CHALKBOX — GENERATION PREFLIGHT v1

   PURPOSE

   Before Gemini 3.7 receives ANY lesson source, prove that:

   canonical text page-space
       =
   visual PDF page-space mapping

   This specifically prevents citation-space collisions such as:

   visual chapter PDF page 1
       !=
   canonical textbook page 13

   for combined source PDFs.

   NO GEMINI CALLS.
   NO SUPABASE WRITES.
   NO CORPUS MODIFICATION.
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

const VISUAL_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'visual-source-v1',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'generation-preflight-v1',
  )

/* ============================================================
   LESSON DEFINITIONS

   IMPORTANT:

   sourcePdfStart/sourcePdfEnd:
     physical page positions inside our local source PDF.

   canonicalStart/canonicalEnd:
     page numbers used by textbook_chunks / sourcePages.

   They happen to match numerically for the current corpus,
   but they are treated as separate numbering spaces.
   ============================================================ */

type LessonDefinition = {
  lessonKey: string
  title: string
  sourceFileName: string

  sourcePdfStart: number
  sourcePdfEnd: number

  canonicalStart: number
  canonicalEnd: number
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

    sourcePdfStart: 1,
    sourcePdfEnd: 12,

    canonicalStart: 1,
    canonicalEnd: 12,
  },

  {
    lessonKey:
      'class-8-materials-metals-non-metals',

    title:
      'Materials: Metals and Non-Metals',

    sourceFileName:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',

    sourcePdfStart: 13,
    sourcePdfEnd: 24,

    canonicalStart: 13,
    canonicalEnd: 24,
  },

  {
    lessonKey:
      'class-9-force-laws-motion',

    title:
      'Force and Laws of Motion',

    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',

    sourcePdfStart: 1,
    sourcePdfEnd: 17,

    canonicalStart: 1,
    canonicalEnd: 17,
  },

  {
    lessonKey:
      'class-9-work-energy',

    title:
      'Work and Energy',

    sourceFileName:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',

    sourcePdfStart: 18,
    sourcePdfEnd: 31,

    canonicalStart: 18,
    canonicalEnd: 31,
  },

  {
    lessonKey:
      'class-10-life-processes',

    title:
      'Life Processes',

    sourceFileName:
      'NCERT-Class-10-Life-Processes-official.pdf',

    sourcePdfStart: 1,
    sourcePdfEnd: 21,

    canonicalStart: 1,
    canonicalEnd: 21,
  },

  {
    lessonKey:
      'class-10-electricity',

    title:
      'Electricity',

    sourceFileName:
      'NCERT-Class-10-Electricity-official.pdf',

    sourcePdfStart: 1,
    sourcePdfEnd: 24,

    canonicalStart: 1,
    canonicalEnd: 24,
  },
]

/* ============================================================
   SOURCE TYPES
   ============================================================ */

type FullChapterPage = {
  pageNumber: number
  content: string
}

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

  pages:
    FullChapterPage[]
}

type VisualPageMapping = {
  chapterPage: number

  sourcePdfPage: number

  textbookPageLabel: number
}

type VisualResult = {
  lessonKey: string

  title: string

  sourceFileName: string

  sourcePdfSha256: string

  outputFileName: string

  outputSha256: string

  sourcePageStart: number

  sourcePageEnd: number

  pageCount: number

  byteSize: number

  pageMappings:
    VisualPageMapping[]
}

type VisualManifest = {
  schemaVersion: number

  purpose: string

  lessons: number

  totalPages: number

  results:
    VisualResult[]
}

/* ============================================================
   HELPERS
   ============================================================ */

function sha256(
  value: Uint8Array,
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

function pageRange(
  start: number,
  end: number,
) {
  const pages:
    number[] = []

  for (
    let page = start;
    page <= end;
    page += 1
  ) {
    pages.push(
      page,
    )
  }

  return pages
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

function expectedCount(
  start: number,
  end: number,
) {
  return (
    end -
    start +
    1
  )
}

/* ============================================================
   LOAD VISUAL MANIFEST
   ============================================================ */

async function loadVisualManifest() {
  const filePath =
    path.join(
      VISUAL_DIRECTORY,
      'manifest.json',
    )

  const text =
    await readFile(
      filePath,
      'utf8',
    )

  const manifest =
    JSON.parse(
      text,
    ) as VisualManifest

  if (
    manifest.purpose !==
    'CHALKBOX_VISUAL_GROUNDING'
  ) {
    throw new Error(
      'Unexpected visual-source manifest purpose.',
    )
  }

  if (
    manifest.lessons !== 6
  ) {
    throw new Error(
      `Expected 6 visual lessons; found ${manifest.lessons}.`,
    )
  }

  if (
    manifest.totalPages !==
    100
  ) {
    throw new Error(
      `Expected 100 visual pages; found ${manifest.totalPages}.`,
    )
  }

  return manifest
}

/* ============================================================
   VALIDATE ONE LESSON
   ============================================================ */

async function validateLesson(
  definition:
    LessonDefinition,

  manifest:
    VisualManifest,
) {
  const expectedCanonicalPages =
    pageRange(
      definition.canonicalStart,
      definition.canonicalEnd,
    )

  const expectedSourcePages =
    pageRange(
      definition.sourcePdfStart,
      definition.sourcePdfEnd,
    )

  const expectedPages =
    expectedCount(
      definition.canonicalStart,
      definition.canonicalEnd,
    )

  /* ----------------------------------------------------------
     Canonical context
     ---------------------------------------------------------- */

  const contextPath =
    path.join(
      CONTEXT_DIRECTORY,
      `${definition.lessonKey}.json`,
    )

  const contextText =
    await readFile(
      contextPath,
      'utf8',
    )

  const context =
    JSON.parse(
      contextText,
    ) as FullChapterContext

  if (
    context.contextMode !==
    'FULL_CHAPTER'
  ) {
    throw new Error(
      `${definition.lessonKey}: context mode is not FULL_CHAPTER.`,
    )
  }

  if (
    context.lessonKey !==
    definition.lessonKey
  ) {
    throw new Error(
      `${definition.lessonKey}: context lessonKey mismatch.`,
    )
  }

  if (
    context.title !==
    definition.title
  ) {
    throw new Error(
      `${definition.lessonKey}: title mismatch.`,
    )
  }

  if (
    context.sourceFileName !==
    definition.sourceFileName
  ) {
    throw new Error(
      `${definition.lessonKey}: canonical source filename mismatch.`,
    )
  }

  if (
    context.firstPage !==
      definition.canonicalStart ||
    context.lastPage !==
      definition.canonicalEnd
  ) {
    throw new Error(
      [
        `${definition.lessonKey}: canonical range mismatch.`,
        `Expected: ${definition.canonicalStart}-${definition.canonicalEnd}`,
        `Actual:   ${context.firstPage}-${context.lastPage}`,
      ].join(
        '\n',
      ),
    )
  }

  if (
    context.pageCount !==
      expectedPages ||
    context.pages.length !==
      expectedPages
  ) {
    throw new Error(
      `${definition.lessonKey}: canonical page count mismatch.`,
    )
  }

  const canonicalPages =
    context.pages.map(
      (page) =>
        page.pageNumber,
    )

  if (
    new Set(
      canonicalPages,
    ).size !==
    canonicalPages.length
  ) {
    throw new Error(
      `${definition.lessonKey}: duplicate canonical page numbers found.`,
    )
  }

  if (
    !arraysEqual(
      canonicalPages,
      expectedCanonicalPages,
    )
  ) {
    throw new Error(
      [
        `${definition.lessonKey}: canonical page sequence mismatch.`,
        `Expected: ${expectedCanonicalPages.join(', ')}`,
        `Actual:   ${canonicalPages.join(', ')}`,
      ].join(
        '\n',
      ),
    )
  }

  for (
    const page
    of context.pages
  ) {
    if (
      !page.content ||
      !page.content.trim()
    ) {
      throw new Error(
        `${definition.lessonKey}: canonical page ${page.pageNumber} is empty.`,
      )
    }
  }

  /* ----------------------------------------------------------
     Visual manifest
     ---------------------------------------------------------- */

  const visual =
    manifest.results.find(
      (record) =>
        record.lessonKey ===
        definition.lessonKey,
    )

  if (!visual) {
    throw new Error(
      `${definition.lessonKey}: visual manifest entry missing.`,
    )
  }

  if (
    visual.title !==
    definition.title
  ) {
    throw new Error(
      `${definition.lessonKey}: visual title mismatch.`,
    )
  }

  if (
    visual.sourceFileName !==
    definition.sourceFileName
  ) {
    throw new Error(
      `${definition.lessonKey}: visual source filename mismatch.`,
    )
  }

  if (
    visual.sourcePageStart !==
      definition.sourcePdfStart ||
    visual.sourcePageEnd !==
      definition.sourcePdfEnd
  ) {
    throw new Error(
      `${definition.lessonKey}: visual source-PDF range mismatch.`,
    )
  }

  if (
    visual.pageCount !==
    expectedPages
  ) {
    throw new Error(
      `${definition.lessonKey}: visual page count mismatch.`,
    )
  }

  if (
    !Array.isArray(
      visual.pageMappings,
    ) ||
    visual.pageMappings.length !==
      expectedPages
  ) {
    throw new Error(
      `${definition.lessonKey}: visual page mapping count mismatch.`,
    )
  }

  /* ----------------------------------------------------------
     Mapping validation

     Do NOT assume:
       chapter PDF page == canonical page.

     Explicitly validate all three numbering spaces.
     ---------------------------------------------------------- */

  for (
    let index = 0;
    index <
      expectedPages;
    index += 1
  ) {
    const mapping =
      visual.pageMappings[
        index
      ]

    const expectedChapterPage =
      index + 1

    const expectedSourcePdfPage =
      expectedSourcePages[
        index
      ]

    const expectedCanonicalPage =
      expectedCanonicalPages[
        index
      ]

    if (
      mapping.chapterPage !==
      expectedChapterPage
    ) {
      throw new Error(
        `${definition.lessonKey}: mapping ${index + 1} has incorrect chapterPage.`,
      )
    }

    if (
      mapping.sourcePdfPage !==
      expectedSourcePdfPage
    ) {
      throw new Error(
        [
          `${definition.lessonKey}: source PDF mapping mismatch.`,
          `Chapter page: ${expectedChapterPage}`,
          `Expected source PDF page: ${expectedSourcePdfPage}`,
          `Actual: ${mapping.sourcePdfPage}`,
        ].join(
          '\n',
        ),
      )
    }

    if (
      mapping.textbookPageLabel !==
      expectedCanonicalPage
    ) {
      throw new Error(
        [
          `${definition.lessonKey}: CANONICAL PAGE COLLISION.`,
          `Visual chapter page: ${expectedChapterPage}`,
          `Expected canonical page: ${expectedCanonicalPage}`,
          `Actual canonical mapping: ${mapping.textbookPageLabel}`,
        ].join(
          '\n',
        ),
      )
    }
  }

  /* ----------------------------------------------------------
     Visual PDF bytes / checksum / page count
     ---------------------------------------------------------- */

  const visualPdfPath =
    path.join(
      VISUAL_DIRECTORY,
      visual.outputFileName,
    )

  const visualBytes =
    await readFile(
      visualPdfPath,
    )

  if (
    sha256(
      visualBytes,
    ) !==
    visual.outputSha256
  ) {
    throw new Error(
      `${definition.lessonKey}: visual PDF checksum mismatch.`,
    )
  }

  const visualPdf =
    await PDFDocument.load(
      visualBytes,
      {
        updateMetadata:
          false,
      },
    )

  if (
    visualPdf.getPageCount() !==
    expectedPages
  ) {
    throw new Error(
      `${definition.lessonKey}: generated visual PDF page count mismatch.`,
    )
  }

  /* ----------------------------------------------------------
     Original PDF checksum
     ---------------------------------------------------------- */

  const originalPath =
    path.join(
      TEXTBOOK_DIRECTORY,
      definition.sourceFileName,
    )

  const originalBytes =
    await readFile(
      originalPath,
    )

  if (
    sha256(
      originalBytes,
    ) !==
    visual.sourcePdfSha256
  ) {
    throw new Error(
      `${definition.lessonKey}: original source PDF checksum changed since visual corpus creation.`,
    )
  }

  return {
    lessonKey:
      definition.lessonKey,

    title:
      definition.title,

    canonicalRange:
      `${definition.canonicalStart}-${definition.canonicalEnd}`,

    sourcePdfRange:
      `${definition.sourcePdfStart}-${definition.sourcePdfEnd}`,

    visualChapterRange:
      `1-${expectedPages}`,

    pageCount:
      expectedPages,

    mapping:
      visual.pageMappings,

    visualFile:
      visual.outputFileName,

    visualSha256:
      visual.outputSha256,

    status:
      'PASS',
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
    ' ChalkBox Generation Preflight v1',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'Canonical source    : CHECKING',
  )

  console.log(
    'Visual source       : CHECKING',
  )

  console.log(
    'Page-space mapping  : STRICT',
  )

  console.log(
    'PDF checksums       : STRICT',
  )

  console.log(
    'Gemini calls        : 0',
  )

  console.log(
    'Supabase writes     : 0\n',
  )

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  )

  const manifest =
    await loadVisualManifest()

  const results = []

  let totalPages = 0

  for (
    let index = 0;
    index <
      LESSONS.length;
    index += 1
  ) {
    const definition =
      LESSONS[index]

    console.log(
      `[${index + 1}/${LESSONS.length}] ${definition.title}`,
    )

    const result =
      await validateLesson(
        definition,
        manifest,
      )

    results.push(
      result,
    )

    totalPages +=
      result.pageCount

    console.log(
      `      ✓ canonical: ${result.canonicalRange}`,
    )

    console.log(
      `      ✓ source PDF: ${result.sourcePdfRange}`,
    )

    console.log(
      `      ✓ visual PDF: ${result.visualChapterRange}`,
    )

    const first =
      result.mapping[0]

    const last =
      result.mapping[
        result.mapping.length - 1
      ]

    console.log(
      `      ✓ map first: visual ${first.chapterPage} → canonical ${first.textbookPageLabel}`,
    )

    console.log(
      `      ✓ map last : visual ${last.chapterPage} → canonical ${last.textbookPageLabel}`,
    )

    console.log(
      '      ✓ checksum: PASS',
    )

    console.log(
      '      ✓ status: PASS\n',
    )
  }

  if (
    results.length !== 6 ||
    totalPages !== 100
  ) {
    throw new Error(
      `Final invariant failed: ${results.length}/6 lessons, ${totalPages}/100 pages.`,
    )
  }

  const report = {
    schemaVersion: 1,

    purpose:
      'GENERATION_SOURCE_PREFLIGHT',

    status:
      'PASS',

    lessons:
      results.length,

    totalPages,

    canonicalPageSpace:
      'VERIFIED',

    visualPageSpace:
      'VERIFIED',

    mappings:
      'VERIFIED',

    generatedAt:
      new Date()
        .toISOString(),

    results,
  }

  await writeFile(
    path.join(
      OUTPUT_DIRECTORY,
      'report.json',
    ),

    `${JSON.stringify(
      report,
      null,
      2,
    )}\n`,

    'utf8',
  )

  console.log(
    '==========================================',
  )

  console.log(
    ' Generation Preflight PASSED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Lessons             : ${results.length}/6`,
  )

  console.log(
    `Canonical pages     : ${totalPages}/100`,
  )

  console.log(
    'Page-space mapping  : VERIFIED',
  )

  console.log(
    'Visual PDF integrity: VERIFIED',
  )

  console.log(
    'Source checksums     : VERIFIED',
  )

  console.log(
    'Gemini calls         : 0',
  )

  console.log(
    'Supabase writes      : 0',
  )

  console.log(
    '\nOutput:',
  )

  console.log(
    'data/generation-preflight-v1/report.json\n',
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
      ' Generation Preflight FAILED',
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

    console.error(
      '\nDO NOT run Gemini 3.7 generation until this is fixed.\n',
    )

    process.exitCode = 1
  },
)