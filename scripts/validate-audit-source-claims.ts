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
   CHALKBOX — AUDIT OUTPUT SOURCE-CLAIM VALIDATOR v1

   PURPOSE

   Scan the INDEPENDENT AUDITOR'S OUTPUT for numbered textbook
   claims such as:

     Activity 9.1
     Example 9.3
     Figure 5.8
     Table 4.2

   and verify those claims against the same deterministic source
   catalog used by Generator v5.

   Why?

   Generator-side provenance can be perfect while the independent
   auditor itself invents a numbered textbook label inside:

     - explanations
     - activityAudit
     - visualAudit
     - citationAudit
     - issue explanations
     - repair instructions

   This gate prevents an auditor hallucination from being used as
   evidence for judge promotion.

   IMPORTANT

   - NO Gemini calls.
   - NO Groq calls.
   - NO Supabase writes.
   - NO lesson mutation.
   - NO audit mutation.
   - Pure deterministic verification.

   ============================================================ */

const ROOT =
  process.cwd()

const AUDIT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'lesson-audits-v5',
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'audit-source-claim-audits-v1',
  )

const POLICY_VERSION =
  'chalkbox-audit-source-claim-validation-v1'

const ALLOWED_AUDIT_POLICIES =
  new Set([
    'chalkbox-generated-audit-v5-catalog-grounded-gemini-35',
    'chalkbox-generated-audit-v5-catalog-grounded-gemini-36',
  ])

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

  if (
    !argument
  ) {
    return null
  }

  return argument
    .slice(
      prefix.length,
    )
    .trim()
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

/* ============================================================
   MAIN
   ============================================================ */

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Audit Source-Claim Validator',
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
    'Operation       : deterministic only',
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

  /* ----------------------------------------------------------
     Load audit artifact
     ---------------------------------------------------------- */

  const auditFile =
    path.resolve(
      AUDIT_DIRECTORY,
      `${LESSON_KEY}-${DURATION}min-audit.json`,
    )

  const auditText =
    await readFile(
      auditFile,
      'utf8',
    )

  const parsed:
    unknown =
    JSON.parse(
      auditText,
    )

  if (
    !isObject(
      parsed,
    )
  ) {
    throw new Error(
      'Audit artifact is not a JSON object.',
    )
  }

  const audit =
    parsed

  /* ----------------------------------------------------------
     Validate audit identity
     ---------------------------------------------------------- */

