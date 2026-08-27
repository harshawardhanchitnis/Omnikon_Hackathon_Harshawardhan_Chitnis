/// <reference types="node" />

import {
  createHash,
} from 'node:crypto'

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

/* ============================================================
   CHALKBOX — GENERATOR v5 JUDGE PROMOTION v1

   PURPOSE

   Promote a lesson that passed the complete v5 pipeline:

     Generator v5
        ↓
     deterministic provenance
        ↓
     lesson embedded source-claim gate
        ↓
     optional deterministic NON-SEMANTIC normalization
        ↓
     independent semantic + multimodal Audit v5
        ↓
     audit-output source-claim gate
        ↓
     immutable judge cache

   IMPORTANT

   - NO Gemini calls.
   - NO Groq calls.
   - NO Supabase writes.
   - NO lesson mutation.
   - NO audit mutation.
   - Existing judge artifact may not be overwritten.

   The current deterministic catalog is revalidated during
   promotion. This is important when the catalog extractor has
   been hardened after the lesson was generated.

   ============================================================ */

const ROOT =
  process.cwd()

/* ============================================================
   POLICIES
   ============================================================ */

const PROMOTION_POLICY_VERSION =
  'chalkbox-v5-judge-promotion-v1'

const EXPECTED_GENERATION_POLICY =
  'chalkbox-lesson-v5-catalog-grounded-gemini-35'

const ALLOWED_AUDIT_POLICIES =
  new Set([
    'chalkbox-generated-audit-v5-catalog-grounded-gemini-35',
    'chalkbox-generated-audit-v5-catalog-grounded-gemini-36',
  ])

const EXPECTED_SOURCE_CATALOG_POLICY =
  'chalkbox-source-catalog-v1'

const EXPECTED_LESSON_CLAIM_POLICY =
  'chalkbox-source-claim-audit-v1'

const EXPECTED_AUDIT_CLAIM_POLICY =
  'chalkbox-audit-source-claim-validation-v1'

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
   PATHS
   ============================================================ */

const GENERATED_FILE =
  path.resolve(
    ROOT,
    'data',
    'generated-demo-lessons-v5',
    `${LESSON_KEY}-${DURATION}min.json`,
  )

const AUDIT_FILE =
  path.resolve(
    ROOT,
    'data',
    'lesson-audits-v5',
    `${LESSON_KEY}-${DURATION}min-audit.json`,
  )

const LESSON_CLAIM_FILE =
  path.resolve(
    ROOT,
    'data',
    'source-claim-audits-v1',
    `${LESSON_KEY}-${DURATION}min-source-claims.json`,
  )

const AUDIT_CLAIM_FILE =
  path.resolve(
    ROOT,
    'data',
    'audit-source-claim-audits-v1',
    `${LESSON_KEY}-${DURATION}min-audit-source-claims.json`,
  )

const CATALOG_FILE =
  path.resolve(
    ROOT,
    'data',
    'source-catalog-v1',
    `${LESSON_KEY}.json`,
  )

const OUTPUT_DIRECTORY =
  path.resolve(
    ROOT,
    'data',
    'judge-demo-lessons-v1',
  )

const OUTPUT_FILE =
  path.resolve(
    OUTPUT_DIRECTORY,
    `${LESSON_KEY}-${DURATION}min.json`,
  )

const MANIFEST_FILE =
  path.resolve(
    OUTPUT_DIRECTORY,
    'manifest.json',
  )

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

async function readJsonObject(
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
      [
        'Expected JSON object:',
        path.relative(
          ROOT,
          filePath,
        ),
      ].join(' '),
    )
  }

  return {
    text,
    value:
      parsed,
  }
}

