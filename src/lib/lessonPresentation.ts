import {
  asNumberArray,
  asRecord,
  asString,
  asStringArray,
  type FlowItem,
  type JsonRecord,
  type TeachStep,
} from '@/lib/lessonExperience'

export type ResourceLevel =
  | 'low'
  | 'standard'
  | 'well'

export type LessonSourceMode =
  | 'textbook'
  | 'topic'

const baseFlow: Array<
  Omit<FlowItem, 'minutes'> & {
    baseMinutes: number
  }
> = [
  {
    key: 'hook',
    label: 'Hook',
    baseMinutes: 3,
    description:
      'Spark curiosity and activate prior knowledge.',
  },
  {
    key: 'define',
    label: 'Define',
    baseMinutes: 5,
    description:
      'Establish the essential vocabulary and formulas.',
  },
  {
    key: 'explain',
    label: 'Explain',
    baseMinutes: 8,
    description:
      'Connect the core ideas and explain why they work.',
  },
  {
    key: 'visualize',
    label: 'Visualize',
    baseMinutes: 5,
    description:
      'Use the board visual to make the concept concrete.',
  },
  {
    key: 'activity',
    label: 'Activity',
    baseMinutes: 7,
    description:
      'Move from explanation to observation or hands-on work.',
  },
  {
    key: 'example',
    label: 'Example',
    baseMinutes: 5,
    description:
      'Work through one representative example.',
  },
  {
    key: 'practice',
    label: 'Practice',
    baseMinutes: 4,
    description:
      'Let students apply the idea themselves.',
  },
  {
    key: 'checkUnderstanding',
    label: 'Exit Check',
    baseMinutes: 3,
    description:
      'Confirm understanding before the class ends.',
  },
]

export function normalizeDuration(
  value: string | null,
  fallback = 40,
) {
  const parsed = Number.parseInt(
    value ?? '',
    10,
  )

  if (
    Number.isFinite(parsed) &&
    parsed >= 20 &&
    parsed <= 120
  ) {
    return parsed
  }

  return fallback
}

export function normalizeResourceLevel(
  value: string | null,
): ResourceLevel {
  if (value === 'standard') {
    return 'standard'
  }

  if (
    value === 'well' ||
    value === 'well-equipped'
  ) {
    return 'well'
  }

  return 'low'
}

export function getResourceLabel(
  resourceLevel: ResourceLevel,
) {
  if (resourceLevel === 'standard') {
    return 'Standard classroom'
  }

  if (resourceLevel === 'well') {
    return 'Well-equipped classroom'
  }

  return 'Low-resource classroom'
}

export function getResourceLabelHindi(
  resourceLevel: ResourceLevel,
) {
  if (resourceLevel === 'standard') {
    return 'मानक कक्षा'
  }

  if (resourceLevel === 'well') {
    return 'सुविधा-संपन्न कक्षा'
  }

  return 'कम-संसाधन कक्षा'
}

function allocateMinutes(
  durationMinutes: number,
) {
  const safeDuration = Math.max(
    baseFlow.length,
    Math.round(durationMinutes),
  )

  const baseTotal = baseFlow.reduce(
    (total, item) =>
      total + item.baseMinutes,
    0,
  )

  const raw = baseFlow.map(
    (item) =>
      (item.baseMinutes /
        baseTotal) *
      safeDuration,
  )

  const allocated = raw.map(
    (value) =>
      Math.max(
        1,
        Math.floor(value),
      ),
  )

  let remaining =
    safeDuration -
    allocated.reduce(
      (total, value) =>
        total + value,
      0,
    )

  const remainderOrder = raw
    .map((value, index) => ({
      index,
      remainder:
        value -
        Math.floor(value),
    }))
    .sort(
      (left, right) =>
        right.remainder -
          left.remainder ||
        left.index -
          right.index,
    )

  let cursor = 0

  while (remaining > 0) {
    const target =
      remainderOrder[
        cursor %
          remainderOrder.length
      ]

    allocated[target.index] += 1
    remaining -= 1
    cursor += 1
  }

  while (remaining < 0) {
    const target = allocated
      .map((value, index) => ({
        index,
        value,
      }))
      .filter(
        (item) =>
          item.value > 1,
      )
      .sort(
        (left, right) =>
          right.value -
          left.value,
      )[0]

    if (!target) {
      break
    }

    allocated[target.index] -= 1
    remaining += 1
  }

  return allocated
}

