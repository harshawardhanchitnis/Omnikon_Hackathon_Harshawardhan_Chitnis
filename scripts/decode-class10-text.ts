import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import {
  extractPdfRange,
  type ExtractedPage,
} from './extract-pdf-text'

/* ============================================================
   CHALKBOX — CLASS 10 BROKEN FONT DECODER AUDIT

   PURPOSE

   The Class 10 PDF has a corrupted ToUnicode / Type3 font
   mapping. The underlying text sequence appears to survive,
   but characters are returned as symbols.

   We already have clean Gemini transcriptions for:

      Life Processes pages 1-6
      Life Processes pages 7-12

   This script uses those EXISTING local caches as a parallel
   corpus to learn the broken glyph mapping.

   Then it tests whether those mappings generalise to pages
   13-45.

   IMPORTANT

   This script:

   - makes ZERO Gemini calls
   - makes ZERO embedding calls
   - makes ZERO Supabase calls
   - does NOT overwrite transcripts
   - does NOT overwrite fallback caches
   - does NOT modify the source PDF

   Run:

      pnpm exec tsx scripts/decode-class10-text.ts
============================================================ */


/* ============================================================
   PATHS
============================================================ */

const PROJECT_ROOT =
  process.cwd()

const PDF_PATH =
  path.join(
    PROJECT_ROOT,
    'data',
    'textbooks',
    'NCERT-Class-10-Life-Processes-and-Electricity.pdf',
  )

const OUTPUT_DIRECTORY =
  path.join(
    PROJECT_ROOT,
    'data',
    'ingestion-output',
  )

const FALLBACK_CACHE_DIRECTORY =
  path.join(
    OUTPUT_DIRECTORY,
    'fallback-batches',
  )

const REPORT_PATH =
  path.join(
    OUTPUT_DIRECTORY,
    'class10-decoder-report.json',
  )

const DECODED_TEXT_PATH =
  path.join(
    OUTPUT_DIRECTORY,
    'class10-decoder-audit.txt',
  )

const MAP_PATH =
  path.join(
    OUTPUT_DIRECTORY,
    'class10-glyph-map.json',
  )


/* ============================================================
   SETTINGS
============================================================ */

const START_PAGE = 1
const END_PAGE = 45

/*
 * Pages for which we already have clean Gemini transcription.
 */
const TRAINING_LAST_PAGE = 12

/*
 * Minimum number of observations before trusting a glyph.
 */
const GLOBAL_MIN_SUPPORT = 4

/*
 * A glyph must map to the same plaintext character at least
 * this fraction of the time to enter the global stable map.
 */
const GLOBAL_MIN_CONFIDENCE = 0.92

/*
 * Per-page maps have less evidence, so the threshold is
 * deliberately a little looser.
 */
const PAGE_MIN_SUPPORT = 2
const PAGE_MIN_CONFIDENCE = 0.80

/*
 * We will declare the current deterministic mapping approach
 * safe only if target pages decode with high coverage.

 * This is intentionally conservative because these transcripts
 * will later become RAG source material.
 */
const SAFE_PAGE_COVERAGE = 0.85

const SAFE_MEDIAN_COVERAGE = 0.90


/* ============================================================
   TYPES
============================================================ */

type CachedPage = {
  lessonLocalPage?: number

  sourcePdfPage: number

  text: string

  extractionMethod?: string
}

type CacheFile = {
  lessonKey?: string

  transcriptionModel?: string

  sourceStartPage?: number

  sourceEndPage?: number

  pages?: CachedPage[]
}

type CleanPage = {
  sourcePdfPage: number

  text: string
}

type WordToken = {
  value: string
}

type AlignmentPair = {
  cipherRaw: string

  cleanWord: string

  cipherCore: string

  score: number
}

type CharacterVoteTable =
  Map<
    string,
    Map<string, number>
  >

type MappingEntry = {
  cipher: string

  plain: string

  support: number

  confidence: number

  alternatives: Array<{
    plain: string
    count: number
  }>
}

type CharacterMap =
  Map<string, string>

type PageMapResult = {
  pageNumber: number

  alignedWords: number

  mappingEntries:
    MappingEntry[]

  map:
    CharacterMap
}

type CandidateDecode = {
  source: string

  text: string

  mappedCharacters: number

  totalCharacters: number

  coverage: number

  englishScore: number

  combinedScore: number
}

type PageReport = {
  pageNumber: number

  trainingPage: boolean

  selectedMap: string

  coverage: number

  englishScore: number

  combinedScore: number

  unknownCharacters:
    string[]

  decodedPreview: string
}


