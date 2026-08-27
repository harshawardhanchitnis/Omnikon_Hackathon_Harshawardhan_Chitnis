/// <reference types="node" />

import type {
  SourceCatalog,
} from './source-catalog'

/* ============================================================
   CHALKBOX — EMBEDDED SOURCE-LABEL CLAIM SCANNER v1

   PURPOSE

   Detect textbook labels mentioned anywhere inside generated
   lesson strings, not only in structured sourceLabel fields.

   This closes a provenance loophole such as:

     sourceType: CHALKBOX_ACTIVITY
     sourceLabel: null
     sourceLimitations: [
       "Adapted from Activity 9.1 ..."
     ]

   when Activity 9.1 is not actually catalogued.

   The scanner is deterministic and uses the source catalog as
   the only authority for numbered textbook-object existence.

   NO AI calls.
   NO Supabase writes.
   ============================================================ */

export type EmbeddedSourceLabelKind =
  | 'ACTIVITY'
  | 'EXAMPLE'
  | 'FIGURE'
  | 'TABLE'

export type EmbeddedSourceLabelClaim = {
  field: string
  rawLabel: string
  kind: EmbeddedSourceLabelKind
  number: string
  canonicalId: string
  supported: boolean
}

const LABEL_REGEX =
  /\b(Activity|Example|Fig(?:ure)?\.?)\s+(\d+\.\d+(?:\.\d+)*)\b|\b(Table)\s+(\d+\.\d+(?:\.\d+)*)\b/gi

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function kindFromToken(
  token: string,
): EmbeddedSourceLabelKind {
  const normalized =
    token
      .replace(/\./g, '')
      .trim()
      .toUpperCase()

  if (
    normalized === 'FIG' ||
    normalized === 'FIGURE'
  ) {
    return 'FIGURE'
  }

  if (
    normalized === 'ACTIVITY'
  ) {
    return 'ACTIVITY'
  }

  if (
    normalized === 'EXAMPLE'
  ) {
    return 'EXAMPLE'
  }

  return 'TABLE'
}

function catalogIds(
  catalog: SourceCatalog,
) {
  return new Set<string>([
    ...catalog.sourceObjects.activities.map(
      (item) =>
        item.canonicalId,
    ),

    ...catalog.sourceObjects.examples.map(
      (item) =>
        item.canonicalId,
    ),

    ...catalog.sourceObjects.figures.map(
      (item) =>
        item.canonicalId,
    ),

    ...catalog.sourceObjects.tables.map(
      (item) =>
        item.canonicalId,
    ),
  ])
}

export function claimsInString(
  value: string,
  field: string,
  catalog: SourceCatalog,
) {
  const ids =
    catalogIds(
      catalog,
    )

  const claims:
    EmbeddedSourceLabelClaim[] = []

  const regex =
    new RegExp(
      LABEL_REGEX.source,
      LABEL_REGEX.flags,
    )

  for (
    const match
    of value.matchAll(
      regex,
    )
  ) {
    const token =
      match[1] ??
      match[3]

    const number =
      match[2] ??
      match[4]

    if (
      !token ||
      !number ||
      !match[0]
    ) {
      continue
    }

    const kind =
      kindFromToken(
        token,
      )

    const canonicalId =
      `${kind}:${number}`

    claims.push({
      field,

      rawLabel:
        match[0],

      kind,

      number,

      canonicalId,

      supported:
        ids.has(
          canonicalId,
        ),
    })
  }

  return claims
}

export function scanEmbeddedSourceLabelClaims(
  value: unknown,
  catalog: SourceCatalog,
) {
  const claims:
    EmbeddedSourceLabelClaim[] = []

  function visit(
    current: unknown,
    field: string,
  ) {
    if (
      typeof current ===
        'string'
    ) {
      claims.push(
        ...claimsInString(
          current,
          field,
          catalog,
        ),
      )

      return
    }

    if (
      Array.isArray(
        current,
      )
    ) {
      current.forEach(
        (
          child,
          index,
        ) =>
          visit(
            child,
            `${field}[${index}]`,
          ),
      )

      return
    }

    if (
      !isObject(
        current,
      )
    ) {
      return
    }

    for (
      const [
        key,
        child,
      ]
      of Object.entries(
        current,
      )
    ) {
      visit(
        child,

        field
          ? `${field}.${key}`
          : key,
      )
    }
  }

  visit(
    value,
    '',
  )

  return claims
}

export function unsupportedEmbeddedSourceLabelClaims(
  value: unknown,
  catalog: SourceCatalog,
) {
  return scanEmbeddedSourceLabelClaims(
    value,
    catalog,
  ).filter(
    (claim) =>
      !claim.supported,
  )
}

export function replaceUnsupportedClaimsInText(
  value: string,
  catalog: SourceCatalog,
) {
  const ids =
    catalogIds(
      catalog,
    )

  const regex =
    new RegExp(
      LABEL_REGEX.source,
      LABEL_REGEX.flags,
    )

  let replacements =
    0

  const text =
    value.replace(
      regex,

      (
        ...args:
          unknown[]
      ) => {
        const fullMatch =
          String(
            args[0] ??
            '',
          )

        const activityExampleFigureToken =
          typeof args[1] ===
            'string'
            ? args[1]
            : null

        const activityExampleFigureNumber =
          typeof args[2] ===
            'string'
            ? args[2]
            : null

        const tableToken =
          typeof args[3] ===
            'string'
            ? args[3]
            : null

        const tableNumber =
          typeof args[4] ===
            'string'
            ? args[4]
            : null

        const token =
          activityExampleFigureToken ??
          tableToken

        const number =
          activityExampleFigureNumber ??
          tableNumber

        if (
          !token ||
          !number
        ) {
          return fullMatch
        }

        const kind =
          kindFromToken(
            token,
          )

        const canonicalId =
          `${kind}:${number}`

        if (
          ids.has(
            canonicalId,
          )
        ) {
          return fullMatch
        }

        replacements +=
          1

        return (
          'the source material'
        )
      },
    )

  return {
    text,
    replacements,
  }
}