export function buildLessonFlowItems(
  durationMinutes: number,
): FlowItem[] {
  const allocated =
    allocateMinutes(
      durationMinutes,
    )

  let start = 0

  return baseFlow.map(
    (item, index) => {
      const end =
        start + allocated[index]

      const flowItem: FlowItem = {
        key: item.key,
        label: item.label,
        minutes:
          `${start}–${end} min`,
        description:
          item.description,
      }

      start = end

      return flowItem
    },
  )
}

export function getClassroomActivity(
  lesson: JsonRecord,
  resourceLevel: ResourceLevel,
) {
  const fullLesson =
    asRecord(
      lesson.fullLesson,
    )

  const textbookActivity =
    asRecord(
      fullLesson?.activity,
    )

  const quickIdeas =
    asRecord(
      lesson.quickIdeas,
    )

  const lowResourceActivity =
    asRecord(
      quickIdeas
        ?.lowResourceActivity,
    )

  if (resourceLevel === 'low') {
    return (
      lowResourceActivity ??
      textbookActivity
    )
  }

  return (
    textbookActivity ??
    lowResourceActivity
  )
}

export function getResourceStrategy(
  resourceLevel: ResourceLevel,
  language:
    | 'english'
    | 'hindi' = 'english',
  sourceMode:
    LessonSourceMode = 'textbook',
) {
  const isTopic =
    sourceMode === 'topic'

  if (language === 'hindi') {
    if (resourceLevel === 'standard') {
      return {
        title:
          'मानक कक्षा योजना',
        description:
          isTopic
            ? 'AI द्वारा बनाई गई गतिविधि को सामान्य कक्षा सामग्री के साथ छोटे समूहों या शिक्षक प्रदर्शन के रूप में चलाएँ।'
            : 'सूचीबद्ध पाठ्यपुस्तक गतिविधि को सामान्य कक्षा सामग्री के साथ छोटे समूहों या शिक्षक प्रदर्शन के रूप में चलाएँ।',
        tips: [
          'बोर्ड पर मुख्य दृश्य और निष्कर्ष पूरे समय दिखाई दें।',
          'सामग्री सीमित हो तो समूहों को क्रम से गतिविधि कराएँ।',
        ],
      }
    }

    if (resourceLevel === 'well') {
      return {
        title:
          'सुविधा-संपन्न कक्षा योजना',
        description:
          isTopic
            ? 'योजना में दी गई गतिविधि को उपलब्ध लैब उपकरणों के साथ चलाएँ और डिजिटल साधनों को केवल सहायक विस्तार की तरह उपयोग करें।'
            : 'स्रोत-आधारित गतिविधि को उपलब्ध लैब उपकरणों के साथ चलाएँ और डिजिटल साधनों को केवल सहायक विस्तार की तरह उपयोग करें।',
        tips: [
          'पाठ दृश्य को प्रोजेक्ट करें या डॉक्यूमेंट कैमरा/डिस्प्ले पर बड़ा दिखाएँ।',
          'समूहों से अवलोकन को साझा तालिका में दर्ज कराएँ; इंटरनेट या सिमुलेशन वैकल्पिक रहे।',
        ],
      }
    }

    return {
      title:
        'कम-संसाधन कक्षा योजना',
      description:
        isTopic
          ? 'बोर्ड-फर्स्ट तरीके और योजना में दी गई कम-संसाधन गतिविधि का उपयोग करें; प्रोजेक्टर या इंटरनेट पर निर्भरता न रखें।'
          : 'बोर्ड-फर्स्ट तरीके और पाठ में मौजूद कम-संसाधन गतिविधि का उपयोग करें; प्रोजेक्टर या इंटरनेट पर निर्भरता न रखें।',
      tips: [
        'जो सामग्री उपलब्ध हो उसी से गतिविधि चलाएँ; बाकी अवधारणा बोर्ड दृश्य से समझाएँ।',
        'मापन उपकरण न हों तो अनुमानित डेटा गढ़ने के बजाय अवलोकन और चर्चा पर जोर दें।',
      ],
    }
  }

  if (resourceLevel === 'standard') {
    return {
      title:
        'Standard classroom plan',
      description:
        isTopic
          ? 'Use the generated classroom activity with ordinary classroom materials, either as a teacher demonstration or in small groups.'
          : 'Use the listed textbook activity with ordinary classroom materials, either as a teacher demonstration or in small groups.',
      tips: [
        'Keep the board visual and key conclusion visible throughout the activity.',
        'Rotate groups through the activity if materials are limited.',
      ],
    }
  }

  if (resourceLevel === 'well') {
    return {
      title:
        'Well-equipped classroom plan',
      description:
        isTopic
          ? 'Run the planned activity with available lab apparatus and use digital tools only as an optional enhancement.'
          : 'Run the source-grounded activity with available lab apparatus and use digital tools only as an optional enhancement.',
      tips: [
        'Project the lesson visual or enlarge it with a document camera/display.',
        'Let groups capture observations in a shared data table; internet or simulation remains optional.',
      ],
    }
  }

  return {
    title:
      'Low-resource classroom plan',
    description:
      isTopic
        ? 'Use the board-first route and the generated low-resource activity without depending on a projector or internet connection.'
        : 'Use the board-first route and the lesson’s low-resource activity without depending on a projector or internet connection.',
    tips: [
      'Use only materials that are actually available; teach the remaining concept through the board visual.',
      'If measuring apparatus is unavailable, focus on observation and reasoning rather than inventing readings.',
    ],
  }
}

