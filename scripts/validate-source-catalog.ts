/// <reference types="node" />

import {
  readFile,
  readdir,
} from 'node:fs/promises'

import {
  createHash,
} from 'node:crypto'

import path from 'node:path'
import process from 'node:process'

/* ============================================================
   CHALKBOX — SOURCE CATALOG VALIDATOR v1

   PURPOSE

   Independently verify every deterministic source catalog
   against the canonical chapter text.

   Checks:

   - metadata
   - canonical hash
   - canonical page range
   - source object labels
   - source object pages
   - allowed-label arrays
   - duplicate IDs
   - visual/canonical mapping
   - manifest completeness

   NO AI calls.

   ============================================================ */

const ROOT =
  process.cwd()

const CONTEXT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'full-chapter-context-v1',
  )

const CATALOG_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'source-catalog-v1',
  )

const CATALOG_MANIFEST_FILE =
  path.resolve(
    CATALOG_DIRECTORY,
    'manifest.json',
  )

const VISUAL_MANIFEST_FILE =
  path.resolve(
    ROOT,
    'data',
    'visual-source-v1',
    'manifest.json',
  )

const EXPECTED_POLICY =
  'chalkbox-source-catalog-v1'

/* ============================================================
   TYPES
   ============================================================ */

type CanonicalPage = {
  pageNumber: number
  content: string
}

type FullChapterContext = {
  contextMode: string
  lessonKey: string
  classLevel: number
  subject: string
  title: string
  sourceFileName: string
  firstPage: number
  lastPage: number
  pageCount: number
  pages: CanonicalPage[]
}

type SourceObject = {
  kind:
    | 'ACTIVITY'
    | 'EXAMPLE'
    | 'FIGURE'
    | 'TABLE'

  canonicalId: string

  preferredSourceLabel: string

  printedLabels: string[]

  sourcePages: number[]

  occurrenceCount: number

  firstOccurrencePage: number

  firstOccurrenceSnippet: string
}

type Catalog = {
  schemaVersion: number

  catalogPolicyVersion: string

  lessonKey: string

  classLevel: number

  subject: string

  title: string

  sourceFileName: string

  canonicalSource: {
    pageStart: number
    pageEnd: number
    pageCount: number
    approxTokenCount: number
    canonicalContentSha256: string
  }

  allowedTextbookLabels: {
    activities: string[]
    examples: string[]
    figures: string[]
    tables: string[]
  }

  sourceObjects: {
    activities: SourceObject[]
    examples: SourceObject[]
    figures: SourceObject[]
    tables: SourceObject[]
  }

  visualSource: {
    available: boolean
    outputFileName: string | null
    outputSha256: string | null
    pageCount: number | null
    pageMappings: Array<{
      chapterPage: number
      sourcePdfPage: number
      textbookPageLabel: number
    }>
  }

  statistics: {
    activities: number
    examples: number
    figureLabels: number
    tableLabels: number
    totalLabelledSourceObjects: number
  }
}

type VisualManifest = {
  results: Array<{
    lessonKey: string
    outputFileName: string
    outputSha256: string
    pageCount: number
    pageMappings: Array<{
      chapterPage: number
      sourcePdfPage: number
      textbookPageLabel: number
    }>
  }>
}

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

function canonicalHash(
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

function uniqueStrings(
  values: string[],
) {
  return [
    ...new Set(
      values,
    ),
  ]
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

/* ============================================================
   LOAD JSON
   ============================================================ */

async function readJson<T>(
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
      `Expected JSON object: ${filePath}`,
    )
  }

  return parsed as
    unknown as
    T
}

/* ============================================================
   VALIDATE ONE SOURCE OBJECT
   ============================================================ */

