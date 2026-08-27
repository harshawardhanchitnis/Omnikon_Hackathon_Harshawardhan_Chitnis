/// <reference types="node" />

import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises'

import {
  createHash,
} from 'node:crypto'

import path from 'node:path'
import process from 'node:process'

/* ============================================================
   CHALKBOX — SOURCE CATALOG BUILDER v1

   PURPOSE

   Build a deterministic inventory of textbook source objects
   BEFORE lesson generation.

   This prevents the generator from inventing things such as:

     Activity 9.5
     Example 5.3
     Figure 11.7

   when those exact objects are not present in the source.

   INPUT

     data/full-chapter-context-v1/*.json
     data/visual-source-v1/manifest.json

   OUTPUT

     data/source-catalog-v1/<lesson-key>.json
     data/source-catalog-v1/manifest.json

   IMPORTANT

   - NO Gemini calls.
   - NO Groq calls.
   - NO Supabase writes.
   - NO semantic guessing.
   - Canonical text remains source authority.
   - Visual labels detected from text are only label candidates;
     actual visual fidelity is still checked multimodally later.

   Production rule established by this catalog:

     labelled textbook object exists
          ↓
     model MAY use textbook provenance

     no labelled textbook object
          ↓
     use ChalkBox provenance instead

   ============================================================ */

/* ============================================================
   CONSTANTS
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

const VISUAL_MANIFEST_FILE =
  path.resolve(
    VISUAL_DIRECTORY,
    'manifest.json',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'source-catalog-v1',
  )

const OUTPUT_MANIFEST_FILE =
  path.resolve(
    OUTPUT_DIRECTORY,
    'manifest.json',
  )

const SCHEMA_VERSION =
  1

const POLICY_VERSION =
  'chalkbox-source-catalog-v1'

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

const ONLY_LESSON =
  cliValue(
    'lesson',
  )

/* ============================================================
   TYPES
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

type SourceObjectKind =
  | 'ACTIVITY'
  | 'EXAMPLE'
  | 'FIGURE'
  | 'TABLE'

type MatchPattern = {
  kind: SourceObjectKind
  regex: RegExp
}

type RawMatch = {
  kind: SourceObjectKind
  number: string
  printedLabel: string
  pageNumber: number
  index: number
  snippet: string
}

type CatalogSourceObject = {
  kind: SourceObjectKind
  canonicalId: string
  preferredSourceLabel: string
  printedLabels: string[]
  sourcePages: number[]
  occurrenceCount: number
  firstOccurrencePage: number
  firstOccurrenceSnippet: string
}

/* ============================================================
   DETECTION PATTERNS

   Deliberately conservative.

   We catalogue labelled objects only.

   Unlabelled instructional material remains usable, but must
   later use CHALKBOX_* provenance instead of pretending to be
   an explicitly labelled textbook object.
   ============================================================ */

const MATCH_PATTERNS:
  MatchPattern[] = [
  {
    kind:
      'ACTIVITY',

    /*
     * Handles both:
     *
     * Activity 9.1
     *
     * and extracted textbook formatting such as:
     *
     * Activity ______________ 9.1
     * Activity .............. 9.1
     * Activity -------- 9.1
     */
    regex:
      /\b(Activity)\s*(?:[_–—.\-]{2,}\s*)?(\d+(?:\.\d+)*)\b/gi,
  },

  {
    kind:
      'EXAMPLE',

    regex:
      /\b(Example)\s*(?:[_–—.\-]{2,}\s*)?(\d+(?:\.\d+)*)\b/gi,
  },

  {
    kind:
      'FIGURE',

    regex:
      /\b(Fig(?:ure)?\.?)\s*(?:[_–—.\-]{2,}\s*)?(\d+(?:\.\d+)*)\b/gi,
  },

  {
    kind:
      'TABLE',

    regex:
      /\b(Table)\s*(?:[_–—.\-]{2,}\s*)?(\d+(?:\.\d+)*)\b/gi,
  },
]

/* ============================================================
   HELPERS
   ============================================================ */

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value ===
      'object' &&
    !Array.isArray(
      value,
    )
  )
}

