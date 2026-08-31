import {
  formatFormulaText,
} from '@/lib/formulaText'

export type JsonRecord =
  Record<string, unknown>

export type LessonLanguage =
  | 'english'
  | 'hindi'

export type FlashcardCategory =
  | 'formula'
  | 'concept'
  | 'practice'
  | 'check'
  | 'misconception'

export type LessonFlashcard = {
  id: string
  category: FlashcardCategory
  front: string
  back: string
}

export type FormulaLike = {
  label: string
  formula: string
  note: string
}

export type TeachStep = {
  key: string
  label: string
  timeLabel: string
  primaryText: string
  bullets: string[]
  question: string | null
  answer: string | null
  sourcePages: number[]
}

export type FlowItem = {
  key: string
  label: string
  minutes: string
  description: string
}

export const lessonSectionLabels:
  Record<string, string> = {
    hook: 'Hook',
    define: 'Define',
    explain: 'Explain',
    visualize: 'Visualize',
    example: 'Example',
    activity: 'Activity',
    howToTeach:
      'How to Teach',
    boardPlan:
      'Board Plan',
    practice: 'Practice',
    checkUnderstanding:
      'Check Understanding',
    materials:
      'Lesson Materials',
  }

export const lessonFlowItems:
  FlowItem[] = [
    {
      key: 'hook',
      label: 'Hook',
      minutes: '0–3 min',
      description:
        'Spark curiosity and activate prior knowledge.',
    },
    {
      key: 'define',
      label: 'Define',
      minutes: '3–8 min',
      description:
        'Establish the essential vocabulary and formulas.',
    },
    {
      key: 'explain',
      label: 'Explain',
      minutes: '8–16 min',
      description:
        'Connect the core ideas and explain why they work.',
    },
    {
      key: 'visualize',
      label: 'Visualize',
      minutes: '16–21 min',
      description:
        'Use the board visual to make the concept concrete.',
    },
    {
      key: 'activity',
      label: 'Activity',
      minutes: '21–28 min',
      description:
        'Move from explanation to hands-on observation.',
    },
    {
      key: 'example',
      label: 'Example',
      minutes: '28–33 min',
      description:
        'Work through one representative problem.',
    },
    {
      key: 'practice',
      label: 'Practice',
      minutes: '33–37 min',
      description:
        'Let students apply the idea themselves.',
    },
    {
      key: 'checkUnderstanding',
      label: 'Check Understanding',
      minutes: '37–40 min',
      description:
        'Confirm understanding before the class ends.',
    },
  ]

export function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

export function asRecord(
  value: unknown,
) {
  return isRecord(value)
    ? value
    : null
}

export function asString(
  value: unknown,
) {
  return typeof value ===
    'string'
    ? value
    : null
}

export function asNumber(
  value: unknown,
) {
  return typeof value ===
    'number'
    ? value
    : null
}

export function asStringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item ===
      'string',
  )
}

export function asNumberArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (
      item,
    ): item is number =>
      typeof item ===
      'number',
  )
}

export function asRecordArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    isRecord,
  )
}

export function titleCase(
  value: string,
) {
  return value
    .replaceAll(
      '_',
      ' ',
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    )
}

function compactText(
  text: string | null,
  maxLength = 650,
) {
  if (!text) {
    return ''
  }

  if (
    text.length <=
    maxLength
  ) {
    return text
  }

  return `${text
    .slice(
      0,
      maxLength,
    )
    .trim()}…`
}

export function getFormulaCards(
  lessonKey: string,
): FormulaLike[] {
  if (
    lessonKey ===
    'class-10-electricity'
  ) {
    return [
      {
        label:
          'Electric Current',
        formula:
          'I = Q / t',
        note:
          'Rate of flow of charge',
      },
      {
        label:
          "Ohm's Law",
        formula:
          'V = IR',
        note:
          'At constant temperature',
      },
      {
        label:
          'Resistance',
        formula:
          'R = ρl / A',
        note:
          'Length, area and resistivity',
      },
      {
        label:
          'Joule Heating',
        formula:
          'H = I²Rt',
        note:
          'Heat produced in a resistor',
      },
      {
        label:
          'Electric Power',
        formula:
          'P = VI',
        note:
          'Also I²R or V²/R',
      },
    ]
  }

  if (
    lessonKey ===
    'class-9-force-laws-motion'
  ) {
    return [
      {
        label: 'Momentum',
        formula: 'p = mv',
        note:
          'Mass × velocity',
      },
      {
        label:
          "Newton's Second Law",
        formula: 'F = ma',
        note:
          'Force produces acceleration',
      },
      {
        label:
          'Momentum Conservation',
        formula:
          'm₁u₁ + m₂u₂ = m₁v₁ + m₂v₂',
        note:
          'When external net force is zero',
      },
    ]
  }

  if (
    lessonKey ===
    'class-9-work-energy'
  ) {
    return [
      {
        label: 'Work',
        formula: 'W = Fs',
        note:
          'Force along displacement',
      },
      {
        label:
          'Kinetic Energy',
        formula:
          'KE = ½mv²',
        note:
          'Energy due to motion',
      },
      {
        label:
          'Potential Energy',
        formula:
          'PE = mgh',
        note:
          'Gravitational potential energy',
      },
      {
        label: 'Power',
        formula:
          'P = W / t',
        note:
          'Rate of doing work',
      },
    ]
  }

  return []
}