function validateSourceObject(
  sourceObject:
    SourceObject,

  context:
    FullChapterContext,

  expectedKind:
    SourceObject['kind'],
) {
  const errors:
    string[] = []

  if (
    sourceObject.kind !==
      expectedKind
  ) {
    errors.push(
      `kind mismatch: expected ${expectedKind}, found ${sourceObject.kind}`,
    )
  }

  if (
    !sourceObject.preferredSourceLabel
  ) {
    errors.push(
      'preferredSourceLabel missing',
    )
  }

  if (
    !Array.isArray(
      sourceObject.sourcePages,
    ) ||
    sourceObject.sourcePages.length ===
      0
  ) {
    errors.push(
      'sourcePages empty',
    )

    return errors
  }

  for (
    const pageNumber
    of sourceObject.sourcePages
  ) {
    const page =
      context.pages.find(
        (candidate) =>
          candidate.pageNumber ===
          pageNumber,
      )

    if (!page) {
      errors.push(
        `invalid canonical page ${pageNumber}`,
      )

      continue
    }

    const pageText =
      normalize(
        page.content,
      )

    /*
     * At least one known printed representation must appear on
     * the claimed canonical page.
     */
    const labelFound =
      sourceObject
        .printedLabels
        .some(
          (label) =>
            pageText.includes(
              normalize(
                label,
              ),
            ),
        )

    if (
      !labelFound
    ) {
      errors.push(
        [
          `no catalogued printed label found on page ${pageNumber}`,
          `for ${sourceObject.canonicalId}`,
        ].join(' '),
      )
    }
  }

  if (
    !sourceObject.sourcePages.includes(
      sourceObject
        .firstOccurrencePage,
    )
  ) {
    errors.push(
      'firstOccurrencePage is not present in sourcePages',
    )
  }

  if (
    sourceObject.occurrenceCount <
      sourceObject.sourcePages.length
  ) {
    errors.push(
      'occurrenceCount is smaller than unique source-page count',
    )
  }

  return errors
}

/* ============================================================
   VALIDATE ONE CATALOG
   ============================================================ */

