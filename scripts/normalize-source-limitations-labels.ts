/// <reference types="node" />

import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises'

import path from 'node:path'
import process from 'node:process'

import {
  loadSourceCatalog,
} from './lib/source-catalog'

import {
  replaceUnsupportedClaimsInText,
  unsupportedEmbeddedSourceLabelClaims,
} from './lib/source-label-claims'

/* ============================================================
   CHALKBOX — SOURCE-LIMITATIONS LABEL NORMALIZATION v1

   PURPOSE

   Deterministically remove unsupported numbered textbook-label
   claims ONLY from sourceLimitations strings.

   Example:

     "adaptation of Activity 9.1 ..."

   becomes:

     "adaptation of the source material ..."

   ONLY when Activity 9.1 is absent from the deterministic
   source catalog.

   The script REFUSES to touch unsupported labels found in
   teacher-facing semantic content such as teacherScript,
   boardPlan, procedures, questions, or explanations.

   NO AI calls.
   NO semantic repair.
   NO Supabase writes.
   ============================================================ */

const ROOT =
  process.cwd()

const GENERATED_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'generated-demo-lessons-v5',
  )

const HISTORY_DIRECTORY =
  path.resolve(
    GENERATED_DIRECTORY,
    'history',
  )

const POLICY_VERSION =
  'chalkbox-source-limitations-label-normalization-v1'

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

  return argument
    ? argument
        .slice(
          prefix.length,
        )
        .trim()
    : null
}

const LESSON_KEY =
  cliValue(
    'lesson',
  ) ??
  'class-9-force-laws-motion'

const durationValue =
  cliValue(
    'duration',
  )

const DURATION =
  durationValue
    ? Number(
        durationValue,
      )
    : 40

if (
  !Number.isInteger(
    DURATION,
  ) ||
  DURATION < 15 ||
  DURATION > 120
) {
  throw new Error(
    '--duration must be an integer between 15 and 120.',
  )
}

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

async function fileExists(
  filePath: string,
) {
  try {
    await readFile(
      filePath,
    )

    return true
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
      return false
    }

    throw error
  }
}

function isSourceLimitationsPath(
  field: string,
) {
  return (
    field.includes(
      '.sourceLimitations[',
    ) ||
    field.startsWith(
      'sourceLimitations[',
    )
  )
}