function sha256(
  text: string,
) {
  return createHash(
    'sha256',
  )
    .update(
      text,
      'utf8',
    )
    .digest(
      'hex',
    )
}

function canonicalContentHash(
  context:
    FullChapterContext,
) {
  return sha256(
    JSON.stringify(
      context.pages.map(
        (page) => ({
          pageNumber:
            page.pageNumber,

          content:
            page.content,
        }),
      ),
    ),
  )
}

function normalizeWhitespace(
  value: string,
) {
  return value
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}

function normalizePreferredSourceLabel(
  value: string,
) {
  return normalizeWhitespace(
    value.replace(
      /\s*[_–—.\-]{2,}\s*/g,
      ' ',
    ),
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

function uniqueStrings(
  values: string[],
) {
  return [
    ...new Set(
      values,
    ),
  ]
}

function canonicalId(
  kind:
    SourceObjectKind,

  number:
    string,
) {
  return `${kind}:${number}`
}

function contextSnippet(
  text: string,
  matchIndex: number,
  matchLength: number,
) {
  const radius =
    220

  const start =
    Math.max(
      0,
      matchIndex -
        radius,
    )

  const end =
    Math.min(
      text.length,
      matchIndex +
        matchLength +
        radius,
    )

  return normalizeWhitespace(
    text.slice(
      start,
      end,
    ),
  )
}

/* ============================================================
   LOAD VISUAL MANIFEST

   Visual data is optional for generic/unseen sources.

   If the source has already passed through the visual-source
   stage, we preserve its exact visual/canonical page map.
   ============================================================ */

async function loadVisualManifest() {
  try {
    const text =
      await readFile(
        VISUAL_MANIFEST_FILE,
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
        'Visual manifest is not an object.',
      )
    }

    return parsed as
      unknown as
      VisualManifest
  } catch (
    error
  ) {
    const nodeError =
      error as
        NodeJS.ErrnoException

    if (
      nodeError.code ===
        'ENOENT'
    ) {
      return null
    }

    throw error
  }
}

/* ============================================================
   LOAD CONTEXT
   ============================================================ */

async function loadContext(
  filePath: string,
) {
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
      `Context is not an object: ${filePath}`,
    )
  }

  const context =
    parsed as
      unknown as
      FullChapterContext

  if (
    context.contextMode !==
      'FULL_CHAPTER'
  ) {
    throw new Error(
      `${context.lessonKey}: expected FULL_CHAPTER context.`,
    )
  }

  if (
    !context.lessonKey ||
    !context.title ||
    !context.subject
  ) {
    throw new Error(
      `Invalid context metadata: ${filePath}`,
    )
  }

  if (
    !Array.isArray(
      context.pages,
    ) ||
    context.pages.length !==
      context.pageCount
  ) {
    throw new Error(
      `${context.lessonKey}: invalid canonical pages.`,
    )
  }

  for (
    let index = 0;
    index <
      context.pages.length;
    index += 1
  ) {
    const expectedPage =
      context.firstPage +
      index

    if (
      context.pages[index]
        .pageNumber !==
      expectedPage
    ) {
      throw new Error(
        [
          `${context.lessonKey}: canonical page order mismatch.`,
          `Expected ${expectedPage}.`,
          `Found ${context.pages[index].pageNumber}.`,
        ].join(' '),
      )
    }

    if (
      !context.pages[index]
        .content
        .trim()
    ) {
      throw new Error(
        `${context.lessonKey}: canonical page ${expectedPage} is empty.`,
      )
    }
  }

  return context
}

/* ============================================================
   DETECT SOURCE OBJECTS
   ============================================================ */