/* ============================================================
   COMMON WORDS

   Used only to score whether a candidate decode resembles
   English.

   It is NOT used as source textbook content.
============================================================ */

const COMMON_WORDS =
  new Set([
    'the',
    'and',
    'that',
    'this',
    'with',
    'from',
    'which',
    'are',
    'for',
    'was',
    'were',
    'have',
    'has',
    'had',
    'not',
    'but',
    'can',
    'will',
    'into',
    'their',
    'there',
    'these',
    'those',
    'they',
    'them',
    'then',
    'than',
    'when',
    'where',
    'what',
    'why',
    'how',
    'also',
    'some',
    'such',
    'other',
    'more',
    'most',
    'all',
    'each',
    'only',
    'our',
    'you',
    'your',
    'its',
    'his',
    'her',
    'one',
    'two',
    'three',
    'may',
    'must',
    'does',
    'do',
    'did',
    'been',
    'being',
    'between',
    'through',
    'during',
    'about',
    'because',
    'called',
    'shown',
    'figure',
    'activity',
    'water',
    'food',
    'energy',
    'oxygen',
    'carbon',
    'blood',
    'cell',
    'cells',
    'body',
    'plant',
    'plants',
    'life',
    'process',
    'processes',
    'living',
    'organism',
    'organisms',
    'transport',
    'respiration',
    'photosynthesis',
    'nutrition',
    'current',
    'electric',
    'electricity',
    'circuit',
    'resistance',
    'potential',
    'voltage',
    'charge',
    'wire',
    'electron',
    'electrons',
    'power',
    'heat',
  ])


/* ============================================================
   BASIC HELPERS
============================================================ */

function round(
  value: number,
  digits = 4,
) {
  const factor =
    10 ** digits

  return (
    Math.round(
      value * factor,
    ) / factor
  )
}