function normalizeSourceLimitations(
  value: unknown,

  catalog:
    Awaited<
      ReturnType<
        typeof loadSourceCatalog
      >
    >,
) {
  let replacements =
    0

  function visit(
    current: unknown,
  ) {
    if (
      Array.isArray(
        current,
      )
    ) {
      current.forEach(
        (child) =>
          visit(
            child,
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
      if (
        key ===
          'sourceLimitations' &&
        Array.isArray(
          child,
        )
      ) {
        for (
          let index = 0;
          index <
            child.length;
          index += 1
        ) {
          if (
            typeof child[index] !==
              'string'
          ) {
            continue
          }

          const result =
            replaceUnsupportedClaimsInText(
              child[index],
              catalog,
            )

          if (
            result.replacements >
              0
          ) {
            child[index] =
              result.text

            replacements +=
              result.replacements
          }
        }
      } else {
        visit(
          child,
        )
      }
    }
  }

  visit(
    value,
  )

  return replacements
}

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Source-Limitations Normalizer',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Lesson          : ${LESSON_KEY}`,
  )

  console.log(
    `Duration        : ${DURATION} min`,
  )

  console.log(
    'Operation       : deterministic only',
  )

  console.log(
    'Semantic repair : NO',
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

  const artifactFile =
    path.resolve(
      GENERATED_DIRECTORY,
      `${LESSON_KEY}-${DURATION}min.json`,
    )

  const backupFile =
    path.resolve(
      HISTORY_DIRECTORY,
      `${LESSON_KEY}-${DURATION}min-before-source-limitations-label-normalization.json`,
    )

  const text =
    await readFile(
      artifactFile,
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
      'Generated artifact is not an object.',
    )
  }

  const artifact =
    parsed

  if (
    artifact.status !==
      'PROVENANCE_VALIDATED'
  ) {
    throw new Error(
      `Expected PROVENANCE_VALIDATED, found ${String(
        artifact.status,
      )}.`,
    )
  }

  if (
    !isObject(
      artifact.lesson,
    )
  ) {
    throw new Error(
      'Generated lesson object missing.',
    )
  }

  const catalog =
    await loadSourceCatalog(
      LESSON_KEY,
    )

  const unsupportedBefore =
    unsupportedEmbeddedSourceLabelClaims(
      artifact.lesson,
      catalog,
    )

  if (
    unsupportedBefore.length ===
      0
  ) {
    throw new Error(
      'No unsupported embedded source-label claims were found. Nothing to normalize.',
    )
  }

  const unsafeClaims =
    unsupportedBefore.filter(
      (claim) =>
        !isSourceLimitationsPath(
          claim.field,
        ),
    )

  if (
    unsafeClaims.length >
      0
  ) {
    throw new Error(
      [
        'Normalization refused.',
        '',
        'Unsupported textbook-label claims exist outside sourceLimitations:',

        ...unsafeClaims.map(
          (claim) =>
            `- ${claim.field}: ${claim.rawLabel}`,
        ),

        '',

        'These require semantic review/repair rather than deterministic wording normalization.',
      ].join('\n'),
    )
  }

  console.log(
    `✓ unsupported claims found: ${unsupportedBefore.length}`,
  )

  console.log(
    '✓ all unsupported claims confined to sourceLimitations',
  )

  await mkdir(
    HISTORY_DIRECTORY,
    {
      recursive:
        true,
    },
  )

  if (
    await fileExists(
      backupFile,
    )
  ) {
    throw new Error(
      [
        'Backup already exists.',
        'Normalization may already have been performed.',

        path.relative(
          ROOT,
          backupFile,
        ),
      ].join('\n'),
    )
  }

  await writeFile(
    backupFile,

    `${JSON.stringify(
      artifact,
      null,
      2,
    )}\n`,

    'utf8',
  )

  console.log(
    '✓ immutable pre-normalization backup created',
  )

  const replacements =
    normalizeSourceLimitations(
      artifact.lesson,
      catalog,
    )

  if (
    replacements !==
      unsupportedBefore.length
  ) {
    throw new Error(
      [
        'Replacement count mismatch.',
        `Expected=${unsupportedBefore.length}`,
        `Actual=${replacements}`,
      ].join(' '),
    )
  }

  const unsupportedAfter =
    unsupportedEmbeddedSourceLabelClaims(
      artifact.lesson,
      catalog,
    )

  if (
    unsupportedAfter.length !==
      0
  ) {
    throw new Error(
      'Unsupported embedded label claims remain after normalization.',
    )
  }

  const normalizationRecord = {
    policyVersion:
      POLICY_VERSION,

    type:
      'UNSUPPORTED_SOURCE_LIMITATIONS_LABEL_TO_GENERIC_SOURCE_REFERENCE',

    replacements,

    semanticRepair:
      false,

    llmCalls:
      0,

    teachingContentChanged:
      false,

    reason:
      'Unsupported numbered textbook-object labels were removed only from provenance/sourceLimitations wording and replaced with a generic source-material reference.',

    normalizedAt:
      new Date()
        .toISOString(),
  }

  if (
    Array.isArray(
      artifact
        .postGenerationNormalizations,
    )
  ) {
    artifact
      .postGenerationNormalizations
      .push(
        normalizationRecord,
      )
  } else {
    artifact
      .postGenerationNormalizations = [
        normalizationRecord,
      ]
  }

  if (
    !isObject(
      artifact.validation,
    )
  ) {
    throw new Error(
      'Generated validation object missing.',
    )
  }

  artifact.validation.embeddedSourceLabelClaims =
    'PASS'

  await writeFile(
    artifactFile,

    `${JSON.stringify(
      artifact,
      null,
      2,
    )}\n`,

    'utf8',
  )

  console.log(
    '\n==========================================',
  )

  console.log(
    ' Source-Limitations Normalization PASSED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Claims normalized : ${replacements}`,
  )

  console.log(
    'Teaching content  : unchanged',
  )

  console.log(
    'Semantic repair   : NO',
  )

  console.log(
    'Gemini calls      : 0',
  )

  console.log(
    'Supabase writes   : 0',
  )

  console.log(
    '\nBackup:',
  )

  console.log(
    path.relative(
      ROOT,
      backupFile,
    ),
  )

  console.log(
    '\nNormalized artifact:',
  )

  console.log(
    path.relative(
      ROOT,
      artifactFile,
    ),
  )

  console.log(
    '\nNEXT GATE:',
  )

  console.log(
    'Run validate-generated-source-claims.ts again.\n',
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
      ' Source-Limitations Normalization FAILED',
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
      '\nNo AI call was made.',
    )

    console.error(
      'No Supabase data was changed.\n',
    )

    process.exitCode =
      1
  },
)