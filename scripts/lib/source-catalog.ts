/// <reference types="node" />

import {
  readFile,
} from 'node:fs/promises'

import {
  createHash,
} from 'node:crypto'

import path from 'node:path'
import process from 'node:process'

/* ============================================================
   CHALKBOX — SOURCE CATALOG RUNTIME v1

   Used by Generator v5 and later production ingestion.

   It provides:

   - loading
   - integrity validation
   - exact provenance lookup
   - prompt-safe catalog formatting

   NO AI calls.
   NO Supabase writes.
   ============================================================ */

const ROOT =
  process.cwd()

const CATALOG_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'source-catalog-v1',
  )

export const SOURCE_CATALOG_POLICY =
  'chalkbox-source-catalog-v1'

export type SourceObjectKind =
  | 'ACTIVITY'
  | 'EXAMPLE'
  | 'FIGURE'
  | 'TABLE'

export type CatalogSourceObject = {
  kind: SourceObjectKind

  canonicalId: string

  preferredSourceLabel: string

  printedLabels: string[]

  sourcePages: number[]

  occurrenceCount: number

  firstOccurrencePage: number

  firstOccurrenceSnippet: string
}

export type SourceCatalog = {
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
    activities: CatalogSourceObject[]
    examples: CatalogSourceObject[]
    figures: CatalogSourceObject[]
    tables: CatalogSourceObject[]
  }

  provenanceRules: Record<
    string,
    string[]
  >

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

  builtAt: string
}

export type CatalogCompatibleContext = {
  lessonKey: string
  classLevel: number
  subject: string
  title: string
  sourceFileName: string

  firstPage: number
  lastPage: number
  pageCount: number

  pages: Array<{
    pageNumber: number
    content: string
  }>
}

/* ============================================================
   HELPERS
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
    CatalogCompatibleContext,
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

function normalizeLabel(
  value: string,
) {
  return value
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}

/* ============================================================
   LOAD
   ============================================================ */

export type LoadedSourceCatalogArtifact = {
  catalog: SourceCatalog
  artifactSha256: string
  filePath: string
}

export async function loadSourceCatalogArtifact(
  lessonKey: string,
): Promise<LoadedSourceCatalogArtifact> {
  const filePath =
    path.resolve(
      CATALOG_DIRECTORY,
      `${lessonKey}.json`,
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
      `${lessonKey}: source catalog is not an object.`,
    )
  }

  const catalog =
    parsed as
      unknown as
      SourceCatalog

  if (
    catalog.schemaVersion !==
      1
  ) {
    throw new Error(
      `${lessonKey}: unsupported source catalog schema.`,
    )
  }

  if (
    catalog.catalogPolicyVersion !==
      SOURCE_CATALOG_POLICY
  ) {
    throw new Error(
      [
        `${lessonKey}: source catalog policy mismatch.`,
        `Expected=${SOURCE_CATALOG_POLICY}`,
        `Found=${catalog.catalogPolicyVersion}`,
      ].join(' '),
    )
  }

  if (
    catalog.lessonKey !==
      lessonKey
  ) {
    throw new Error(
      `${lessonKey}: source catalog lessonKey mismatch.`,
    )
  }

  return {
    catalog,
    artifactSha256:
      sha256(
        text,
      ),
    filePath,
  }
}

export async function loadSourceCatalog(
  lessonKey: string,
) {
  const loaded =
    await loadSourceCatalogArtifact(
      lessonKey,
    )

  return loaded.catalog
}

/* ============================================================
   VERIFY AGAINST CURRENT CANONICAL CONTEXT
   ============================================================ */

export function assertCatalogMatchesContext(
  catalog:
    SourceCatalog,

  context:
    CatalogCompatibleContext,
) {
  if (
    catalog.lessonKey !==
      context.lessonKey
  ) {
    throw new Error(
      'Source catalog/context lessonKey mismatch.',
    )
  }

  if (
    catalog.classLevel !==
      context.classLevel ||
    catalog.subject !==
      context.subject ||
    catalog.title !==
      context.title ||
    catalog.sourceFileName !==
      context.sourceFileName
  ) {
    throw new Error(
      `${context.lessonKey}: source catalog metadata mismatch.`,
    )
  }

  if (
    catalog.canonicalSource
      .pageStart !==
      context.firstPage ||
    catalog.canonicalSource
      .pageEnd !==
      context.lastPage ||
    catalog.canonicalSource
      .pageCount !==
      context.pageCount
  ) {
    throw new Error(
      `${context.lessonKey}: source catalog page metadata mismatch.`,
    )
  }

  const currentHash =
    canonicalHash(
      context,
    )

  if (
    catalog.canonicalSource
      .canonicalContentSha256 !==
      currentHash
  ) {
    throw new Error(
      [
        `${context.lessonKey}: canonical source changed after catalog creation.`,
        '',
        'Rebuild and validate the source catalog before generation.',
      ].join('\n'),
    )
  }
}

