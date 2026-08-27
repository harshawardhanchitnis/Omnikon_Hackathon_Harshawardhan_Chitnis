/// <reference types="node" />

import {
  spawnSync,
} from 'node:child_process'

import {
  readFile,
} from 'node:fs/promises'

import {
  existsSync,
} from 'node:fs'

import {
  createRequire,
} from 'node:module'

import path from 'node:path'

import process from 'node:process'

/* ============================================================
   CHALKBOX — REMAINING DEMO LESSON BATCH RUNNER

   PURPOSE

   Complete the remaining textbook demo corpus without manually
   babysitting every pipeline command.

   PIPELINE

     Generator v5
          ↓
     source-claim validation
          ↓
     optional deterministic sourceLimitations normalization
          ↓
     source-claim revalidation
          ↓
     independent Audit v5
          ↓
     audit source-claim validation
          ↓
     judge promotion

   IMPORTANT

   - Existing artifacts are reused.
   - Existing judge lessons are skipped.
   - NO semantic repair.
   - NO regeneration of existing v5 artifacts.
   - Each lesson is isolated.
   - One lesson failing does not erase successful lessons.
   ============================================================ */

const ROOT =
  process.cwd()

  const require =
  createRequire(
    import.meta.url,
  )

const TSX_CLI =
  require.resolve(
    'tsx/cli',
  )

const DURATION =
  40

const LESSONS = [
  /*
   * These two already have valid generated v5 artifacts.
   * Finish their audits/promotions first so we do not waste
   * scarce Gemini 3.5 Flash RPD on another generation attempt.
   */
  'class-8-chemical-effects-electric-current',

  'class-8-materials-metals-non-metals',

  /*
   * Work & Energy still needs generation.
   * Run it last.
   */
  'class-9-work-energy',
] as const

type LessonResult = {
  lessonKey: string

  status:
    | 'PASS'
    | 'FAIL'
    | 'SKIPPED'

  failedStage:
    string | null
}

/* ============================================================
   PATHS
   ============================================================ */

function generatedFile(
  lessonKey: string,
) {
  return path.resolve(
    ROOT,
    'data',
    'generated-demo-lessons-v5',
    `${lessonKey}-${DURATION}min.json`,
  )
}

function auditFile(
  lessonKey: string,
) {
  return path.resolve(
    ROOT,
    'data',
    'lesson-audits-v5',
    `${lessonKey}-${DURATION}min-audit.json`,
  )
}

function judgeFile(
  lessonKey: string,
) {
  return path.resolve(
    ROOT,
    'data',
    'judge-demo-lessons-v1',
    `${lessonKey}-${DURATION}min.json`,
  )
}

/* ============================================================
   COMMAND RUNNER
   ============================================================ */

function runTsx(
  script:
    string,

  lessonKey:
    string,
) {
  console.log(
    '\n------------------------------------------',
  )

  console.log(
    `Running: ${script}`,
  )

  console.log(
    `Lesson : ${lessonKey}`,
  )

  console.log(
    '------------------------------------------\n',
  )

  /*
   * Do NOT spawn pnpm.cmd directly on Windows.
   *
   * Node can execute the installed tsx CLI itself.
   *
   * This avoids Windows .cmd / spawnSync EINVAL problems and
   * behaves identically on Windows, Linux and macOS.
   */
  const result =
    spawnSync(
      process.execPath,

      [
        TSX_CLI,

        script,

        `--lesson=${lessonKey}`,

        `--duration=${DURATION}`,
      ],

      {
        cwd:
          ROOT,

        stdio:
          'inherit',

        shell:
          false,
      },
    )

  if (
    result.error
  ) {
    console.error(
      '\nChild process failed to start:',
    )

    console.error(
      result.error,
    )

    return false
  }

  if (
    result.signal
  ) {
    console.error(
      `\nChild process terminated by signal: ${result.signal}`,
    )

    return false
  }

  if (
    result.status !==
      0
  ) {
    console.error(
      `\nStage exited with code ${String(
        result.status,
      )}.`,
    )

    return false
  }

  return true
}

/* ============================================================
   AUDIT DECISION
   ============================================================ */

async function auditPassed(
  lessonKey:
    string,
) {
  const file =
    auditFile(
      lessonKey,
    )

  if (
    !existsSync(
      file,
    )
  ) {
    return false
  }

  const parsed =
    JSON.parse(
      await readFile(
        file,
        'utf8',
      ),
    ) as {
      finalDecision?:
        unknown

      judgeReady?:
        unknown
    }

  return (
    parsed.finalDecision ===
      'PASS' &&
    parsed.judgeReady ===
      true
  )
}

/* ============================================================
   ONE LESSON
   ============================================================ */