export function getOrderedLessonSections(
  lesson: JsonRecord,
  resourceLevel: ResourceLevel,
): [string, unknown][] {
  const fullLesson =
    asRecord(
      lesson.fullLesson,
    ) ?? {}

  const selectedActivity =
    getClassroomActivity(
      lesson,
      resourceLevel,
    )

  const sectionOrder = [
    'define',
    'explain',
    'visualize',
    'activity',
    'example',
    'howToTeach',
    'practice',
    'checkUnderstanding',
    'materials',
  ]

  const remaining =
    Object.entries(fullLesson)
      .filter(
        ([key]) =>
          key !== 'boardPlan' &&
          key !== 'hook',
      )
      .map(
        ([key, value]): [string, unknown] => {
          if (
            key === 'activity'
          ) {
            return [
              key,
              selectedActivity ??
                value,
            ]
          }

          if (
            key === 'materials' &&
            resourceLevel ===
              'low'
          ) {
            const lowMaterials =
              asStringArray(
                selectedActivity
                  ?.materials,
              )

            if (
              lowMaterials.length >
              0
            ) {
              return [
                key,
                lowMaterials,
              ]
            }
          }

          return [key, value]
        },
      )
      .sort(([left], [right]) => {
        const leftIndex =
          sectionOrder.indexOf(left)
        const rightIndex =
          sectionOrder.indexOf(right)

        return (
          (leftIndex < 0
            ? Number.MAX_SAFE_INTEGER
            : leftIndex) -
          (rightIndex < 0
            ? Number.MAX_SAFE_INTEGER
            : rightIndex)
        )
      }) as [string, unknown][]

  return [
    [
      'boardPlan',
      fullLesson.boardPlan,
    ],
    [
      'hook',
      lesson.hook ??
        fullLesson.hook,
    ],
    ...remaining,
  ].filter(
    ([, value]) =>
      value !== undefined &&
      value !== null,
  ) as [string, unknown][]
}

function buildActivityStep(
  section: JsonRecord,
  original: TeachStep,
  resourceLevel: ResourceLevel,
  sourceMode: LessonSourceMode,
) {
  const primaryText =
    asString(
      section.objective,
    ) ??
    asString(section.title) ??
    original.primaryText

  const bullets =
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

  const resourceTip =
    getResourceStrategy(
      resourceLevel,
      'english',
      sourceMode,
    ).tips[0]

  if (resourceTip) {
    bullets.push(
      `Resource adaptation: ${resourceTip}`,
    )
  }

  return {
    ...original,
    primaryText,
    bullets,
    sourcePages:
      asNumberArray(
        section.sourcePages,
      ),
  }
}

export function adaptTeachSteps(
  steps: TeachStep[],
  lesson: JsonRecord,
  durationMinutes: number,
  resourceLevel: ResourceLevel,
  sourceMode:
    LessonSourceMode = 'textbook',
) {
  const flowByKey =
    new Map(
      buildLessonFlowItems(
        durationMinutes,
      ).map((item) => [
        item.key,
        item,
      ]),
    )

  const selectedActivity =
    getClassroomActivity(
      lesson,
      resourceLevel,
    )

  return steps.map(
    (step) => {
      let next = {
        ...step,
        timeLabel:
          flowByKey.get(
            step.key,
          )?.minutes ??
          step.timeLabel,
      }

      if (
        step.key ===
          'activity' &&
        selectedActivity
      ) {
        next = buildActivityStep(
          selectedActivity,
          next,
          resourceLevel,
          sourceMode,
        )
      }

      return next
    },
  )
}