if (
  !ALLOWED_AUDIT_POLICIES.has(
    String(
      parsed.auditPolicyVersion,
    ),
  )
) {
  throw new Error(
    [
      'Unexpected audit policy.',
      `Allowed=${[
        ...ALLOWED_AUDIT_POLICIES,
      ].join(', ')}`,
      `Found=${String(
  parsed.auditPolicyVersion,
)}`,
    ].join('\n'),
  )
}

  if (
    audit.status !==
      'AUDIT_COMPLETED'
  ) {
    throw new Error(
      [
        'Audit has not completed.',
        `Found=${String(
          audit.status,
        )}`,
      ].join('\n'),
    )
  }

  if (
    audit.lessonKey !==
      LESSON_KEY
  ) {
    throw new Error(
      'Audit lessonKey mismatch.',
    )
  }

  if (
    audit.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Audit duration mismatch.',
    )
  }

  if (
    !isObject(
      audit.modelAudit,
    )
  ) {
    throw new Error(
      'modelAudit object missing.',
    )
  }

  console.log(
    '✓ independent audit artifact: LOADED',
  )

  /* ----------------------------------------------------------
     Load deterministic source catalog
     ---------------------------------------------------------- */

  const catalog =
    await loadSourceCatalog(
      LESSON_KEY,
    )

  console.log(
    '✓ deterministic source catalog: LOADED',
  )

  /* ----------------------------------------------------------
     Verify audit source SHA against catalog
     ---------------------------------------------------------- */

  if (
    !isObject(
      audit.source,
    )
  ) {
    throw new Error(
      'Audit source metadata missing.',
    )
  }

  const auditSha =
    audit
      .source
      .canonicalContentSha256

  const catalogSha =
    catalog
      .canonicalSource
      .canonicalContentSha256

  if (
    auditSha !==
      catalogSha
  ) {
    throw new Error(
      [
        'Audit/catalog canonical SHA mismatch.',
        `Audit=${String(
          auditSha,
        )}`,
        `Catalog=${catalogSha}`,
      ].join('\n'),
    )
  }

  console.log(
    '✓ canonical source SHA: VERIFIED',
  )

  /* ----------------------------------------------------------
     Scan ONLY the model audit.

     We do not scan filesystem paths, policy names, timestamps,
     etc. We care about semantic claims made by the auditor.
     ---------------------------------------------------------- */

  const claims =
    scanEmbeddedSourceLabelClaims(
      audit.modelAudit,
      catalog,
    )

  const supportedClaims =
    claims.filter(
      (claim) =>
        claim.supported,
    )

  const unsupportedClaims =
    claims.filter(
      (claim) =>
        !claim.supported,
    )

  console.log(
    `✓ numbered audit claims found: ${claims.length}`,
  )

  console.log(
    `✓ supported audit claims: ${supportedClaims.length}`,
  )

  console.log(
    `✗ unsupported audit claims: ${unsupportedClaims.length}\n`,
  )

  /* ----------------------------------------------------------
     Print unsupported claims
     ---------------------------------------------------------- */

  for (
    const claim
    of unsupportedClaims
  ) {
    console.log(
      `ERROR: modelAudit.${claim.field}`,
    )

    console.log(
      `  claim       : ${claim.rawLabel}`,
    )

    console.log(
      `  canonicalId : ${claim.canonicalId}`,
    )

    console.log(
      '  issue       : auditor referenced a numbered textbook object absent from deterministic source catalog',
    )

    console.log()
  }

  /* ----------------------------------------------------------
     Report
     ---------------------------------------------------------- */

  const report = {
    artifactVersion:
      1,

    validationPolicyVersion:
      POLICY_VERSION,

    status:
      unsupportedClaims.length ===
        0
        ? 'PASS'
        : 'FAIL',

    lessonKey:
      LESSON_KEY,

    requestedDurationMinutes:
      DURATION,

    auditPolicyVersion:
  String(
    parsed.auditPolicyVersion,
  ),

    sourceCatalogPolicyVersion:
      catalog
        .catalogPolicyVersion,

    canonicalContentSha256:
      catalogSha,

    sourceAuditFile:
      path.relative(
        ROOT,
        auditFile,
      ),

    metrics: {
      totalAuditClaims:
        claims.length,

      supportedAuditClaims:
        supportedClaims.length,

      unsupportedAuditClaims:
        unsupportedClaims.length,
    },

    claims,

    validatedAt:
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
      `${LESSON_KEY}-${DURATION}min-audit-source-claims.json`,
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

  /* ----------------------------------------------------------
     Summary
     ---------------------------------------------------------- */

  console.log(
    '==========================================',
  )

  console.log(
    unsupportedClaims.length ===
      0
      ? ' Audit Source-Claim Validation PASSED'
      : ' Audit Source-Claim Validation FAILED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Total audit claims       : ${claims.length}`,
  )

  console.log(
    `Supported audit claims   : ${supportedClaims.length}`,
  )

  console.log(
    `Unsupported audit claims : ${unsupportedClaims.length}`,
  )

  console.log(
    'Gemini calls             : 0',
  )

  console.log(
    'Groq calls               : 0',
  )

  console.log(
    'Supabase writes          : 0',
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
    unsupportedClaims.length >
      0
  ) {
    console.log(
      '\nNEXT GATE:',
    )

    console.log(
      [
        'Do NOT promote this audit yet.',
        'Inspect the canonical source page behind each unsupported auditor claim.',
        'Do not regenerate or repair the lesson.',
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
    'Audit output contains no unsupported numbered textbook claims. Promotion may proceed after final review.\n',
  )
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
      ' Audit Source-Claim Validation FAILED',
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
      'No lesson or audit artifact was modified.',
    )

    console.error(
      'No Supabase data was changed.\n',
    )

    process.exitCode =
      1
  },
)