/* ============================================================
   OBJECT ACCESS
   ============================================================ */

export function objectsForKind(
  catalog:
    SourceCatalog,

  kind:
    SourceObjectKind,
) {
  switch (
    kind
  ) {
    case 'ACTIVITY':
      return catalog
        .sourceObjects
        .activities

    case 'EXAMPLE':
      return catalog
        .sourceObjects
        .examples

    case 'FIGURE':
      return catalog
        .sourceObjects
        .figures

    case 'TABLE':
      return catalog
        .sourceObjects
        .tables
  }
}

/* ============================================================
   EXACT LABEL LOOKUP

   We intentionally require the catalog's preferred exact label,
   while normalizing whitespace only.
   ============================================================ */

export function findCatalogObjectByExactLabel(
  catalog:
    SourceCatalog,

  kind:
    SourceObjectKind,

  label:
    string | null,
) {
  if (
    label ===
      null
  ) {
    return null
  }

  const normalized =
    normalizeLabel(
      label,
    )

  return (
    objectsForKind(
      catalog,
      kind,
    ).find(
      (item) =>
        normalizeLabel(
          item.preferredSourceLabel,
        ) ===
          normalized,
    ) ??
    null
  )
}

/* ============================================================
   VISUAL LOOKUP

   TEXTBOOK_VISUAL may correspond to either a figure or table.
   ============================================================ */

export function findVisualCatalogObject(
  catalog:
    SourceCatalog,

  label:
    string | null,
) {
  return (
    findCatalogObjectByExactLabel(
      catalog,
      'FIGURE',
      label,
    ) ??
    findCatalogObjectByExactLabel(
      catalog,
      'TABLE',
      label,
    )
  )
}

/* ============================================================
   PAGE OVERLAP
   ============================================================ */

export function sourcePagesOverlap(
  claimedPages:
    number[],

  catalogPages:
    number[],
) {
  return claimedPages.some(
    (page) =>
      catalogPages.includes(
        page,
      ),
  )
}

/* ============================================================
   PROMPT FORMAT

   Genuine objects plus canonical pages only.
   ============================================================ */

function formatObjects(
  objects:
    CatalogSourceObject[],
) {
  if (
    objects.length ===
      0
  ) {
    return '(NONE)'
  }

  return objects
    .map(
      (item) =>
        [
          `- ${item.preferredSourceLabel}`,
          `canonical pages: [${item.sourcePages.join(
            ', ',
          )}]`,
        ].join(
          ' | ',
        ),
    )
    .join('\n')
}

export function sourceCatalogPromptBlock(
  catalog:
    SourceCatalog,
) {
  return `
============================================================
DETERMINISTIC SOURCE OBJECT CATALOG
============================================================

The following catalog was extracted deterministically from the
canonical textbook BEFORE lesson generation.

You MUST NOT invent textbook Activity, Example, Figure or Table
labels.

------------------------------------------------------------
ALLOWED TEXTBOOK ACTIVITIES
------------------------------------------------------------

${formatObjects(
  catalog
    .sourceObjects
    .activities,
)}

------------------------------------------------------------
ALLOWED TEXTBOOK EXAMPLES
------------------------------------------------------------

${formatObjects(
  catalog
    .sourceObjects
    .examples,
)}

------------------------------------------------------------
ALLOWED TEXTBOOK FIGURES
------------------------------------------------------------

${formatObjects(
  catalog
    .sourceObjects
    .figures,
)}

------------------------------------------------------------
ALLOWED TEXTBOOK TABLES
------------------------------------------------------------

${formatObjects(
  catalog
    .sourceObjects
    .tables,
)}

============================================================
CATALOG PROVENANCE RULE
============================================================

TEXTBOOK_ACTIVITY:

sourceLabel MUST exactly match one item under
ALLOWED TEXTBOOK ACTIVITIES.

If no suitable listed activity exists:

use CHALKBOX_ACTIVITY
and
sourceLabel=null.

TEXTBOOK_EXAMPLE:

sourceLabel MUST exactly match one item under
ALLOWED TEXTBOOK EXAMPLES.

If the source explains a useful phenomenon/problem/application
but it is not present in ALLOWED TEXTBOOK EXAMPLES:

use CHALKBOX_EXAMPLE
and
sourceLabel=null.

TEXTBOOK_VISUAL:

sourceLabel MUST exactly match one item under either:

ALLOWED TEXTBOOK FIGURES

or

ALLOWED TEXTBOOK TABLES.

If creating a teacher-friendly adaptation/redraw instead:

use BOARD_VISUAL
and
sourceLabel=null.

CRITICAL:

A correct-looking number such as "Activity 9.5" is INVALID
unless that exact label appears in this deterministic catalog.

Do not infer numbering sequences.

Do not invent missing labels.

Do not transform an unlabelled textbook explanation into a
TEXTBOOK_EXAMPLE.

The catalog is authoritative for whether labelled textbook
objects exist.
`.trim()
}