function requireZeroUnsupportedClaims(
  report:
    Record<string, unknown>,

  field:
    'unsupportedClaims' |
    'unsupportedAuditClaims',
) {
  if (
    !isObject(
      report.metrics,
    )
  ) {
    throw new Error(
      'Claim report metrics object missing.',
    )
  }

  if (
    report.metrics[field] !==
      0
  ) {
    throw new Error(
      [
        'Claim report contains unsupported source labels.',
        `${field}=${String(
          report.metrics[field],
        )}`,
      ].join('\n'),
    )
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
    ' ChalkBox Generator v5 Judge Promotion',
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
    'Pipeline        : Generator v5 -> Audit v5',
  )

  console.log(
    'Catalog recheck : REQUIRED',
  )

  console.log(
    'Semantic repair : NONE',
  )

  console.log(
    'AI calls        : 0',
  )

  console.log(
    'Supabase writes : 0',
  )

  console.log(
    'Source mutation : NO\n',
  )

  /* ==========================================================
     1. GENERATED LESSON
     ========================================================== */

  const {
    text:
      generatedText,

    value:
      generated,
  } =
    await readJsonObject(
      GENERATED_FILE,
    )

  if (
    generated.artifactVersion !==
      5
  ) {
    throw new Error(
      'Expected Generator v5 artifactVersion=5.',
    )
  }

  if (
    generated.generationPolicyVersion !==
      EXPECTED_GENERATION_POLICY
  ) {
    throw new Error(
      'Unexpected generation policy.',
    )
  }

  if (
    generated.status !==
      'PROVENANCE_VALIDATED'
  ) {
    throw new Error(
      [
        'Generated lesson is not promotion eligible.',
        `status=${String(
          generated.status,
        )}`,
      ].join('\n'),
    )
  }

  if (
    generated.fullyAudited !==
      false ||
    generated.judgeReady !==
      false
  ) {
    throw new Error(
      'Generated source artifact has unexpected audit state.',
    )
  }

  if (
    !isObject(
      generated.lesson,
    )
  ) {
    throw new Error(
      'Generated lesson object missing.',
    )
  }

  const lesson =
    generated.lesson

  if (
    lesson.lessonKey !==
      LESSON_KEY ||
    lesson.requestedDurationMinutes !==
      DURATION ||
    lesson.schemaVersion !==
      5
  ) {
    throw new Error(
      'Generated lesson metadata mismatch.',
    )
  }

  if (
    !isObject(
      generated.validation,
    )
  ) {
    throw new Error(
      'Generated validation object missing.',
    )
  }

  if (
    generated.validation
      .deterministicProvenance !==
      'PASS'
  ) {
    throw new Error(
      'Generator deterministic provenance did not PASS.',
    )
  }

  if (
    !Array.isArray(
      generated.validation.errors,
    ) ||
    generated.validation.errors.length !==
      0
  ) {
    throw new Error(
      'Generator contains unresolved deterministic errors.',
    )
  }

  console.log(
    '✓ Generator v5 artifact: PROVENANCE_VALIDATED',
  )

  console.log(
    '✓ deterministic generation provenance: PASS',
  )

  /* ==========================================================
     2. DETERMINISTIC NORMALIZATIONS
     ========================================================== */

  const normalizations =
    generated
      .postGenerationNormalizations

  let normalizationCount =
    0

  if (
    normalizations !==
      undefined
  ) {
    if (
      !Array.isArray(
        normalizations,
      )
    ) {
      throw new Error(
        'postGenerationNormalizations must be an array.',
      )
    }

    normalizationCount =
      normalizations.length

    for (
      let index = 0;
      index <
        normalizations.length;
      index += 1
    ) {
      const record =
        normalizations[index]

      if (
        !isObject(
          record,
        )
      ) {
        throw new Error(
          `Invalid normalization record at index ${index}.`,
        )
      }

      if (
        record.semanticRepair !==
          false
      ) {
        throw new Error(
          [
            'Promotion refused.',
            `Normalization ${index} is semantic.`,
          ].join('\n'),
        )
      }

      if (
        record.llmCalls !==
          0
      ) {
        throw new Error(
          [
            'Promotion refused.',
            `Normalization ${index} reports LLM calls.`,
          ].join('\n'),
        )
      }

      if (
        'teachingContentChanged' in
          record &&
        record.teachingContentChanged !==
          false
      ) {
        throw new Error(
          [
            'Promotion refused.',
            `Normalization ${index} changed teaching content.`,
          ].join('\n'),
        )
      }
    }
  }

  console.log(
    `✓ deterministic normalizations: ${normalizationCount}`,
  )

  if (
    normalizationCount >
      0
  ) {
    console.log(
      '✓ normalization semantic repair: NO',
    )

    console.log(
      '✓ normalization LLM calls: 0',
    )
  }

  /* ==========================================================
     3. CURRENT SOURCE CATALOG
     ========================================================== */

  const catalogText =
    await readFile(
      CATALOG_FILE,
      'utf8',
    )

  const currentCatalogSha256 =
    sha256(
      catalogText,
    )

  const catalog =
    await loadSourceCatalog(
      LESSON_KEY,
    )

  if (
    catalog.catalogPolicyVersion !==
      EXPECTED_SOURCE_CATALOG_POLICY
  ) {
    throw new Error(
      'Unexpected source catalog policy.',
    )
  }

  if (
    catalog.lessonKey !==
      LESSON_KEY
  ) {
    throw new Error(
      'Source catalog lessonKey mismatch.',
    )
  }

  if (
    !isObject(
      generated.source,
    ) ||
    !isObject(
      generated
        .source
        .sourceCatalog,
    )
  ) {
    throw new Error(
      'Generated source catalog provenance missing.',
    )
  }

  const canonicalSha =
    catalog
      .canonicalSource
      .canonicalContentSha256

  if (
    generated
      .source
      .sourceCatalog
      .canonicalContentSha256 !==
    canonicalSha
  ) {
    throw new Error(
      'Generated lesson/current catalog canonical SHA mismatch.',
    )
  }

  console.log(
    '✓ current deterministic source catalog: VERIFIED',
  )

  console.log(
    `✓ current catalog activities: ${catalog.statistics.activities}`,
  )

  console.log(
    `✓ current catalog examples: ${catalog.statistics.examples}`,
  )

  console.log(
    `✓ current catalog figures: ${catalog.statistics.figureLabels}`,
  )

  console.log(
    `✓ current catalog tables: ${catalog.statistics.tableLabels}`,
  )

  /* ==========================================================
     4. LESSON SOURCE-CLAIM REVALIDATION
     ========================================================== */

  const {
    text:
      lessonClaimText,

    value:
      lessonClaim,
  } =
    await readJsonObject(
      LESSON_CLAIM_FILE,
    )

  if (
    lessonClaim.auditPolicyVersion !==
      EXPECTED_LESSON_CLAIM_POLICY
  ) {
    throw new Error(
      'Unexpected lesson source-claim policy.',
    )
  }

  if (
    lessonClaim.status !==
      'PASS'
  ) {
    throw new Error(
      'Lesson source-claim gate did not PASS.',
    )
  }

  if (
    lessonClaim.lessonKey !==
      LESSON_KEY ||
    lessonClaim.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Lesson source-claim report metadata mismatch.',
    )
  }

  if (
    lessonClaim.canonicalContentSha256 !==
      canonicalSha
  ) {
    throw new Error(
      'Lesson source-claim report/catalog canonical SHA mismatch.',
    )
  }

  requireZeroUnsupportedClaims(
    lessonClaim,
    'unsupportedClaims',
  )

  console.log(
    '✓ lesson source-claim gate: PASS',
  )

  /* ==========================================================
     5. INDEPENDENT AUDIT v5
     ========================================================== */

  const {
    text:
      auditText,

    value:
      audit,
  } =
    await readJsonObject(
      AUDIT_FILE,
    )

  if (
    audit.artifactVersion !==
      5
  ) {
    throw new Error(
      'Expected Audit v5 artifactVersion=5.',
    )
  }

  const auditPolicyVersion =
  String(
    audit.auditPolicyVersion,
  )

