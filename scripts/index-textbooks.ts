import { createHash } from 'node:crypto'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractPdfRange, type ExtractedPage } from './extract-pdf-text'

/* ============================================================
   ChalkBox Raw Textbook Index Builder v1

   Purpose:
   - NO Gemini extraction
   - NO activity/figure/table parsing
   - NO semantic QA
   - NO embeddings
   - NO Supabase writes

   It only turns the six known textbook lesson ranges into faithful,
   page-grounded raw text chunks ready for the later embedding step.
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

type RawTextbookChunk = {
  schemaVersion: 1
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
  sectionTitle: null
  charCount: number
  approxTokenCount: number
  sha256: string
  metadata: {
    pipeline: 'raw-page-v1'
    sourcePage: number
    pagePart: number
    pagePartCount: number
  }
}

type LessonIndexFile = {
  schemaVersion: 1
  pipeline: 'raw-page-v1'
  generatedAt: string
  lesson: LessonDefinition
  representedSourcePages: number[]
  chunkCount: number
  chunks: RawTextbookChunk[]
}

type ManifestLesson = {
  lessonKey: string
  title: string
  classLevel: number
  sourceFileName: string
  sourcePageRange: string
  pageCount: number
  chunkCount: number
  totalCharacters: number
  approxTokens: number
  outputFile: string
}

const CURRENT_FILE = fileURLToPath(import.meta.url)
const SCRIPTS_DIRECTORY = path.dirname(CURRENT_FILE)
const ROOT_DIRECTORY = path.resolve(SCRIPTS_DIRECTORY, '..')
const TEXTBOOK_DIRECTORY = path.join(ROOT_DIRECTORY, 'data', 'textbooks')
const OUTPUT_DIRECTORY = path.join(ROOT_DIRECTORY, 'data', 'rag-index-v1')

const MAX_CHUNK_CHARS = 6500

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

function sha256(text: string) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function approxTokens(text: string) {
  return Math.ceil(text.length / 4)
}

function expectedPages(lesson: LessonDefinition) {
  return Array.from(
    { length: lesson.endPage - lesson.startPage + 1 },
    (_, index) => lesson.startPage + index,
  )
}

function collapsePdfExtractionDuplicates(text: string) {
  return text
    // Repeated NCERT source labels such as:
    // Activity 5.1Activity 5.1...
    // Figure 5.2Figure 5.2...
    // Table 11.1Table 11.1...
    .replace(
      /\b((?:Activity|Figure|Fig\.?|Table)\s+\d+(?:\.\d+)+)(?:\1){1,}\b/gi,
      '$1',
    )

    // Repeated numbered section headings such as:
    // 11.3 CIRCUIT DIAGRAM11.3 CIRCUIT DIAGRAM...
    .replace(
      /\b((?:\d+(?:\.\d+)+)\s+[A-Z][A-Z0-9][A-Z0-9 ()/:,&'’\-]{2,80}?)(?:\1){1,}\b/g,
      '$1',
    )
}

function normalizeChunkText(text: string) {
  return collapsePdfExtractionDuplicates(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitLongText(text: string, maxChars: number): string[] {
  const normalized = normalizeChunkText(text)

  if (normalized.length <= maxChars) {
    return [normalized]
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const parts: string[] = []
  let current = ''

  const flush = () => {
    const value = current.trim()

    if (value) {
      parts.push(value)
    }

    current = ''
  }

  const appendPiece = (piece: string) => {
    const candidate = current ? `${current}\n\n${piece}` : piece

    if (candidate.length <= maxChars) {
      current = candidate
      return
    }

    flush()

    if (piece.length <= maxChars) {
      current = piece
      return
    }

    let remaining = piece

    while (remaining.length > maxChars) {
      const window = remaining.slice(0, maxChars + 1)

      const preferredBreak = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('? '),
        window.lastIndexOf('! '),
        window.lastIndexOf('; '),
        window.lastIndexOf(', '),
        window.lastIndexOf(' '),
      )

      const cut =
        preferredBreak >= Math.floor(maxChars * 0.6)
          ? preferredBreak + 1
          : maxChars

      parts.push(remaining.slice(0, cut).trim())
      remaining = remaining.slice(cut).trim()
    }

    if (remaining) {
      current = remaining
    }
  }

  for (const paragraph of paragraphs) {
    appendPiece(paragraph)
  }

  flush()

  return parts
}

function assertReadableLesson(
  lesson: LessonDefinition,
  pages: ExtractedPage[],
) {
  const expected = expectedPages(lesson)
  const actual = pages.map((page) => page.pageNumber)

  if (actual.length !== expected.length) {
    throw new Error(
      `${lesson.title}: expected ${expected.length} pages, extracted ${actual.length}.`,
    )
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(
        `${lesson.title}: page sequence mismatch at position ${
          index + 1
        }; expected ${expected[index]}, got ${actual[index]}.`,
      )
    }
  }

  const unusable = pages.filter((page) => page.verdict !== 'readable')

  if (unusable.length > 0) {
    throw new Error(
      [
        `${lesson.title}: refusing to index unreadable source page(s).`,
        ...unusable.map(
          (page) =>
            `- page ${page.pageNumber}: ${page.verdict}; ${
              page.reasons.join('; ') || 'no reason'
            }`,
        ),
      ].join('\n'),
    )
  }

  const emptyAfterCleaning = pages.filter(
    (page) => normalizeChunkText(page.text).length < 80,
  )

  if (emptyAfterCleaning.length > 0) {
    throw new Error(
      `${lesson.title}: suspiciously short readable page(s): ${emptyAfterCleaning
        .map((page) => page.pageNumber)
        .join(', ')}.`,
    )
  }
}

function buildChunks(
  lesson: LessonDefinition,
  pages: ExtractedPage[],
): RawTextbookChunk[] {
  const chunks: RawTextbookChunk[] = []
  let chunkIndex = 0

  for (const page of pages) {
    const parts = splitLongText(page.text, MAX_CHUNK_CHARS)

    if (parts.length === 0) {
      throw new Error(
        `${lesson.title}: page ${page.pageNumber} produced no chunks.`,
      )
    }

    parts.forEach((content, partIndex) => {
      const clean = normalizeChunkText(content)

      if (!clean) {
        throw new Error(
          `${lesson.title}: page ${page.pageNumber} part ${
            partIndex + 1
          } is empty.`,
        )
      }

      chunks.push({
        schemaVersion: 1,
        chunkId: `${lesson.lessonKey}-p${String(
          page.pageNumber,
        ).padStart(3, '0')}-part${String(partIndex + 1).padStart(
          2,
          '0',
        )}`,
        lessonKey: lesson.lessonKey,
        classLevel: lesson.classLevel,
        subject: lesson.subject,
        lessonTitle: lesson.title,
        sourceFileName: lesson.sourceFileName,
        chunkIndex,
        content: clean,
        pageStart: page.pageNumber,
        pageEnd: page.pageNumber,
        sectionTitle: null,
        charCount: clean.length,
        approxTokenCount: approxTokens(clean),
        sha256: sha256(clean),
        metadata: {
          pipeline: 'raw-page-v1',
          sourcePage: page.pageNumber,
          pagePart: partIndex + 1,
          pagePartCount: parts.length,
        },
      })

      chunkIndex += 1
    })
  }

  return chunks
}

function validateChunks(
  lesson: LessonDefinition,
  chunks: RawTextbookChunk[],
) {
  if (chunks.length === 0) {
    throw new Error(`${lesson.title}: zero chunks generated.`)
  }

  const indexes = chunks.map((chunk) => chunk.chunkIndex)

  const expectedIndexes = Array.from(
    { length: chunks.length },
    (_, index) => index,
  )

  if (
    indexes.some(
      (value, index) => value !== expectedIndexes[index],
    )
  ) {
    throw new Error(
      `${lesson.title}: chunk indexes are not contiguous from zero.`,
    )
  }

  const represented = new Set(
    chunks.map((chunk) => chunk.pageStart),
  )

  const missing = expectedPages(lesson).filter(
    (page) => !represented.has(page),
  )

  if (missing.length > 0) {
    throw new Error(
      `${lesson.title}: missing source-page coverage for page(s) ${missing.join(
        ', ',
      )}.`,
    )
  }

  for (const chunk of chunks) {
    if (
      chunk.pageStart < lesson.startPage ||
      chunk.pageEnd > lesson.endPage ||
      chunk.pageStart !== chunk.pageEnd
    ) {
      throw new Error(
        `${lesson.title}: invalid provenance in ${chunk.chunkId}.`,
      )
    }

    if (chunk.sha256 !== sha256(chunk.content)) {
      throw new Error(
        `${lesson.title}: checksum mismatch in ${chunk.chunkId}.`,
      )
    }
  }
}

async function verifySourceFiles() {
  const uniqueFiles = [
    ...new Set(
      lessons.map((lesson) => lesson.sourceFileName),
    ),
  ]

  console.log('\nChecking source PDFs...\n')

  for (const fileName of uniqueFiles) {
    const fullPath = path.join(
      TEXTBOOK_DIRECTORY,
      fileName,
    )

    await access(fullPath)

    console.log(`✓ ${fileName}`)
  }
}

async function main() {
  console.log('\n==========================================')
  console.log(' ChalkBox Raw Textbook Index Builder v1')
  console.log('==========================================\n')

  console.log('Gemini calls      : NONE')
  console.log('Embeddings        : NONE')
  console.log('Supabase writes   : NONE')
  console.log('Source parsing    : page text only')
  console.log('Output            : data/rag-index-v1')

  await verifySourceFiles()

  await rm(OUTPUT_DIRECTORY, {
    recursive: true,
    force: true,
  })

  await mkdir(OUTPUT_DIRECTORY, {
    recursive: true,
  })

  const generatedAt = new Date().toISOString()

  const manifestLessons: ManifestLesson[] = []

  let totalPages = 0
  let totalChunks = 0
  let totalCharacters = 0
  let totalApproxTokens = 0

  for (const [lessonIndex, lesson] of lessons.entries()) {
    console.log('\n==========================================')
    console.log(
      `[${lessonIndex + 1}/${lessons.length}] ${lesson.title}`,
    )
    console.log('==========================================\n')

    const sourcePath = path.join(
      TEXTBOOK_DIRECTORY,
      lesson.sourceFileName,
    )

    const extraction = await extractPdfRange(
      sourcePath,
      lesson.startPage,
      lesson.endPage,
    )

    assertReadableLesson(
      lesson,
      extraction.pages,
    )

    const chunks = buildChunks(
      lesson,
      extraction.pages,
    )

    validateChunks(
      lesson,
      chunks,
    )

    const representedSourcePages =
      expectedPages(lesson)

    const output: LessonIndexFile = {
      schemaVersion: 1,
      pipeline: 'raw-page-v1',
      generatedAt,
      lesson,
      representedSourcePages,
      chunkCount: chunks.length,
      chunks,
    }

    const outputFile = `${lesson.lessonKey}.json`

    const outputPath = path.join(
      OUTPUT_DIRECTORY,
      outputFile,
    )

    await writeFile(
      outputPath,
      `${JSON.stringify(output, null, 2)}\n`,
      'utf8',
    )

    const characters = chunks.reduce(
      (sum, chunk) => sum + chunk.charCount,
      0,
    )

    const tokens = chunks.reduce(
      (sum, chunk) =>
        sum + chunk.approxTokenCount,
      0,
    )

    const pageCount =
      representedSourcePages.length

    manifestLessons.push({
      lessonKey: lesson.lessonKey,
      title: lesson.title,
      classLevel: lesson.classLevel,
      sourceFileName: lesson.sourceFileName,
      sourcePageRange: `${lesson.startPage}-${lesson.endPage}`,
      pageCount,
      chunkCount: chunks.length,
      totalCharacters: characters,
      approxTokens: tokens,
      outputFile,
    })

    totalPages += pageCount
    totalChunks += chunks.length
    totalCharacters += characters
    totalApproxTokens += tokens

    console.log(
      `✓ ${pageCount}/${pageCount} readable pages → ${chunks.length} raw chunk(s)`,
    )

    console.log(
      `  ${characters.toLocaleString()} characters · ~${tokens.toLocaleString()} tokens`,
    )

    console.log(
      `  ${outputFile}`,
    )
  }

  if (totalPages !== 100) {
    throw new Error(
      `Corpus page-count invariant failed: expected 100 lesson pages, got ${totalPages}.`,
    )
  }

  const manifest = {
    schemaVersion: 1,
    pipeline: 'raw-page-v1',
    generatedAt,
    textbookDirectory: 'data/textbooks',
    outputDirectory: 'data/rag-index-v1',
    lessonCount: manifestLessons.length,
    totalPages,
    totalChunks,
    totalCharacters,
    approxTokens: totalApproxTokens,
    lessons: manifestLessons,
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

  console.log('\n==========================================')
  console.log(' Raw Textbook Index Complete')
  console.log('==========================================\n')

  console.log(
    `Lessons       : ${manifestLessons.length}/6`,
  )

  console.log(
    `Source pages  : ${totalPages}/100`,
  )

  console.log(
    `Raw chunks    : ${totalChunks}`,
  )

  console.log(
    `Characters    : ${totalCharacters.toLocaleString()}`,
  )

  console.log(
    `Approx tokens : ${totalApproxTokens.toLocaleString()}`,
  )

  console.log('Gemini calls  : 0')
  console.log('Supabase      : untouched')

  console.log(
    '\nNext gate: inspect manifest.json, then add embeddings.\n',
  )
}

main().catch((error: unknown) => {
  console.error('\n==========================================')
  console.error(' Raw Textbook Index Failed')
  console.error('==========================================\n')

  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  )

  process.exitCode = 1
})