async function validateCatalog(
  catalogFile:
    string,

  visualManifest:
    VisualManifest,
) {
  const catalog =
    await readJson<Catalog>(
      catalogFile,
    )

  const contextFile =
    path.resolve(
      CONTEXT_DIRECTORY,
      `${catalog.lessonKey}.json`,
    )

  const context =
    await readJson<FullChapterContext>(
      contextFile,
    )

  const errors:
    string[] = []

  const warnings:
    string[] = []

  /* ----------------------------------------------------------
     Metadata
     ---------------------------------------------------------- */

  if (
    catalog.schemaVersion !==
      1
  ) {
    errors.push(
      `schemaVersion=${catalog.schemaVersion}, expected 1`,
    )
  }

  if (
    catalog.catalogPolicyVersion !==
      EXPECTED_POLICY
  ) {
    errors.push(
      'catalogPolicyVersion mismatch',
    )
  }

  if (
    context.contextMode !==
      'FULL_CHAPTER'
  ) {
    errors.push(
      'canonical context is not FULL_CHAPTER',
    )
  }

  if (
    catalog.lessonKey !==
      context.lessonKey
  ) {
    errors.push(
      'lessonKey mismatch',
    )
  }

  if (
    catalog.classLevel !==
      context.classLevel
  ) {
    errors.push(
      'classLevel mismatch',
    )
  }

  if (
    catalog.subject !==
      context.subject
  ) {
    errors.push(
      'subject mismatch',
    )
  }

  if (
    catalog.title !==
      context.title
  ) {
    errors.push(
      'title mismatch',
    )
  }

  if (
    catalog.sourceFileName !==
      context.sourceFileName
  ) {
    errors.push(
      'sourceFileName mismatch',
    )
  }

  /* ----------------------------------------------------------
     Canonical source integrity
     ---------------------------------------------------------- */

  if (
    catalog.canonicalSource
      .pageStart !==
      context.firstPage
  ) {
    errors.push(
      'canonical pageStart mismatch',
    )
  }

  if (
    catalog.canonicalSource
      .pageEnd !==
      context.lastPage
  ) {
    errors.push(
      'canonical pageEnd mismatch',
    )
  }

  if (
    catalog.canonicalSource
      .pageCount !==
      context.pageCount
  ) {
    errors.push(
      'canonical pageCount mismatch',
    )
  }

  const expectedHash =
    canonicalHash(
      context,
    )

  if (
    catalog.canonicalSource
      .canonicalContentSha256 !==
      expectedHash
  ) {
    errors.push(
      'canonical content SHA-256 mismatch',
    )
  }

  /* ----------------------------------------------------------
     Object validation
     ---------------------------------------------------------- */

  const groups = [
    {
      kind:
        'ACTIVITY' as const,

      objects:
        catalog
          .sourceObjects
          .activities,

      labels:
        catalog
          .allowedTextbookLabels
          .activities,
    },

    {
      kind:
        'EXAMPLE' as const,

      objects:
        catalog
          .sourceObjects
          .examples,

      labels:
        catalog
          .allowedTextbookLabels
          .examples,
    },

    {
      kind:
        'FIGURE' as const,

      objects:
        catalog
          .sourceObjects
          .figures,

      labels:
        catalog
          .allowedTextbookLabels
          .figures,
    },

    {
      kind:
        'TABLE' as const,

      objects:
        catalog
          .sourceObjects
          .tables,

      labels:
        catalog
          .allowedTextbookLabels
          .tables,
    },
  ]

  const allIds:
    string[] = []

  for (
    const group
    of groups
  ) {
    if (
      !Array.isArray(
        group.objects,
      )
    ) {
      errors.push(
        `${group.kind}: source object array missing`,
      )

      continue
    }

    for (
      const sourceObject
      of group.objects
    ) {
      allIds.push(
        sourceObject.canonicalId,
      )

      const objectErrors =
        validateSourceObject(
          sourceObject,
          context,
          group.kind,
        )

      for (
        const objectError
        of objectErrors
      ) {
        errors.push(
          `${sourceObject.canonicalId}: ${objectError}`,
        )
      }
    }

    const expectedLabels =
      group.objects.map(
        (item) =>
          item.preferredSourceLabel,
      )

    if (
      !sameStringArray(
        expectedLabels,
        group.labels,
      )
    ) {
      errors.push(
        `${group.kind}: allowed label array does not match source objects`,
      )
    }

    if (
      uniqueStrings(
        group.labels,
      ).length !==
      group.labels.length
    ) {
      errors.push(
        `${group.kind}: duplicate allowed source label`,
      )
    }
  }

  if (
    uniqueStrings(
      allIds,
    ).length !==
    allIds.length
  ) {
    errors.push(
      'duplicate canonical source-object ID',
    )
  }

  /* ----------------------------------------------------------
     Statistics
     ---------------------------------------------------------- */

  if (
    catalog.statistics
      .activities !==
      catalog.sourceObjects
        .activities.length
  ) {
    errors.push(
      'activity statistic mismatch',
    )
  }

  if (
    catalog.statistics
      .examples !==
      catalog.sourceObjects
        .examples.length
  ) {
    errors.push(
      'example statistic mismatch',
    )
  }

  if (
    catalog.statistics
      .figureLabels !==
      catalog.sourceObjects
        .figures.length
  ) {
    errors.push(
      'figure statistic mismatch',
    )
  }

  if (
    catalog.statistics
      .tableLabels !==
      catalog.sourceObjects
        .tables.length
  ) {
    errors.push(
      'table statistic mismatch',
    )
  }

  const expectedTotal =
    catalog.sourceObjects
      .activities.length +
    catalog.sourceObjects
      .examples.length +
    catalog.sourceObjects
      .figures.length +
    catalog.sourceObjects
      .tables.length

  if (
    catalog.statistics
      .totalLabelledSourceObjects !==
      expectedTotal
  ) {
    errors.push(
      'total source-object statistic mismatch',
    )
  }

  /* ----------------------------------------------------------
     Visual source consistency
     ---------------------------------------------------------- */

  const visualRecord =
    visualManifest.results.find(
      (item) =>
        item.lessonKey ===
        catalog.lessonKey,
    )

  if (
    visualRecord
  ) {
    if (
      catalog.visualSource
        .available !==
        true
    ) {
      errors.push(
        'visual manifest exists but catalog says visual unavailable',
      )
    } else {
      if (
        catalog.visualSource
          .outputFileName !==
          visualRecord.outputFileName
      ) {
        errors.push(
          'visual outputFileName mismatch',
        )
      }

      if (
        catalog.visualSource
          .outputSha256 !==
          visualRecord.outputSha256
      ) {
        errors.push(
          'visual SHA-256 mismatch',
        )
      }

      if (
        catalog.visualSource
          .pageCount !==
          visualRecord.pageCount
      ) {
        errors.push(
          'visual pageCount mismatch',
        )
      }

      if (
        catalog.visualSource
          .pageMappings.length !==
          context.pageCount
      ) {
        errors.push(
          'visual page-map count mismatch',
        )
      }

      for (
        let index = 0;
        index <
          catalog.visualSource
            .pageMappings.length;
        index += 1
      ) {
        const mapping =
          catalog.visualSource
            .pageMappings[index]

        const canonicalPage =
          context.pages[index]

        if (
          mapping.chapterPage !==
            index + 1
        ) {
          errors.push(
            `visual chapterPage mismatch at index ${index}`,
          )
        }

        if (
          mapping.textbookPageLabel !==
            canonicalPage.pageNumber
        ) {
          errors.push(
            `visual/canonical page mismatch at index ${index}`,
          )
        }
      }
    }
  } else {
    if (
      catalog.visualSource
        .available ===
        true
    ) {
      warnings.push(
        'catalog claims visual source, but current visual manifest has no matching lesson',
      )
    }
  }

  return {
    lessonKey:
      catalog.lessonKey,

    title:
      catalog.title,

    activities:
      catalog.sourceObjects
        .activities.length,

    examples:
      catalog.sourceObjects
        .examples.length,

    figures:
      catalog.sourceObjects
        .figures.length,

    tables:
      catalog.sourceObjects
        .tables.length,

    totalObjects:
      expectedTotal,

    errors,

    warnings,
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
    ' ChalkBox Source Catalog Validator v1',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Expected policy : ${EXPECTED_POLICY}`,
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
    await readJson<VisualManifest>(
      VISUAL_MANIFEST_FILE,
    )

  const entries =
    await readdir(
      CATALOG_DIRECTORY,
      {
        withFileTypes:
          true,
      },
    )

  const catalogFiles =
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
            CATALOG_DIRECTORY,
            entry.name,
          ),
      )
      .sort()

  if (
    catalogFiles.length ===
    0
  ) {
    throw new Error(
      'No source catalogs found.',
    )
  }

  const results:
    Awaited<
      ReturnType<
        typeof validateCatalog
      >
    >[] = []

  for (
    const file
    of catalogFiles
  ) {
    const result =
      await validateCatalog(
        file,
        visualManifest,
      )

    results.push(
      result,
    )

    const status =
      result.errors.length ===
        0
        ? 'PASS'
        : 'FAIL'

    console.log(
      `${status === 'PASS'
        ? '✓'
        : '✗'} ${result.lessonKey}`,
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
      `  errors     : ${result.errors.length}`,
    )

    console.log(
      `  warnings   : ${result.warnings.length}`,
    )

    if (
      result.errors.length >
        0
    ) {
      for (
        const error
        of result.errors
      ) {
        console.log(
          `    ERROR: ${error}`,
        )
      }
    }

    if (
      result.warnings.length >
        0
    ) {
      for (
        const warning
        of result.warnings
      ) {
        console.log(
          `    WARNING: ${warning}`,
        )
      }
    }

    console.log()
  }

  /* ----------------------------------------------------------
     Verify catalog manifest
     ---------------------------------------------------------- */

  const catalogManifest =
    await readJson<{
      schemaVersion: number
      catalogPolicyVersion: string
      lessonCount: number
      lessons: Array<{
        lessonKey: string
      }>
    }>(
      CATALOG_MANIFEST_FILE,
    )

  const manifestKeys =
    catalogManifest.lessons
      .map(
        (item) =>
          item.lessonKey,
      )
      .sort()

  const validatedKeys =
    results
      .map(
        (item) =>
          item.lessonKey,
      )
      .sort()

  const manifestComplete =
    (
      catalogManifest
        .lessonCount ===
        results.length &&
      JSON.stringify(
        manifestKeys,
      ) ===
        JSON.stringify(
          validatedKeys,
        )
    )

  if (
    !manifestComplete
  ) {
    throw new Error(
      [
        'Source catalog manifest does not match validated catalog files.',
        `Manifest lessons=${catalogManifest.lessonCount}`,
        `Validated catalogs=${results.length}`,
      ].join('\n'),
    )
  }

  const totalErrors =
    results.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.errors.length,
      0,
    )

  const totalWarnings =
    results.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.warnings.length,
      0,
    )

  console.log(
    '==========================================',
  )

  console.log(
    totalErrors ===
      0
      ? ' Source Catalog Validation PASSED'
      : ' Source Catalog Validation FAILED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Catalogs validated : ${results.length}`,
  )

  console.log(
    `Total errors       : ${totalErrors}`,
  )

  console.log(
    `Total warnings     : ${totalWarnings}`,
  )

  console.log(
    `Manifest complete  : ${
      manifestComplete
        ? 'YES'
        : 'NO'
    }`,
  )

  console.log(
    'Gemini calls       : 0',
  )

  console.log(
    'Groq calls         : 0',
  )

  console.log(
    'Supabase writes    : 0',
  )

  console.log()

  if (
    totalErrors >
      0
  ) {
    console.log(
      'Do NOT update the generator yet.\n',
    )

    process.exitCode =
      2

    return
  }

  console.log(
    'NEXT GATE:',
  )

  console.log(
    [
      'Inspect the Force and Laws catalog.',
      'Confirm whether Activity 9.5 is absent.',
      'Then upgrade Generator v4 to Generator v5 so models can',
      'only select textbook provenance from this catalog.',
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
      ' Source Catalog Validation FAILED',
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