if (
  !ALLOWED_AUDIT_POLICIES.has(
    auditPolicyVersion,
  )
) {
  throw new Error(
    [
      'Unexpected independent audit policy.',
      `Allowed=${[
        ...ALLOWED_AUDIT_POLICIES,
      ].join(', ')}`,
      `Found=${auditPolicyVersion}`,
    ].join('\n'),
  )
}

  if (
    audit.status !==
      'AUDIT_COMPLETED'
  ) {
    throw new Error(
      'Independent audit is incomplete.',
    )
  }

  if (
    audit.lessonKey !==
      LESSON_KEY ||
    audit.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Independent audit metadata mismatch.',
    )
  }

  if (
    audit.finalDecision !==
      'PASS'
  ) {
    throw new Error(
      [
        'Independent audit did not PASS.',
        `decision=${String(
          audit.finalDecision,
        )}`,
      ].join('\n'),
    )
  }

  if (
    audit.judgeReady !==
      true
  ) {
    throw new Error(
      'Independent audit does not mark lesson judge-ready.',
    )
  }

  if (
    !isObject(
      audit.deterministicPreAudit,
    ) ||
    audit.deterministicPreAudit.status !==
      'PASS'
  ) {
    throw new Error(
      'Independent deterministic pre-audit did not PASS.',
    )
  }

  if (
    !Array.isArray(
      audit.deterministicPreAudit.errors,
    ) ||
    audit.deterministicPreAudit.errors.length !==
      0
  ) {
    throw new Error(
      'Independent deterministic audit contains errors.',
    )
  }

  console.log(
    '✓ Independent Audit v5: PASS',
  )

  console.log(
    '✓ audit judgeReady: YES',
  )

  /* ==========================================================
     6. MODEL AUDIT QUALITY
     ========================================================== */

  if (
    !isObject(
      audit.modelAudit,
    )
  ) {
    throw new Error(
      'modelAudit object missing.',
    )
  }

  const modelAudit =
    audit.modelAudit

  if (
    modelAudit.decision !==
      'PASS'
  ) {
    throw new Error(
      'Model audit decision is not PASS.',
    )
  }

  if (
    !Array.isArray(
      modelAudit.issues,
    )
  ) {
    throw new Error(
      'modelAudit.issues missing.',
    )
  }

  const blockingIssues =
    modelAudit.issues.filter(
      (issue) =>
        isObject(
          issue,
        ) &&
        (
          issue.severity ===
            'ERROR' ||
          issue.severity ===
            'WARNING'
        ),
    )

  if (
    blockingIssues.length !==
      0
  ) {
    throw new Error(
      [
        'Independent audit contains blocking findings.',
        `count=${blockingIssues.length}`,
      ].join('\n'),
    )
  }

  console.log(
    '✓ blocking audit issues: 0',
  )

  /* ==========================================================
     7. ALL QUALITY SCORES MUST BE 10
     ========================================================== */

  if (
    !isObject(
      modelAudit.scores,
    )
  ) {
    throw new Error(
      'Audit scores object missing.',
    )
  }

  const scores =
    modelAudit.scores

  const scoreFields = [
    'scientificAccuracy',
    'sourceGrounding',
    'citationAccuracy',
    'conceptLedger',
    'objectiveConsistency',
    'coverage',
    'activityProvenance',
    'exampleFidelity',
    'visualGrounding',
    'pedagogy',
    'internalConsistency',
    'timingReadiness',
    'overall',
  ]

  for (
    const field
    of scoreFields
  ) {
    if (
      scores[field] !==
        10
    ) {
      throw new Error(
        [
          'Judge-cache quality threshold not met.',
          `${field}=${String(
            scores[field],
          )}`,
          'Required=10',
        ].join('\n'),
      )
    }
  }

  console.log(
    '✓ all quality dimensions: 10/10',
  )

  /* ==========================================================
     8. CONCEPT COVERAGE
     ========================================================== */

  if (
    !isObject(
      modelAudit
        .independentConceptAudit,
    )
  ) {
    throw new Error(
      'Independent concept audit missing.',
    )
  }

  const conceptAudit =
    modelAudit
      .independentConceptAudit

  if (
    conceptAudit.status !==
      'PASS'
  ) {
    throw new Error(
      'Independent concept audit did not PASS.',
    )
  }

  if (
    !Array.isArray(
      conceptAudit.majorConcepts,
    ) ||
    conceptAudit.majorConcepts.length ===
      0
  ) {
    throw new Error(
      'Independent major concepts missing.',
    )
  }

  for (
    const concept
    of conceptAudit.majorConcepts
  ) {
    if (
      !isObject(
        concept,
      )
    ) {
      throw new Error(
        'Invalid independent concept audit record.',
      )
    }

    if (
      concept.ledgerStatus !==
        'PRESENT' ||
      concept.lessonStatus !==
        'COVERED'
    ) {
      throw new Error(
        [
          'Incomplete independent concept coverage.',
          `concept=${String(
            concept.concept,
          )}`,
        ].join('\n'),
      )
    }
  }

  const conceptCount =
    conceptAudit
      .majorConcepts
      .length

  console.log(
    `✓ major concepts: ${conceptCount}/${conceptCount} COVERED`,
  )

  /* ==========================================================
     9. SUB-AUDITS
     ========================================================== */

  const requiredAuditArrays = [
    'objectiveAudit',
    'citationAudit',
    'activityAudit',
    'exampleAudit',
    'visualAudit',
  ]

  for (
    const field
    of requiredAuditArrays
  ) {
    const entries =
      modelAudit[field]

    if (
      !Array.isArray(
        entries,
      )
    ) {
      throw new Error(
        `${field} missing.`,
      )
    }

    for (
      const entry
      of entries
    ) {
      if (
        !isObject(
          entry,
        ) ||
        entry.status !==
          'PASS'
      ) {
        throw new Error(
          `${field} contains a non-PASS result.`,
        )
      }
    }

    console.log(
      `✓ ${field}: PASS`,
    )
  }

  if (
    !isObject(
      modelAudit.pedagogy,
    ) ||
    modelAudit.pedagogy.status !==
      'PASS'
  ) {
    throw new Error(
      'Pedagogy audit did not PASS.',
    )
  }

  if (
    !isObject(
      modelAudit.timingReadiness,
    ) ||
    modelAudit.timingReadiness.status !==
      'PASS'
  ) {
    throw new Error(
      'Timing readiness did not PASS.',
    )
  }

  console.log(
    '✓ pedagogy: PASS',
  )

  console.log(
    '✓ timing readiness: PASS',
  )

  /* ==========================================================
     10. AUDIT-OUTPUT SOURCE-CLAIM REVALIDATION
     ========================================================== */

  const {
    text:
      auditClaimText,

    value:
      auditClaim,
  } =
    await readJsonObject(
      AUDIT_CLAIM_FILE,
    )

  if (
    auditClaim.validationPolicyVersion !==
      EXPECTED_AUDIT_CLAIM_POLICY
  ) {
    throw new Error(
      'Unexpected audit source-claim validation policy.',
    )
  }

  if (
    auditClaim.status !==
      'PASS'
  ) {
    throw new Error(
      'Audit-output source-claim gate did not PASS.',
    )
  }

  if (
    auditClaim.lessonKey !==
      LESSON_KEY ||
    auditClaim.requestedDurationMinutes !==
      DURATION
  ) {
    throw new Error(
      'Audit-output source-claim metadata mismatch.',
    )
  }

  if (
    auditClaim.canonicalContentSha256 !==
      canonicalSha
  ) {
    throw new Error(
      'Audit-output source-claim/catalog canonical SHA mismatch.',
    )
  }

  requireZeroUnsupportedClaims(
    auditClaim,
    'unsupportedAuditClaims',
  )

  console.log(
    '✓ audit-output source-claim gate: PASS',
  )

  /* ==========================================================
     11. IMMUTABILITY
     ========================================================== */

  await mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive:
        true,
    },
  )

  if (
    await fileExists(
      OUTPUT_FILE,
    )
  ) {
    throw new Error(
      [
        'Judge artifact already exists.',
        'Promotion refused to preserve immutability.',
        '',
        path.relative(
          ROOT,
          OUTPUT_FILE,
        ),
      ].join('\n'),
    )
  }

  /* ==========================================================
     12. HASH PROVENANCE
     ========================================================== */

  const generatedSha256 =
    sha256(
      generatedText,
    )

  const auditSha256 =
    sha256(
      auditText,
    )

  const lessonClaimSha256 =
    sha256(
      lessonClaimText,
    )

  const auditClaimSha256 =
    sha256(
      auditClaimText,
    )

  const promotedAt =
    new Date()
      .toISOString()

  /* ==========================================================
     13. JUDGE ARTIFACT
     ========================================================== */

  const promotedArtifact = {
    artifactVersion:
      3,

    promotionPolicyVersion:
      PROMOTION_POLICY_VERSION,

    status:
      'JUDGE_READY',

    fullyAudited:
      true,

    judgeReady:
      true,

    immutable:
      true,

    lessonKey:
      LESSON_KEY,

    requestedDurationMinutes:
      DURATION,

    pipeline:
      'GENERATOR_V5_CATALOG_GROUNDED_DIRECT_PASS',

    semanticRepairUsed:
      false,

    deterministicNormalizations:
      normalizationCount,

    /*
     * The source catalog extractor was hardened after generation.
     * The lesson and independent audit have both subsequently
     * passed fresh claim validation against the current catalog.
     */
    currentCatalogRevalidatedAtPromotion:
      true,

    lesson,

    qualityGate: {
      decision:
        'PASS',

      generationPolicyVersion:
        EXPECTED_GENERATION_POLICY,

      auditPolicyVersion,

      sourceCatalogPolicyVersion:
        EXPECTED_SOURCE_CATALOG_POLICY,

      lessonSourceClaimPolicyVersion:
        EXPECTED_LESSON_CLAIM_POLICY,

      auditSourceClaimPolicyVersion:
        EXPECTED_AUDIT_CLAIM_POLICY,

      deterministicProvenance:
        'PASS',

      lessonEmbeddedSourceClaims:
        'PASS',

      independentConceptAudit:
        'PASS',

      scientificAccuracy:
        'PASS',

      sourceGrounding:
        'PASS',

      citationAccuracy:
        'PASS',

      objectiveConsistency:
        'PASS',

      coverage:
        'PASS',

      activityProvenance:
        'PASS',

      exampleFidelity:
        'PASS',

      visualGrounding:
        'PASS',

      pedagogy:
        'PASS',

      internalConsistency:
        'PASS',

      timingReadiness:
        'PASS',

      auditOutputSourceClaims:
        'PASS',
    },

    scores,

    catalogAtPromotion: {
      catalogSha256:
        currentCatalogSha256,

      canonicalContentSha256:
        canonicalSha,

      activities:
        catalog
          .statistics
          .activities,

      examples:
        catalog
          .statistics
          .examples,

      figures:
        catalog
          .statistics
          .figureLabels,

      tables:
        catalog
          .statistics
          .tableLabels,
    },

    provenance: {
      generatedArtifact:
        path.relative(
          ROOT,
          GENERATED_FILE,
        ),

      generatedArtifactSha256:
        generatedSha256,

      independentAuditArtifact:
        path.relative(
          ROOT,
          AUDIT_FILE,
        ),

      independentAuditArtifactSha256:
        auditSha256,

      lessonSourceClaimArtifact:
        path.relative(
          ROOT,
          LESSON_CLAIM_FILE,
        ),

      lessonSourceClaimArtifactSha256:
        lessonClaimSha256,

      auditSourceClaimArtifact:
        path.relative(
          ROOT,
          AUDIT_CLAIM_FILE,
        ),

      auditSourceClaimArtifactSha256:
        auditClaimSha256,

      currentSourceCatalog:
        path.relative(
          ROOT,
          CATALOG_FILE,
        ),

      currentSourceCatalogSha256:
        currentCatalogSha256,

      canonicalContentSha256:
        canonicalSha,

      semanticRepairUsed:
        false,

      deterministicNormalizations:
        normalizationCount,

      currentCatalogRevalidatedAtPromotion:
        true,
    },

    promotedAt,
  }

  await writeFile(
    OUTPUT_FILE,

    `${JSON.stringify(
      promotedArtifact,
      null,
      2,
    )}\n`,

    'utf8',
  )

  /* ==========================================================
     14. UPDATE EXISTING JUDGE MANIFEST
     ========================================================== */

  let manifest:
    Record<string, unknown> = {
      artifactVersion:
        1,

      purpose:
        'CHALKBOX_JUDGE_DEMO_CACHE',

      lessons:
        [],
    }

  if (
    await fileExists(
      MANIFEST_FILE,
    )
  ) {
    const {
      value:
        existingManifest,
    } =
      await readJsonObject(
        MANIFEST_FILE,
      )

    manifest =
      existingManifest
  }

  if (
    !Array.isArray(
      manifest.lessons,
    )
  ) {
    throw new Error(
      'Judge manifest lessons array missing.',
    )
  }

  const duplicate =
    manifest.lessons.some(
      (entry) =>
        isObject(
          entry,
        ) &&
        entry.lessonKey ===
          LESSON_KEY &&
        entry.requestedDurationMinutes ===
          DURATION,
    )

  if (
    duplicate
  ) {
    throw new Error(
      'Judge manifest already contains this lesson.',
    )
  }

  manifest.lessons.push({
    lessonKey:
      LESSON_KEY,

    requestedDurationMinutes:
      DURATION,

    fileName:
      path.basename(
        OUTPUT_FILE,
      ),

    status:
      'JUDGE_READY',

    fullyAudited:
      true,

    immutable:
      true,

    pipeline:
      'GENERATOR_V5_CATALOG_GROUNDED_DIRECT_PASS',

    finalDecision:
      'PASS',

    overallScore:
      10,

    semanticRepairUsed:
      false,

    deterministicNormalizations:
      normalizationCount,

    currentCatalogRevalidatedAtPromotion:
      true,

    generatedArtifactSha256:
      generatedSha256,

    auditArtifactSha256:
      auditSha256,

    currentSourceCatalogSha256:
      currentCatalogSha256,

    promotedAt,
  })

  manifest.updatedAt =
    promotedAt

  await writeFile(
    MANIFEST_FILE,

    `${JSON.stringify(
      manifest,
      null,
      2,
    )}\n`,

    'utf8',
  )

  /* ==========================================================
     SUCCESS
     ========================================================== */

  console.log(
    '\n==========================================',
  )

  console.log(
    ' Generator v5 Judge Promotion PASSED',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'Status                       : JUDGE_READY',
  )

  console.log(
    'Fully audited                : YES',
  )

  console.log(
    'Immutable                    : YES',
  )

  console.log(
    'Semantic repair used         : NO',
  )

  console.log(
    `Deterministic normalizations : ${normalizationCount}`,
  )

  console.log(
    `Major concepts               : ${conceptCount}/${conceptCount}`,
  )

  console.log(
    'Lesson claim gate            : PASS',
  )

  console.log(
    'Audit claim gate             : PASS',
  )

  console.log(
    'Current catalog revalidated  : YES',
  )

  console.log(
    'Overall score                : 10/10',
  )

  console.log(
    'AI calls                     : 0',
  )

  console.log(
    'Supabase writes              : 0',
  )

  console.log(
    '\nJudge artifact:',
  )

  console.log(
    path.relative(
      ROOT,
      OUTPUT_FILE,
    ),
  )

  console.log(
    '\nManifest:',
  )

  console.log(
    path.relative(
      ROOT,
      MANIFEST_FILE,
    ),
  )

  console.log(
    '\nSHA-256:',
  )

  console.log(
    `Generated lesson : ${generatedSha256}`,
  )

  console.log(
    `Audit            : ${auditSha256}`,
  )

  console.log(
    `Lesson claims    : ${lessonClaimSha256}`,
  )

  console.log(
    `Audit claims     : ${auditClaimSha256}`,
  )

  console.log(
    `Current catalog  : ${currentCatalogSha256}`,
  )

  console.log(
    '\nNEXT GATE:',
  )

  console.log(
    [
      'Force and Laws of Motion is frozen.',
      'Do not regenerate, normalize, audit or promote it again.',
      'Before generating the next chapter, bind Generator v5',
      'directly to an exact source-catalog SHA so future artifacts',
      'record the precise catalog revision used at generation time.',
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
      ' Generator v5 Judge Promotion FAILED',
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
      'No source lesson was modified.',
    )

    console.error(
      'No audit artifact was modified.',
    )

    console.error(
      'No Supabase data was changed.\n',
    )

    process.exitCode =
      1
  },
)