function cleanWhitespace(
  value: string,
) {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


function normaliseCleanTranscript(
  value: string,
) {
  return cleanWhitespace(
    value
      /*
       * Remove visual descriptions generated by Gemini because
       * they do not have corresponding text-layer characters.
       */
      .split('\n')
      .filter(
        (line) =>
          !line
            .trim()
            .toLowerCase()
            .startsWith(
              'visual:',
            ),
      )
      .join('\n')
      /*
       * Remove common Markdown syntax.
       */
      .replace(
        /^#{1,6}\s*/gm,
        '',
      )
      .replace(
        /\*\*/g,
        '',
      )
      .replace(
        /__/g,
        '',
      )
      .replace(
        /`/g,
        '',
      ),
  )
}


/* ============================================================
   TOKENISATION
============================================================ */

function cleanWordTokens(
  text: string,
): WordToken[] {
  const matches =
    normaliseCleanTranscript(
      text,
    ).match(
      /[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?/g,
    ) ?? []

  return matches.map(
    (value) => ({
      value:
        value.toLowerCase(),
    }),
  )
}


/*
 * The corrupted representation still retains whitespace very
 * well, so space-separated tokens are useful alignment anchors.
 */
function cipherTokens(
  text: string,
) {
  return cleanWhitespace(
    text,
  )
    .split(/\s+/)
    .map(
      (token) =>
        token.trim(),
    )
    .filter(Boolean)
}


/* ============================================================
   SUBSTITUTION PATTERN

   Example:

      hello  → 0,1,2,2,3
      ✦★✧✧✩ → 0,1,2,2,3

   A substitution cipher preserves this pattern even when we
   do not know what any glyph means.
============================================================ */

function wordPattern(
  value: string,
) {
  const ids =
    new Map<
      string,
      number
    >()

  let nextId = 0

  return Array.from(value)
    .map(
      (character) => {
        if (
          !ids.has(
            character,
          )
        ) {
          ids.set(
            character,
            nextId,
          )

          nextId += 1
        }

        return ids.get(
          character,
        )
      },
    )
    .join(',')
}


/* ============================================================
   CIPHER TOKEN VARIANTS

   Punctuation in this broken PDF can be attached to encoded
   words.

   For an observed token we therefore try small trims from both
   sides and select the variant whose length/repetition pattern
   best matches the clean word.
============================================================ */

function cipherCoreVariants(
  raw: string,
) {
  const chars =
    Array.from(raw)

  const variants =
    new Set<string>()

  const maxTrim =
    Math.min(
      2,
      Math.max(
        0,
        chars.length - 1,
      ),
    )

  for (
    let left = 0;
    left <= maxTrim;
    left += 1
  ) {
    for (
      let right = 0;
      right <= maxTrim;
      right += 1
    ) {
      if (
        left + right >=
        chars.length
      ) {
        continue
      }

      const end =
        right === 0
          ? chars.length
          : chars.length -
            right

      const candidate =
        chars
          .slice(
            left,
            end,
          )
          .join('')

      if (candidate) {
        variants.add(
          candidate,
        )
      }
    }
  }

  return [
    ...variants,
  ]
}


/* ============================================================
   TOKEN COMPATIBILITY
============================================================ */

function chooseCipherCore(
  raw: string,
  cleanWord: string,
) {
  const cleanChars =
    Array.from(
      cleanWord,
    )

  const cleanPattern =
    wordPattern(
      cleanWord,
    )

  let best:
    | {
        value: string
        score: number
      }
    | undefined

  for (
    const candidate of
      cipherCoreVariants(
        raw,
      )
  ) {
    const candidateChars =
      Array.from(
        candidate,
      )

    let score = -10

    if (
      /^\d/.test(
        cleanWord,
      )
    ) {
      if (
        candidate ===
        cleanWord
      ) {
        score = 15
      } else if (
        candidate.includes(
          cleanWord,
        )
      ) {
        score = 10
      }
    } else {
      const lengthDifference =
        Math.abs(
          candidateChars.length -
            cleanChars.length,
        )

      if (
        lengthDifference === 0
      ) {
        if (
          wordPattern(
            candidate,
          ) ===
          cleanPattern
        ) {
          score = 12
        } else {
          score = 3
        }
      } else if (
        lengthDifference === 1
      ) {
        score = -1
      } else {
        score =
          -6 -
          lengthDifference
      }
    }

    /*
     * Prefer variants requiring less punctuation trimming.
     */
    const trimmed =
      Array.from(raw).length -
      candidateChars.length

    score -=
      trimmed * 0.15

    if (
      !best ||
      score >
        best.score
    ) {
      best = {
        value:
          candidate,

        score,
      }
    }
  }

  return (
    best ?? {
      value:
        raw,

      score:
        -10,
    }
  )
}


/* ============================================================
   TOKEN-SEQUENCE ALIGNMENT

   Dynamic programming aligns corrupted tokens with clean words.

   The substitution pattern gives us strong anchors without
   needing to know the glyph alphabet beforehand.
============================================================ */

function alignTokens(
  cipher:
    string[],

  clean:
    WordToken[],
): AlignmentPair[] {
  const rows =
    cipher.length

  const columns =
    clean.length

  const width =
    columns + 1

  const score =
    new Int32Array(
      (rows + 1) *
        (columns + 1),
    )

  const trace =
    new Uint8Array(
      (rows + 1) *
        (columns + 1),
    )

  const GAP = -4

  for (
    let row = 1;
    row <= rows;
    row += 1
  ) {
    score[
      row * width
    ] =
      row * GAP

    trace[
      row * width
    ] = 1
  }

  for (
    let column = 1;
    column <= columns;
    column += 1
  ) {
    score[column] =
      column * GAP

    trace[column] = 2
  }

  for (
    let row = 1;
    row <= rows;
    row += 1
  ) {
    for (
      let column = 1;
      column <= columns;
      column += 1
    ) {
      const compatibility =
        chooseCipherCore(
          cipher[
            row - 1
          ],

          clean[
            column - 1
          ].value,
        )

      const diagonal =
        score[
          (row - 1) *
            width +
            column -
            1
        ] +
        Math.round(
          compatibility.score *
            10,
        )

      const up =
        score[
          (row - 1) *
            width +
            column
        ] +
        GAP * 10

      const left =
        score[
          row * width +
            column -
            1
        ] +
        GAP * 10

      const index =
        row * width +
        column

      if (
        diagonal >= up &&
        diagonal >= left
      ) {
        score[index] =
          diagonal

        trace[index] = 0
      } else if (
        up >= left
      ) {
        score[index] =
          up

        trace[index] = 1
      } else {
        score[index] =
          left

        trace[index] = 2
      }
    }
  }

  const aligned:
    AlignmentPair[] = []

  let row = rows
  let column = columns

  while (
    row > 0 ||
    column > 0
  ) {
    const direction =
      trace[
        row * width +
        column
      ]

    if (
      row > 0 &&
      column > 0 &&
      direction === 0
    ) {
      const raw =
        cipher[
          row - 1
        ]

      const cleanWord =
        clean[
          column - 1
        ].value

      const choice =
        chooseCipherCore(
          raw,
          cleanWord,
        )

      aligned.push({
        cipherRaw:
          raw,

        cleanWord,

        cipherCore:
          choice.value,

        score:
          choice.score,
      })

      row -= 1
      column -= 1
    } else if (
      row > 0 &&
      (
        column === 0 ||
        direction === 1
      )
    ) {
      row -= 1
    } else if (
      column > 0
    ) {
      column -= 1
    }
  }

  return aligned.reverse()
}


/* ============================================================
   CHARACTER VOTES
============================================================ */

function addVote(
  table:
    CharacterVoteTable,

  cipherCharacter:
    string,

  plainCharacter:
    string,
) {
  let options =
    table.get(
      cipherCharacter,
    )

  if (!options) {
    options =
      new Map<
        string,
        number
      >()

    table.set(
      cipherCharacter,
      options,
    )
  }

  options.set(
    plainCharacter,

    (
      options.get(
        plainCharacter,
      ) ?? 0
    ) + 1,
  )
}


function learnVotes(
  aligned:
    AlignmentPair[],
) {
  const votes:
    CharacterVoteTable =
    new Map()

  let usefulWords = 0

  for (
    const pair of aligned
  ) {
    /*
     * Only strong pattern-preserving alignments contribute to
     * the mapping.
     */
    if (
      pair.score < 9
    ) {
      continue
    }

    const cipherChars =
      Array.from(
        pair.cipherCore,
      )

    const plainChars =
      Array.from(
        pair.cleanWord,
      )

    if (
      cipherChars.length !==
      plainChars.length
    ) {
      continue
    }

    if (
      wordPattern(
        pair.cipherCore,
      ) !==
      wordPattern(
        pair.cleanWord,
      )
    ) {
      continue
    }

    usefulWords += 1

    for (
      let index = 0;
      index <
      cipherChars.length;
      index += 1
    ) {
      addVote(
        votes,

        cipherChars[index],

        plainChars[index],
      )
    }
  }

  return {
    votes,
    usefulWords,
  }
}


/* ============================================================
   MERGE VOTES
============================================================ */

function mergeVotes(
  destination:
    CharacterVoteTable,

  source:
    CharacterVoteTable,
) {
  for (
    const [
      cipherCharacter,
      options,
    ] of source
  ) {
    for (
      const [
        plainCharacter,
        count,
      ] of options
    ) {
      let destinationOptions =
        destination.get(
          cipherCharacter,
        )

      if (
        !destinationOptions
      ) {
        destinationOptions =
          new Map()

        destination.set(
          cipherCharacter,
          destinationOptions,
        )
      }

      destinationOptions.set(
        plainCharacter,

        (
          destinationOptions.get(
            plainCharacter,
          ) ?? 0
        ) + count,
      )
    }
  }
}


/* ============================================================
   CREATE TRUSTED MAP
============================================================ */

function createTrustedMap(
  votes:
    CharacterVoteTable,

  minSupport: number,

  minConfidence: number,
) {
  const map:
    CharacterMap =
    new Map()

  const entries:
    MappingEntry[] = []

  for (
    const [
      cipherCharacter,
      options,
    ] of votes
  ) {
    const ordered = [
      ...options.entries(),
    ].sort(
      (left, right) =>
        right[1] -
        left[1],
    )

    if (
      ordered.length === 0
    ) {
      continue
    }

    const total =
      ordered.reduce(
        (
          sum,
          [, count],
        ) =>
          sum + count,

        0,
      )

    const [
      bestPlain,
      bestCount,
    ] =
      ordered[0]

    const confidence =
      bestCount /
      total

    const entry:
      MappingEntry = {
        cipher:
          cipherCharacter,

        plain:
          bestPlain,

        support:
          total,

        confidence:
          round(
            confidence,
          ),

        alternatives:
          ordered
            .slice(
              0,
              5,
            )
            .map(
              ([
                plain,
                count,
              ]) => ({
                plain,

                count,
              }),
            ),
      }

    entries.push(entry)

    if (
      total >=
        minSupport &&
      confidence >=
        minConfidence
    ) {
      map.set(
        cipherCharacter,
        bestPlain,
      )
    }
  }

  entries.sort(
    (left, right) =>
      right.support -
      left.support,
  )

  return {
    map,
    entries,
  }
}


/* ============================================================
   LOAD EXISTING CLEAN GEMINI CACHES

   Supports both cache naming styles used during our previous
   experiments.
============================================================ */

async function loadCleanCachePages() {
  const cleanPages =
    new Map<
      number,
      CleanPage
    >()

  let fileNames:
    string[]

  try {
    fileNames =
      await fs.readdir(
        FALLBACK_CACHE_DIRECTORY,
      )
  } catch {
    throw new Error(
      [
        'Fallback cache directory does not exist:',
        FALLBACK_CACHE_DIRECTORY,
        '',
        'We expected the successful Class 10 pages 1-6 and 7-12',
        'to already be cached.',
      ].join('\n'),
    )
  }

  for (
    const fileName of
      fileNames
  ) {
    if (
      !fileName.endsWith(
        '.json',
      )
    ) {
      continue
    }

    const filePath =
      path.join(
        FALLBACK_CACHE_DIRECTORY,
        fileName,
      )

    try {
      const raw =
        await fs.readFile(
          filePath,
          'utf8',
        )

      const parsed =
        JSON.parse(
          raw,
        ) as CacheFile

      if (
        !Array.isArray(
          parsed.pages,
        )
      ) {
        continue
      }

      for (
        const page of
          parsed.pages
      ) {
        if (
          Number.isInteger(
            page.sourcePdfPage,
          ) &&
          page.sourcePdfPage >=
            START_PAGE &&
          page.sourcePdfPage <=
            TRAINING_LAST_PAGE &&
          typeof page.text ===
            'string' &&
          page.text.trim()
            .length > 0
        ) {
          cleanPages.set(
            page.sourcePdfPage,

            {
              sourcePdfPage:
                page.sourcePdfPage,

              text:
                page.text,
            },
          )
        }
      }
    } catch {
      /*
       * Ignore unrelated / stale JSON files.
       */
    }
  }

  return cleanPages
}


/* ============================================================
   DECODE
============================================================ */

function decodeWithMap(
  text: string,
  map:
    CharacterMap,
) {
  let mapped = 0
  let total = 0

  const unknown =
    new Set<string>()

  const decoded =
    Array.from(text)
      .map(
        (character) => {
          if (
            /\s/.test(
              character,
            )
          ) {
            return character
          }

          total += 1

          const replacement =
            map.get(
              character,
            )

          if (
            replacement !==
            undefined
          ) {
            mapped += 1

            return replacement
          }

          /*
           * Preserve ordinary ASCII punctuation/digits so
           * formulas and page numbering remain inspectable.
           */
          const code =
            character.codePointAt(
              0,
            ) ?? 0

          if (
            code >= 32 &&
            code <= 126
          ) {
            return character
          }

          unknown.add(
            character,
          )

          return '□'
        },
      )
      .join('')

  const coverage =
    total === 0
      ? 0
      : mapped /
        total

  return {
    text:
      decoded,

    mappedCharacters:
      mapped,

    totalCharacters:
      total,

    coverage,

    unknownCharacters: [
      ...unknown,
    ],
  }
}


/* ============================================================
   ENGLISH SCORE
============================================================ */

function englishScore(
  text: string,
) {
  const words =
    text
      .toLowerCase()
      .match(
        /[a-z]{2,}/g,
      ) ?? []

  if (
    words.length === 0
  ) {
    return 0
  }

  let hits = 0

  for (
    const word of words
  ) {
    if (
      COMMON_WORDS.has(
        word,
      )
    ) {
      hits += 1
    }
  }

  const ordinaryCharacters =
    Array.from(text)
      .filter(
        (character) =>
          /\s|[A-Za-z0-9.,;:!?()'"/+\-=]/.test(
            character,
          ),
      ).length

  const ordinaryRatio =
    ordinaryCharacters /
    Math.max(
      1,
      Array.from(text)
        .length,
    )

  const wordRatio =
    hits /
    words.length

  return Math.min(
    1,

    ordinaryRatio *
      0.55 +
      Math.min(
        1,
        wordRatio /
          0.12,
      ) *
        0.45,
  )
}


/* ============================================================
   CANDIDATE DECODE
============================================================ */

function evaluateMap(
  source: string,
  text: string,
  map:
    CharacterMap,
): CandidateDecode {
  const decoded =
    decodeWithMap(
      text,
      map,
    )

  const language =
    englishScore(
      decoded.text,
    )

  /*
   * Coverage is weighted slightly more heavily because a text
   * that accidentally forms a few common words must not beat a
   * mapping that actually explains most characters.
   */
  const combinedScore =
    decoded.coverage *
      0.65 +
    language * 0.35

  return {
    source,

    text:
      decoded.text,

    mappedCharacters:
      decoded.mappedCharacters,

    totalCharacters:
      decoded.totalCharacters,

    coverage:
      decoded.coverage,

    englishScore:
      language,

    combinedScore,
  }
}


/* ============================================================
   MEDIAN
============================================================ */

function median(
  values: number[],
) {
  if (
    values.length === 0
  ) {
    return 0
  }

  const sorted = [
    ...values,
  ].sort(
    (a, b) =>
      a - b,
  )

  const middle =
    Math.floor(
      sorted.length / 2,
    )

  if (
    sorted.length %
      2 ===
    1
  ) {
    return sorted[
      middle
    ]
  }

  return (
    sorted[
      middle - 1
    ] +
    sorted[
      middle
    ]
  ) / 2
}


/* ============================================================
   MAIN
============================================================ */

async function main() {
  console.log(
    '\n==========================================',
  )

  console.log(
    ' ChalkBox Class 10 Glyph Decoder Audit',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    'API calls       : 0',
  )

  console.log(
    'Embedding calls : 0',
  )

  console.log(
    'Supabase writes : 0\n',
  )

  console.log(
    `PDF:\n${PDF_PATH}\n`,
  )

  await fs.access(
    PDF_PATH,
  )

  await fs.mkdir(
    OUTPUT_DIRECTORY,
    {
      recursive: true,
    },
  )

  /* ========================================================
     LOAD CLEAN TRAINING PAGES
  ======================================================== */

  console.log(
    'Loading existing clean transcription caches...',
  )

  const cleanPages =
    await loadCleanCachePages()

  const trainingPages = [
    ...cleanPages.keys(),
  ].sort(
    (a, b) =>
      a - b,
  )

  console.log(
    `✓ found clean cached pages: ${trainingPages.join(', ')}`,
  )

  if (
    trainingPages.length <
    10
  ) {
    throw new Error(
      [
        '',
        `Only ${trainingPages.length} clean training pages were found.`,
        '',
        'Expected approximately pages 1-12 from the two successful',
        'Flash-Lite caches.',
        '',
        'Do not make more API calls yet.',
      ].join('\n'),
    )
  }


  /* ========================================================
     EXTRACT CORRUPTED SOURCE LOCALLY
  ======================================================== */

  console.log(
    '\nExtracting corrupted Class 10 text locally...',
  )

  const local =
    await extractPdfRange(
      PDF_PATH,
      START_PAGE,
      END_PAGE,
    )

  if (
    local.pages.length !==
    END_PAGE -
      START_PAGE +
      1
  ) {
    throw new Error(
      [
        'Unexpected Class 10 page count.',
        `Expected: ${END_PAGE}`,
        `Received: ${local.pages.length}`,
      ].join('\n'),
    )
  }

  console.log(
    `✓ extracted ${local.pages.length} pages locally`,
  )


  /* ========================================================
     LEARN PAGE-SPECIFIC MAPS
  ======================================================== */

  console.log(
    '\nLearning glyph mappings from cached pages...\n',
  )

  const pageMaps =
    new Map<
      number,
      PageMapResult
    >()

  const globalVotes:
    CharacterVoteTable =
    new Map()

  for (
    const pageNumber of
      trainingPages
  ) {
    const corruptedPage =
      local.pages.find(
        (page) =>
          page.pageNumber ===
          pageNumber,
      )

    const cleanPage =
      cleanPages.get(
        pageNumber,
      )

    if (
      !corruptedPage ||
      !cleanPage
    ) {
      continue
    }

    const cipher =
      cipherTokens(
        corruptedPage.text,
      )

    const clean =
      cleanWordTokens(
        cleanPage.text,
      )

    const aligned =
      alignTokens(
        cipher,
        clean,
      )

    const learned =
      learnVotes(
        aligned,
      )

    const trusted =
      createTrustedMap(
        learned.votes,

        PAGE_MIN_SUPPORT,

        PAGE_MIN_CONFIDENCE,
      )

    pageMaps.set(
      pageNumber,

      {
        pageNumber,

        alignedWords:
          learned.usefulWords,

        mappingEntries:
          trusted.entries,

        map:
          trusted.map,
      },
    )

    mergeVotes(
      globalVotes,
      learned.votes,
    )

    console.log(
      `page ${String(
        pageNumber,
      ).padStart(
        2,
      )}: ${String(
        learned.usefulWords,
      ).padStart(
        3,
      )} aligned words · ${String(
        trusted.map.size,
      ).padStart(
        2,
      )} trusted glyphs`,
    )
  }


  /* ========================================================
     GLOBAL MAP
  ======================================================== */

  const global =
    createTrustedMap(
      globalVotes,

      GLOBAL_MIN_SUPPORT,

      GLOBAL_MIN_CONFIDENCE,
    )

  const ambiguousEntries =
    global.entries.filter(
      (entry) =>
        entry.support >=
          GLOBAL_MIN_SUPPORT &&
        entry.confidence <
          GLOBAL_MIN_CONFIDENCE,
    )

  console.log(
    '\nGlobal mapping summary:',
  )

  console.log(
    `  trusted glyphs   : ${global.map.size}`,
  )

  console.log(
    `  ambiguous glyphs : ${ambiguousEntries.length}`,
  )

  if (
    ambiguousEntries.length >
    0
  ) {
    console.log(
      '\n  Important: the same visible symbol is mapping to different',
    )

    console.log(
      '  letters across the training pages. That indicates multiple',
    )

    console.log(
      '  embedded font encodings rather than one global cipher.',
    )
  }


  /* ========================================================
     CANDIDATE MAPS

     Each training page map is tested independently against
     every later page.

     This lets us discover whether the PDF uses a small number
     of repeating font-encoding families.
  ======================================================== */

  const candidateMaps:
    Array<{
      source: string

      map: CharacterMap
    }> = [
      {
        source:
          'global',

        map:
          global.map,
      },
    ]

  for (
    const [
      pageNumber,
      result,
    ] of pageMaps
  ) {
    candidateMaps.push({
      source:
        `training-page-${pageNumber}`,

      map:
        result.map,
    })
  }


  /* ========================================================
     DECODE ALL 45 PAGES
  ======================================================== */

  console.log(
    '\nTesting learned maps against all 45 pages...\n',
  )

  const reports:
    PageReport[] = []

  const decodedSections:
    string[] = []

  for (
    const page of
      local.pages
  ) {
    const candidates =
      candidateMaps.map(
        (candidate) =>
          evaluateMap(
            candidate.source,

            page.text,

            candidate.map,
          ),
      )

    candidates.sort(
      (left, right) =>
        right.combinedScore -
        left.combinedScore,
    )

    const best =
      candidates[0]

    const decoded =
      decodeWithMap(
        page.text,

        candidateMaps.find(
          (candidate) =>
            candidate.source ===
            best.source,
        )?.map ??
          global.map,
      )

    const report:
      PageReport = {
        pageNumber:
          page.pageNumber,

        trainingPage:
          cleanPages.has(
            page.pageNumber,
          ),

        selectedMap:
          best.source,

        coverage:
          round(
            best.coverage,
          ),

        englishScore:
          round(
            best.englishScore,
          ),

        combinedScore:
          round(
            best.combinedScore,
          ),

        unknownCharacters:
          decoded
            .unknownCharacters,

        decodedPreview:
          best.text
            .replace(
              /\s+/g,
              ' ',
            )
            .slice(
              0,
              220,
            ),
      }

    reports.push(
      report,
    )

    decodedSections.push(
      [
        '============================================================',
        `SOURCE PDF PAGE ${page.pageNumber}`,
        `training page : ${report.trainingPage}`,
        `mapping       : ${report.selectedMap}`,
        `coverage      : ${(report.coverage * 100).toFixed(1)}%`,
        `english score : ${(report.englishScore * 100).toFixed(1)}%`,
        `unknown glyphs: ${report.unknownCharacters.join(' ') || 'none'}`,
        '============================================================',
        '',
        best.text,
        '',
        '',
      ].join('\n'),
    )

    const marker =
      report.trainingPage
        ? 'TRAIN'
        : 'TEST '

    console.log(
      `${marker} page ${String(
        page.pageNumber,
      ).padStart(
        2,
      )} · coverage ${(report.coverage * 100)
        .toFixed(
          1,
        )
        .padStart(
          5,
        )}% · English ${(report.englishScore * 100)
        .toFixed(
          1,
        )
        .padStart(
          5,
        )}% · ${report.selectedMap}`,
    )
  }


  /* ========================================================
     SAFETY DECISION
  ======================================================== */

  const targetReports =
    reports.filter(
      (report) =>
        !report.trainingPage,
    )

  const targetMedianCoverage =
    median(
      targetReports.map(
        (report) =>
          report.coverage,
      ),
    )

  const goodTargetPages =
    targetReports.filter(
      (report) =>
        report.coverage >=
        SAFE_PAGE_COVERAGE,
    ).length

  const safe =
    targetMedianCoverage >=
      SAFE_MEDIAN_COVERAGE &&
    goodTargetPages >=
      Math.ceil(
        targetReports.length *
          0.9,
      )


  /* ========================================================
     WRITE MAP
  ======================================================== */

  const serialisedPageMaps:
    Record<
      string,
      Record<string, string>
    > = {}

  for (
    const [
      pageNumber,
      result,
    ] of pageMaps
  ) {
    serialisedPageMaps[
      String(pageNumber)
    ] =
      Object.fromEntries(
        result.map,
      )
  }

  await fs.writeFile(
    MAP_PATH,

    JSON.stringify(
      {
        generatedAt:
          new Date().toISOString(),

        trainingPages,

        globalTrustedMap:
          Object.fromEntries(
            global.map,
          ),

        globalEntries:
          global.entries,

        ambiguousEntries,

        pageMaps:
          serialisedPageMaps,
      },

      null,
      2,
    ),

    'utf8',
  )


  /* ========================================================
     WRITE DECODED AUDIT
  ======================================================== */

  const auditHeader = [
    'CHALKBOX CLASS 10 LOCAL DECODER AUDIT',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'This is an AUDIT output.',
    'Do not ingest it into Supabase yet.',
    '',
    `Training pages: ${trainingPages.join(', ')}`,
    `Trusted global glyphs: ${global.map.size}`,
    `Ambiguous global glyphs: ${ambiguousEntries.length}`,
    `Target median coverage: ${(targetMedianCoverage * 100).toFixed(1)}%`,
    `Target pages >= ${(SAFE_PAGE_COVERAGE * 100).toFixed(0)}% coverage: ${goodTargetPages}/${targetReports.length}`,
    '',
    `DECISION: ${safe ? 'LOCAL DECODER LOOKS VIABLE' : 'NOT SAFE TO INGEST YET'}`,
    '',
    '',
  ].join('\n')

  await fs.writeFile(
    DECODED_TEXT_PATH,

    auditHeader +
      decodedSections.join(
        '\n',
      ),

    'utf8',
  )


  /* ========================================================
     WRITE REPORT
  ======================================================== */

  await fs.writeFile(
    REPORT_PATH,

    JSON.stringify(
      {
        generatedAt:
          new Date().toISOString(),

        sourcePdf:
          path.basename(
            PDF_PATH,
          ),

        apiCalls:
          0,

        trainingPages,

        mapping: {
          trustedGlobalGlyphs:
            global.map.size,

          ambiguousGlobalGlyphs:
            ambiguousEntries.length,

          ambiguousEntries,
        },

        targetEvaluation: {
          pages:
            targetReports.length,

          medianCoverage:
            round(
              targetMedianCoverage,
            ),

          pagesAboveCoverageThreshold:
            goodTargetPages,

          requiredCoverage:
            SAFE_PAGE_COVERAGE,

          safeToIntegrate:
            safe,
        },

        pages:
          reports,
      },

      null,
      2,
    ),

    'utf8',
  )


  /* ========================================================
     FINAL OUTPUT
  ======================================================== */

  console.log(
    '\n==========================================',
  )

  console.log(
    ' Decoder Audit Complete',
  )

  console.log(
    '==========================================\n',
  )

  console.log(
    `Training pages         : ${trainingPages.length}`,
  )

  console.log(
    `Trusted global glyphs  : ${global.map.size}`,
  )

  console.log(
    `Ambiguous global glyphs: ${ambiguousEntries.length}`,
  )

  console.log(
    `Target median coverage : ${(targetMedianCoverage * 100).toFixed(1)}%`,
  )

  console.log(
    `Good target pages      : ${goodTargetPages}/${targetReports.length}`,
  )

  console.log(
    '\nDecision:',
  )

  if (safe) {
    console.log(
      '✅ LOCAL DECODER LOOKS VIABLE',
    )

    console.log(
      'We will visually verify several pages before integrating it.',
    )
  } else {
    console.log(
      '⚠ NOT SAFE TO INGEST YET',
    )

    console.log(
      'The PDF likely uses multiple changing Type3 font mappings.',
    )

    console.log(
      'Do not use the decoded text for RAG yet.',
    )
  }

  console.log(
    `\nReport:\n${REPORT_PATH}`,
  )

  console.log(
    `\nDecoded audit:\n${DECODED_TEXT_PATH}`,
  )

  console.log(
    `\nLearned maps:\n${MAP_PATH}`,
  )

  console.log(
    '\nNo API quota was used.\n',
  )
}


/* ============================================================
   RUN
============================================================ */

main().catch(
  (error) => {
    console.error(
      '\n==========================================',
    )

    console.error(
      ' Decoder Audit Failed',
    )

    console.error(
      '==========================================\n',
    )

    console.error(
      error instanceof Error
        ? error.stack ??
            error.message
        : String(error),
    )

    console.error(
      '\nNo API calls were made.\n',
    )

    process.exitCode = 1
  },
)