function detectMatches(
  context:
    FullChapterContext,
) {
  const matches:
    RawMatch[] = []

  for (
    const page
    of context.pages
  ) {
    for (
      const pattern
      of MATCH_PATTERNS
    ) {
      /*
       * New RegExp instance prevents any shared lastIndex state.
       */
      const regex =
        new RegExp(
          pattern.regex.source,
          pattern.regex.flags,
        )

      for (
        const match
        of page.content.matchAll(
          regex,
        )
      ) {
        const fullMatch =
          match[0]

        const number =
          match[2]

        if (
          !fullMatch ||
          !number ||
          match.index ===
            undefined
        ) {
          continue
        }

        matches.push({
          kind:
            pattern.kind,

          number,

          printedLabel:
            normalizeWhitespace(
              fullMatch,
            ),

          pageNumber:
            page.pageNumber,

          index:
            match.index,

          snippet:
            contextSnippet(
              page.content,
              match.index,
              fullMatch.length,
            ),
        })
      }
    }
  }

  return matches
}

/* ============================================================
   COLLAPSE REPEATED LABEL REFERENCES

   A figure/activity may be mentioned multiple times.

   Catalog contains one source object with all pages on which
   that exact designation appeared.
   ============================================================ */

function collapseMatches(
  matches:
    RawMatch[],
) {
  const grouped =
    new Map<
      string,
      RawMatch[]
    >()

  for (
    const match
    of matches
  ) {
    const id =
      canonicalId(
        match.kind,
        match.number,
      )

    const existing =
      grouped.get(
        id,
      )

    if (
      existing
    ) {
      existing.push(
        match,
      )
    } else {
      grouped.set(
        id,
        [
          match,
        ],
      )
    }
  }

  const objects:
    CatalogSourceObject[] = []

  for (
    const [
      id,
      occurrences,
    ]
    of grouped
  ) {
    occurrences.sort(
      (
        left,
        right,
      ) => {
        if (
          left.pageNumber !==
          right.pageNumber
        ) {
          return (
            left.pageNumber -
            right.pageNumber
          )
        }

        return (
          left.index -
          right.index
        )
      },
    )

    const first =
      occurrences[0]

    objects.push({
      kind:
        first.kind,

      canonicalId:
        id,

      /*
       * IMPORTANT:
       * Preserve actual printed source wording.
       *
       * e.g.
       *   "Fig. 5.8"
       * rather than changing it to
       *   "Figure 5.8".
       */
      preferredSourceLabel:
  normalizePreferredSourceLabel(
    first.printedLabel,
  ),

      printedLabels:
        uniqueStrings(
          occurrences.map(
            (item) =>
              item.printedLabel,
          ),
        ),

      sourcePages:
        uniqueNumbers(
          occurrences.map(
            (item) =>
              item.pageNumber,
          ),
        ),

      occurrenceCount:
        occurrences.length,

      firstOccurrencePage:
        first.pageNumber,

      firstOccurrenceSnippet:
        first.snippet,
    })
  }

  objects.sort(
    (
      left,
      right,
    ) => {
      if (
        left.firstOccurrencePage !==
        right.firstOccurrencePage
      ) {
        return (
          left.firstOccurrencePage -
          right.firstOccurrencePage
        )
      }

      return left.canonicalId.localeCompare(
        right.canonicalId,
      )
    },
  )

  return objects
}

/* ============================================================
   BUILD ONE CATALOG
   ============================================================ */