async function processLesson(
  lessonKey:
    string,
): Promise<LessonResult> {
  console.log(
    '\n\n==========================================',
  )

  console.log(
    ` BATCH LESSON: ${lessonKey}`,
  )

  console.log(
    '==========================================\n',
  )

  /*
   * Already frozen.
   */
  if (
    existsSync(
      judgeFile(
        lessonKey,
      ),
    )
  ) {
    console.log(
      '✓ Judge artifact already exists.',
    )

    console.log(
      '✓ Skipping immutable lesson.',
    )

    return {
      lessonKey,

      status:
        'SKIPPED',

      failedStage:
        null,
    }
  }

  /* ----------------------------------------------------------
     GENERATION
     ---------------------------------------------------------- */

  if (
    !existsSync(
      generatedFile(
        lessonKey,
      ),
    )
  ) {
    const generated =
      runTsx(
        'scripts/generate-demo-lesson.ts',
        lessonKey,
      )

    if (
      !generated
    ) {
      return {
        lessonKey,

        status:
          'FAIL',

        failedStage:
          'GENERATION',
      }
    }
  } else {
    console.log(
      '✓ Existing Generator v5 artifact found; generation skipped.',
    )
  }

  /* ----------------------------------------------------------
     LESSON SOURCE CLAIMS
     ---------------------------------------------------------- */

  let sourceClaimsPass =
    runTsx(
      'scripts/validate-generated-source-claims.ts',
      lessonKey,
    )

  /*
   * A claim failure may be only an unsupported numbered label
   * inside sourceLimitations.
   *
   * The normalizer is deterministic and refuses to modify
   * teaching content, so it is safe to attempt exactly once.
   */
  if (
    !sourceClaimsPass
  ) {
    console.log(
      '\nSource-claim validation did not pass.',
    )

    console.log(
      'Trying the approved deterministic sourceLimitations normalizer once...\n',
    )

    const normalized =
      runTsx(
        'scripts/normalize-source-limitations-labels.ts',
        lessonKey,
      )

    if (
      normalized
    ) {
      sourceClaimsPass =
        runTsx(
          'scripts/validate-generated-source-claims.ts',
          lessonKey,
        )
    }
  }

  if (
    !sourceClaimsPass
  ) {
    return {
      lessonKey,

      status:
        'FAIL',

      failedStage:
        'LESSON_SOURCE_CLAIMS',
    }
  }

  /* ----------------------------------------------------------
     SEMANTIC / MULTIMODAL AUDIT
     ---------------------------------------------------------- */

  if (
    !existsSync(
      auditFile(
        lessonKey,
      ),
    )
  ) {
    const audited =
      runTsx(
        'scripts/audit-generated-lesson-v5.ts',
        lessonKey,
      )

    if (
      !audited
    ) {
      return {
        lessonKey,

        status:
          'FAIL',

        failedStage:
          'INDEPENDENT_AUDIT',
      }
    }
  } else {
    console.log(
      '✓ Existing Audit v5 artifact found; audit generation skipped.',
    )
  }

  if (
    !await auditPassed(
      lessonKey,
    )
  ) {
    console.log(
      '\nAudit exists but is not PASS + judgeReady.',
    )

    console.log(
      'No semantic repair will be attempted automatically.',
    )

    return {
      lessonKey,

      status:
        'FAIL',

      failedStage:
        'AUDIT_DECISION',
    }
  }

  /* ----------------------------------------------------------
     AUDITOR SOURCE CLAIMS
     ---------------------------------------------------------- */

  const auditClaimsPass =
    runTsx(
      'scripts/validate-audit-source-claims.ts',
      lessonKey,
    )

  if (
    !auditClaimsPass
  ) {
    return {
      lessonKey,

      status:
        'FAIL',

      failedStage:
        'AUDIT_SOURCE_CLAIMS',
    }
  }

  /* ----------------------------------------------------------
     PROMOTION
     ---------------------------------------------------------- */

  const promoted =
    runTsx(
      'scripts/promote-v5-judge-demo.ts',
      lessonKey,
    )

  if (
    !promoted
  ) {
    return {
      lessonKey,

      status:
        'FAIL',

      failedStage:
        'PROMOTION',
    }
  }

  return {
    lessonKey,

    status:
      'PASS',

    failedStage:
      null,
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
    ' ChalkBox Remaining Lessons Batch',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Lessons : ${LESSONS.length}`,
  )

  console.log(
    `Duration: ${DURATION} min`,
  )

  console.log(
    'Repair  : NONE',
  )

  console.log(
    'Resume  : YES\n',
  )

  const results:
    LessonResult[] = []

  for (
    const lessonKey
    of LESSONS
  ) {
    try {
      results.push(
        await processLesson(
          lessonKey,
        ),
      )
    } catch (
      error
    ) {
      console.error(
        '\nUnexpected batch error:',
      )

      console.error(
        error instanceof
          Error
          ? error.stack ??
            error.message
          : String(
              error,
            ),
      )

      results.push({
        lessonKey,

        status:
          'FAIL',

        failedStage:
          'UNEXPECTED_ERROR',
      })
    }
  }

  console.log(
    '\n\n==========================================',
  )

  console.log(
    ' ChalkBox Batch Summary',
  )

  console.log(
    '==========================================\n',
  )

  for (
    const result
    of results
  ) {
    const icon =
      result.status ===
        'PASS'
        ? '✓'
        : result.status ===
            'SKIPPED'
          ? '→'
          : '✗'

    console.log(
      `${icon} ${result.lessonKey}`,
    )

    console.log(
      `  status: ${result.status}`,
    )

    if (
      result.failedStage
    ) {
      console.log(
        `  failed stage: ${result.failedStage}`,
      )
    }
  }

  const passed =
    results.filter(
      (item) =>
        item.status ===
          'PASS',
    ).length

  const skipped =
    results.filter(
      (item) =>
        item.status ===
          'SKIPPED',
    ).length

  const failed =
    results.filter(
      (item) =>
        item.status ===
          'FAIL',
    ).length

  console.log(
    '\n------------------------------------------',
  )

  console.log(
    `Passed  : ${passed}`,
  )

  console.log(
    `Skipped : ${skipped}`,
  )

  console.log(
    `Failed  : ${failed}`,
  )

  console.log(
    '------------------------------------------\n',
  )

  if (
    failed >
      0
  ) {
    console.log(
      'One or more lessons need review.',
    )

    console.log(
      'Successful lessons remain preserved.',
    )

    process.exitCode =
      1

    return
  }

  console.log(
    'All remaining demo lessons are judge-ready.',
  )
}

main().catch(
  (
    error:
      unknown,
  ) => {
    console.error(
      error instanceof
        Error
        ? error.stack ??
          error.message
        : String(
            error,
          ),
    )

    process.exitCode =
      1
  },
)