function uniqueFlashcards(
  cards:
    LessonFlashcard[],
) {
  const seen =
    new Set<string>()

  return cards.filter(
    (card) => {
      const signature =
        `${card.front}|||${card.back}`

      if (
        seen.has(
          signature,
        )
      ) {
        return false
      }

      seen.add(signature)

      return true
    },
  )
}

export function buildFlashcards(
  lesson: JsonRecord,
  formulas:
    FormulaLike[] = [],
) {
  const cards:
    LessonFlashcard[] = []

  formulas.forEach(
    (
      formula,
      index,
    ) => {
      cards.push({
        id:
          `formula-${index}`,
        category:
          'formula',
        front:
          `What is the formula for ${formula.label}?`,
        back:
          `${formatFormulaText(formula.formula)}\n\n${formatFormulaText(formula.note)}`,
      })
    },
  )

  const quickIdeas =
    asRecord(
      lesson.quickIdeas,
    )

  const quickChecks =
    asRecordArray(
      quickIdeas
        ?.quickChecks,
    )

  quickChecks.forEach(
    (
      item,
      index,
    ) => {
      const question =
        asString(
          item.question,
        )

      const answer =
        asString(
          item
            .expectedAnswer,
        )

      if (
        question &&
        answer
      ) {
        cards.push({
          id:
            `concept-${index}`,
          category:
            'concept',
          front:
            question,
          back:
            answer,
        })
      }
    },
  )

  const fullLesson =
    asRecord(
      lesson.fullLesson,
    )

  const practice =
    asRecord(
      fullLesson
        ?.practice,
    )

  const practiceQuestions =
    asRecordArray(
      practice
        ?.questions,
    )

  practiceQuestions.forEach(
    (
      item,
      index,
    ) => {
      const question =
        asString(
          item.question,
        )

      const answer =
        asString(
          item
            .expectedAnswer,
        )

      if (
        question &&
        answer
      ) {
        cards.push({
          id:
            `practice-${index}`,
          category:
            'practice',
          front:
            question,
          back:
            answer,
        })
      }
    },
  )

  const checks =
    asRecord(
      fullLesson
        ?.checkUnderstanding,
    )

  const checkQuestions =
    asRecordArray(
      checks?.questions,
    )

  checkQuestions.forEach(
    (
      item,
      index,
    ) => {
      const question =
        asString(
          item.question,
        )

      const answer =
        asString(
          item
            .expectedAnswer,
        )

      if (
        question &&
        answer
      ) {
        cards.push({
          id:
            `check-${index}`,
          category:
            'check',
          front:
            question,
          back:
            answer,
        })
      }
    },
  )

  const howToTeach =
    asRecord(
      fullLesson
        ?.howToTeach,
    )

  const misconceptions =
    asRecordArray(
      howToTeach
        ?.misconceptions,
    )

  misconceptions.forEach(
    (
      item,
      index,
    ) => {
      const misconception =
        asString(
          item
            .misconception,
        )

      const correction =
        asString(
          item.correction,
        )

      if (
        misconception &&
        correction
      ) {
        cards.push({
          id:
            `misconception-${index}`,
          category:
            'misconception',
          front:
            `True or false?\n\n${misconception}`,
          back:
            `False.\n\n${correction}`,
        })
      }
    },
  )

  return uniqueFlashcards(
    cards,
  )
}

const timeLabels:
  Record<string, string> = {
    hook: '0–3 min',
    define: '3–8 min',
    explain: '8–16 min',
    visualize:
      '16–21 min',
    activity:
      '21–28 min',
    example:
      '28–33 min',
    practice:
      '33–37 min',
    checkUnderstanding:
      '37–40 min',
  }

