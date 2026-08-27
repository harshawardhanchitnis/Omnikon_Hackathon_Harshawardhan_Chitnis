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
  scanEmbeddedSourceLabelClaims,
} from './lib/source-label-claims'

/* ============================================================
   CHALKBOX — GENERATED SOURCE-CLAIM AUDIT v1

   PURPOSE

   Deterministically verify every numbered Activity / Example /
   Figure / Table claim mentioned anywhere in a generated v5
   lesson, including free-text fields such as:

   - teacherScript
   - teacherMoves
   - sourceLimitations
   - boardPlan
   - activity instructions

   This is a mandatory gate before independent semantic audit.

   NO AI calls.
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

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'source-claim-audits-v1',
  )

const POLICY_VERSION =
  'chalkbox-source-claim-audit-v1'

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

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Embedded Source-Claim Audit',
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
    `Policy          : ${POLICY_VERSION}`,
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

  const artifactText =
    await readFile(
      artifactFile,
      'utf8',
    )

  const parsed:
    unknown =
    JSON.parse(
      artifactText,
    )

  if (
    !isObject(
      parsed,
    )
  ) {
    throw new Error(
      'Generated artifact is not a JSON object.',
    )
  }

  const artifact =
    parsed

  if (
    artifact.status !==
      'PROVENANCE_VALIDATED'
  ) {
    throw new Error(
      [
        'Generated artifact is not provenance validated.',
        `Found=${String(
          artifact.status,
        )}`,
      ].join('\n'),
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

  if (
    artifact.lesson.lessonKey !==
      LESSON_KEY
  ) {
    throw new Error(
      'Generated lesson key mismatch.',
    )
  }

  if (
    artifact.lesson.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Generated lesson duration mismatch.',
    )
  }

  if (
    !isObject(
      artifact.source,
    )
  ) {
    throw new Error(
      'Generated source metadata missing.',
    )
  }

  if (
    !isObject(
      artifact.source
        .sourceCatalog,
    )
  ) {
    throw new Error(
      'Generated sourceCatalog metadata missing.',
    )
  }

  const catalog =
    await loadSourceCatalog(
      LESSON_KEY,
    )

  if (
    artifact
      .source
      .sourceCatalog
      .canonicalContentSha256 !==
    catalog
      .canonicalSource
      .canonicalContentSha256
  ) {
    throw new Error(
      'Generated artifact/catalog canonical SHA mismatch.',
    )
  }

  console.log(
    '✓ v5 artifact: PROVENANCE_VALIDATED',
  )

  console.log(
    '✓ source catalog SHA: VERIFIED',
  )

  const claims =
    scanEmbeddedSourceLabelClaims(
      artifact.lesson,
      catalog,
    )

  const supported =
    claims.filter(
      (claim) =>
        claim.supported,
    )

  const unsupported =
    claims.filter(
      (claim) =>
        !claim.supported,
    )

  console.log(
    `✓ embedded numbered claims found: ${claims.length}`,
  )

  console.log(
    `✓ supported claims: ${supported.length}`,
  )

  console.log(
    `✗ unsupported claims: ${unsupported.length}\n`,
  )

  for (
    const claim
    of unsupported
  ) {
    console.log(
      `ERROR: ${claim.field}`,
    )

    console.log(
      `  claim       : ${claim.rawLabel}`,
    )

    console.log(
      `  canonicalId : ${claim.canonicalId}`,
    )

    console.log(
      '  issue       : label does not exist in deterministic source catalog\n',
    )
  }

  const report = {
    artifactVersion:
      1,

    auditPolicyVersion:
      POLICY_VERSION,

    status:
      unsupported.length ===
        0
        ? 'PASS'
        : 'FAIL',

    lessonKey:
      LESSON_KEY,

    requestedDurationMinutes:
      DURATION,

    sourceArtifact:
      path.relative(
        ROOT,
        artifactFile,
      ),

    catalogPolicyVersion:
      catalog
        .catalogPolicyVersion,

    canonicalContentSha256:
      catalog
        .canonicalSource
        .canonicalContentSha256,

    metrics: {
      totalClaims:
        claims.length,

      supportedClaims:
        supported.length,

      unsupportedClaims:
        unsupported.length,
    },

    claims,

    auditedAt:
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
      `${LESSON_KEY}-${DURATION}min-source-claims.json`,
    )

  await writeFile(
    outputFile,

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
    unsupported.length ===
      0
      ? ' Embedded Source-Claim Audit PASSED'
      : ' Embedded Source-Claim Audit FAILED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Total claims       : ${claims.length}`,
  )

  console.log(
    `Supported claims   : ${supported.length}`,
  )

  console.log(
    `Unsupported claims : ${unsupported.length}`,
  )

  console.log(
    'Gemini calls       : 0',
  )

  console.log(
    'Supabase writes    : 0',
  )

  console.log(
    '\nOutput:',
  )

  console.log(
    path.relative(
      ROOT,
      outputFile,
    ),
  )

  if (
    unsupported.length >
      0
  ) {
    console.log(
      '\nNEXT GATE:',
    )

    console.log(
      [
        'Do not run the semantic auditor yet.',
        'Run normalize-source-limitations-labels.ts if every unsupported claim is confined to sourceLimitations.',
      ].join(' '),
    )

    console.log()

    process.exitCode =
      2

    return
  }

  console.log(
    '\nNEXT GATE:',
  )

  console.log(
    'Embedded provenance claims passed. Proceed to the v5 independent semantic audit.\n',
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
      ' Embedded Source-Claim Audit FAILED',
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