async function buildCatalog(
  contextFile:
    string,

  visualManifest:
    VisualManifest | null,
) {
  const context =
    await loadContext(
      contextFile,
    )

  const matches =
    detectMatches(
      context,
    )

  const sourceObjects =
    collapseMatches(
      matches,
    )

  const activities =
    sourceObjects.filter(
      (item) =>
        item.kind ===
          'ACTIVITY',
    )

  const examples =
    sourceObjects.filter(
      (item) =>
        item.kind ===
          'EXAMPLE',
    )

  const figures =
    sourceObjects.filter(
      (item) =>
        item.kind ===
          'FIGURE',
    )

  const tables =
    sourceObjects.filter(
      (item) =>
        item.kind ===
          'TABLE',
    )

  const visualRecord =
    visualManifest
      ?.results
      ?.find(
        (item) =>
          item.lessonKey ===
          context.lessonKey,
      ) ??
    null

  if (
    visualRecord &&
    visualRecord.pageCount !==
      context.pageCount
  ) {
    throw new Error(
      `${context.lessonKey}: visual/canonical page count mismatch.`,
    )
  }

  if (
    visualRecord &&
    visualRecord.pageMappings.length !==
      context.pageCount
  ) {
    throw new Error(
      `${context.lessonKey}: visual page-map count mismatch.`,
    )
  }

  const catalog = {
    schemaVersion:
      SCHEMA_VERSION,

    catalogPolicyVersion:
      POLICY_VERSION,

    lessonKey:
      context.lessonKey,

    classLevel:
      context.classLevel,

    subject:
      context.subject,

    title:
      context.title,

    sourceFileName:
      context.sourceFileName,

    canonicalSource: {
      pageStart:
        context.firstPage,

      pageEnd:
        context.lastPage,

      pageCount:
        context.pageCount,

      approxTokenCount:
        context.approxTokenCount,

      canonicalContentSha256:
        canonicalContentHash(
          context,
        ),
    },

    /*
     * These arrays are the authoritative allowed labels for
     * future model provenance.
     */
    allowedTextbookLabels: {
      activities:
        activities.map(
          (item) =>
            item.preferredSourceLabel,
        ),

      examples:
        examples.map(
          (item) =>
            item.preferredSourceLabel,
        ),

      figures:
        figures.map(
          (item) =>
            item.preferredSourceLabel,
        ),

      tables:
        tables.map(
          (item) =>
            item.preferredSourceLabel,
        ),
    },

    sourceObjects: {
      activities,
      examples,
      figures,
      tables,
    },

    provenanceRules: {
      textbookActivity:
        [
          'TEXTBOOK_ACTIVITY may only use a label listed in allowedTextbookLabels.activities.',
          'Otherwise use CHALKBOX_ACTIVITY with sourceLabel=null.',
        ],

      textbookExample:
        [
          'TEXTBOOK_EXAMPLE may only use a label listed in allowedTextbookLabels.examples.',
          'Unlabelled source-derived teaching examples must use CHALKBOX_EXAMPLE with sourceLabel=null.',
        ],

      textbookVisual:
        [
          'TEXTBOOK_VISUAL may only use a label listed in allowedTextbookLabels.figures or allowedTextbookLabels.tables.',
          'Actual visual fidelity still requires PDF verification.',
          'Adapted teacher redraws must use BOARD_VISUAL with sourceLabel=null.',
        ],
    },

    visualSource: visualRecord
      ? {
          available:
            true,

          outputFileName:
            visualRecord.outputFileName,

          outputSha256:
            visualRecord.outputSha256,

          pageCount:
            visualRecord.pageCount,

          pageMappings:
            visualRecord.pageMappings,
        }
      : {
          available:
            false,

          outputFileName:
            null,

          outputSha256:
            null,

          pageCount:
            null,

          pageMappings:
            [],
        },

    statistics: {
      activities:
        activities.length,

      examples:
        examples.length,

      figureLabels:
        figures.length,

      tableLabels:
        tables.length,

      totalLabelledSourceObjects:
        sourceObjects.length,
    },

    builtAt:
      new Date()
        .toISOString(),
  }

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
      `${context.lessonKey}.json`,
    )

  await writeFile(
    outputFile,

    `${JSON.stringify(
      catalog,
      null,
      2,
    )}\n`,

    'utf8',
  )

  return {
    lessonKey:
      context.lessonKey,

    title:
      context.title,

    fileName:
      path.basename(
        outputFile,
      ),

    canonicalContentSha256:
      catalog
        .canonicalSource
        .canonicalContentSha256,

    pageCount:
      context.pageCount,

    visualSourceAvailable:
      catalog
        .visualSource
        .available,

    activities:
      activities.length,

    examples:
      examples.length,

    figures:
      figures.length,

    tables:
      tables.length,

    totalObjects:
      sourceObjects.length,
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
    ' ChalkBox Source Catalog Builder v1',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Policy          : ${POLICY_VERSION}`,
  )

  console.log(
    `Scope           : ${ONLY_LESSON ?? 'ALL FULL-CHAPTER CONTEXTS'}`,
  )

  console.log(
    'Gemini calls    : 0',
  )

  console.log(
    'Groq calls      : 0',
  )

  console.log(
    'Supabase writes : 0\n',
  )

  const visualManifest =
    await loadVisualManifest()

  const entries =
    await readdir(
      CONTEXT_DIRECTORY,
      {
        withFileTypes:
          true,
      },
    )

  const contextFiles =
  entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(
          '.json',
        ) &&
        entry.name !==
          'manifest.json',
    )
    .map(
      (entry) =>
        path.resolve(
          CONTEXT_DIRECTORY,
          entry.name,
        ),
    )
    .sort()

  if (
    contextFiles.length ===
    0
  ) {
    throw new Error(
      'No full-chapter context JSON files found.',
    )
  }

  const selectedFiles:
    string[] = []

  for (
    const filePath
    of contextFiles
  ) {
    if (
      !ONLY_LESSON
    ) {
      selectedFiles.push(
        filePath,
      )

      continue
    }

    const context =
      await loadContext(
        filePath,
      )

    if (
      context.lessonKey ===
        ONLY_LESSON
    ) {
      selectedFiles.push(
        filePath,
      )
    }
  }

  if (
    selectedFiles.length ===
    0
  ) {
    throw new Error(
      `No canonical context found for lesson: ${ONLY_LESSON}`,
    )
  }

  const results:
    Awaited<
      ReturnType<
        typeof buildCatalog
      >
    >[] = []

  for (
    const filePath
    of selectedFiles
  ) {
    const result =
      await buildCatalog(
        filePath,
        visualManifest,
      )

    results.push(
      result,
    )

    console.log(
      `✓ ${result.lessonKey}`,
    )

    console.log(
      `  pages      : ${result.pageCount}`,
    )

    console.log(
      `  activities : ${result.activities}`,
    )

    console.log(
      `  examples   : ${result.examples}`,
    )

    console.log(
      `  figures    : ${result.figures}`,
    )

    console.log(
      `  tables     : ${result.tables}`,
    )

    console.log(
      `  total      : ${result.totalObjects}`,
    )

    console.log(
      `  visual PDF : ${
        result.visualSourceAvailable
          ? 'YES'
          : 'NO'
      }\n`,
    )
  }

  const manifest = {
    schemaVersion:
      SCHEMA_VERSION,

    catalogPolicyVersion:
      POLICY_VERSION,

    purpose:
      'CHALKBOX_DETERMINISTIC_SOURCE_OBJECT_CATALOG',

    lessonCount:
      results.length,

    lessons:
      results,

    builtAt:
      new Date()
        .toISOString(),
  }

  /*
   * Only write the global manifest when building every context.
   * A single-lesson rebuild should not silently replace it with
   * an incomplete manifest.
   */
  if (
    !ONLY_LESSON
  ) {
    await writeFile(
      OUTPUT_MANIFEST_FILE,

      `${JSON.stringify(
        manifest,
        null,
        2,
      )}\n`,

      'utf8',
    )
  }

  console.log(
    '==========================================',
  )

  console.log(
    ' Source Catalog Build PASSED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Catalogs built  : ${results.length}`,
  )

  console.log(
    'AI calls        : 0',
  )

  console.log(
    'Supabase writes : 0',
  )

  console.log(
    '\nOutput directory:',
  )

  console.log(
    path.relative(
      ROOT,
      OUTPUT_DIRECTORY,
    ),
  )

  if (
    !ONLY_LESSON
  ) {
    console.log(
      '\nManifest:',
    )

    console.log(
      path.relative(
        ROOT,
        OUTPUT_MANIFEST_FILE,
      ),
    )
  }

  console.log(
    '\nNEXT GATE:',
  )

  console.log(
    [
      'Run validate-source-catalog.ts.',
      'Do not regenerate Force and Laws of Motion yet.',
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
      ' Source Catalog Build FAILED',
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
      '\nNo Gemini call was made.',
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