function createTeachStep(
  key: string,
  label: string,
  section: JsonRecord,
): TeachStep {
  const questions =
    asRecordArray(
      section.questions,
    )

  const firstQuestion =
    questions[0]

  const question =
    firstQuestion
      ? asString(
          firstQuestion
            .question,
        )
      : null

  const answer =
    firstQuestion
      ? asString(
          firstQuestion
            .expectedAnswer,
        )
      : null

  let primaryText =
    ''

  let bullets:
    string[] = []

  if (key === 'hook') {
    primaryText =
      asString(
        section
          .teacherPrompt,
      ) ?? ''

    const response =
      asString(
        section
          .expectedStudentResponse,
      )

    if (response) {
      bullets = [
        `Listen for: ${response}`,
      ]
    }
  }

  if (
    key === 'define' ||
    key === 'explain'
  ) {
    primaryText =
      compactText(
        asString(
          section
            .teacherScript,
        ),
      )

    bullets =
      asStringArray(
        section
          .keyPoints,
      ).slice(0, 4)
  }

  if (
    key ===
    'visualize'
  ) {
    primaryText =
      compactText(
        asString(
          section
            .teacherInstructions,
        ),
      )

    bullets =
      asStringArray(
        section
          .whatStudentsShouldNotice,
      ).slice(0, 4)

    if (
      bullets.length ===
      0
    ) {
      bullets =
        asStringArray(
          section
            .boardDrawingSteps,
        ).slice(0, 4)
    }

    const safetyNote =
      asString(
        section.safetyNote,
      )

    if (safetyNote) {
      bullets.push(
        `Safety: ${safetyNote}`,
      )
    }
  }

  if (
    key ===
    'activity'
  ) {
    primaryText =
      asString(
        section.objective,
      ) ??
      asString(
        section.title,
      ) ??
      ''

    bullets =
      asStringArray(
        section.steps,
      ).slice(0, 4)

    const safetyNote =
      asString(
        section.safetyNote,
      )

    if (safetyNote) {
      bullets.push(
        `Safety: ${safetyNote}`,
      )
    }
  }

  if (
    key === 'example'
  ) {
    const title =
      asString(
        section.title,
      )

    const explanation =
      asString(
        section
          .explanation,
      )

    primaryText =
      [
        title,
        explanation,
      ]
        .filter(Boolean)
        .join('. ')

    bullets =
      asStringArray(
        section.steps,
      ).slice(0, 4)
  }

  if (
    key ===
      'practice' ||
    key ===
      'checkUnderstanding'
  ) {
    primaryText =
      question ??
      'Ask students to attempt the question before revealing the answer.'
  }

  if (!primaryText) {
    primaryText =
      bullets[0] ??
      'Use the detailed lesson reference for this step.'
  }

  return {
    key,
    label,
    timeLabel:
      timeLabels[key] ??
      '',
    primaryText,
    bullets,
    question:
      key ===
        'practice' ||
      key ===
        'checkUnderstanding'
        ? question
        : null,
    answer:
      key ===
        'practice' ||
      key ===
        'checkUnderstanding'
        ? answer
        : null,
    sourcePages:
      asNumberArray(
        section
          .sourcePages,
      ),
  }
}

export function buildTeachSteps(
  lesson: JsonRecord,
) {
  const fullLesson =
    asRecord(
      lesson.fullLesson,
    )

  if (!fullLesson) {
    return []
  }

  const definitions: Array<
    [
      string,
      string,
      unknown,
    ]
  > = [
    [
      'hook',
      'Hook',
      lesson.hook ?? fullLesson.hook,
    ],
    [
      'define',
      'Define',
      fullLesson.define,
    ],
    [
      'explain',
      'Explain',
      fullLesson.explain,
    ],
    [
      'visualize',
      'Visualize',
      fullLesson.visualize,
    ],
    [
      'activity',
      'Activity',
      fullLesson.activity,
    ],
    [
      'example',
      'Example',
      fullLesson.example,
    ],
    [
      'practice',
      'Practice',
      fullLesson.practice,
    ],
    [
      'checkUnderstanding',
      'Check Understanding',
      fullLesson
        .checkUnderstanding,
    ],
  ]

  return definitions
    .map(
      ([
        key,
        label,
        value,
      ]) => {
        const section =
          asRecord(value)

        if (!section) {
          return null
        }

        return createTeachStep(
          key,
          label,
          section,
        )
      },
    )
    .filter(
      (
        step,
      ): step is TeachStep =>
        step !== null,
    )
}