import {
  asRecord,
  asString,
  asStringArray,
  type JsonRecord,
} from '@/lib/lessonExperience'

export type CustomizableSectionKey =
  | 'boardPlan'
  | 'hook'
  | 'define'
  | 'explain'
  | 'visualize'
  | 'example'
  | 'activity'
  | 'howToTeach'

export type LessonCustomizations =
  Partial<Record<CustomizableSectionKey, string>>

export type CustomizationField = {
  key: CustomizableSectionKey
  label: string
  description: string
  originalText: string
}

const storagePrefix =
  'chalkbox-lesson-customizations-v1:'

function cloneRecord(
  value: JsonRecord,
): JsonRecord {
  return JSON.parse(
    JSON.stringify(value),
  ) as JsonRecord
}

export function getCustomizationFields(
  lesson: JsonRecord,
): CustomizationField[] {
  const fullLesson =
    asRecord(lesson.fullLesson) ??
    {}
  const hook = asRecord(lesson.hook)
  const boardPlan = asRecord(
    fullLesson.boardPlan,
  )
  const define = asRecord(
    fullLesson.define,
  )
  const explain = asRecord(
    fullLesson.explain,
  )
  const visualize = asRecord(
    fullLesson.visualize,
  )
  const example = asRecord(
    fullLesson.example,
  )
  const activity = asRecord(
    fullLesson.activity,
  )
  const howToTeach = asRecord(
    fullLesson.howToTeach,
  )

  const fields: CustomizationField[] = [
    {
      key: 'boardPlan',
      label: 'Board Plan',
      description:
        'Change what you want written on the board.',
      originalText:
        asString(boardPlan?.text) ?? '',
    },
    {
      key: 'hook',
      label: 'Hook',
      description:
        'Change the opening question or classroom prompt.',
      originalText:
        asString(hook?.teacherPrompt) ?? '',
    },
    {
      key: 'define',
      label: 'Define',
      description:
        'Adjust the core definition or teacher explanation.',
      originalText:
        asString(define?.teacherScript) ?? '',
    },
    {
      key: 'explain',
      label: 'Explain',
      description:
        'Rewrite the main explanation in your own classroom voice.',
      originalText:
        asString(explain?.teacherScript) ?? '',
    },
    {
      key: 'visualize',
      label: 'Visualize',
      description:
        'Change the instructions that introduce the board visual.',
      originalText:
        asString(
          visualize?.teacherInstructions,
        ) ?? '',
    },
    {
      key: 'example',
      label: 'Example',
      description:
        'Adapt the worked example or its explanation.',
      originalText:
        asString(example?.explanation) ??
        asString(example?.title) ??
        '',
    },
    {
      key: 'activity',
      label: 'Activity',
      description:
        'Change the activity objective without changing the source lesson.',
      originalText:
        asString(activity?.objective) ??
        asString(activity?.title) ??
        '',
    },
    {
      key: 'howToTeach',
      label: 'How to Teach',
      description:
        'Add your preferred teacher move for this class.',
      originalText:
        asStringArray(
          howToTeach?.teacherMoves,
        )[0] ?? '',
    },
  ]

  return fields.filter(
    (field) =>
      field.originalText.trim().length > 0,
  )
}

export function applyLessonCustomizations(
  lesson: JsonRecord,
  customizations: LessonCustomizations,
) {
  if (
    Object.keys(customizations).length ===
    0
  ) {
    return lesson
  }

  const next = cloneRecord(lesson)
  const fullLesson =
    asRecord(next.fullLesson)

  if (!fullLesson) {
    return next
  }

  const setField = (
    sectionKey: string,
    field: string,
    value: string | undefined,
  ) => {
    if (!value) {
      return
    }

    const section = asRecord(
      fullLesson[sectionKey],
    )

    if (section) {
      section[field] = value
      section.__teacherCustomized = true
      fullLesson[sectionKey] = section
    }
  }

  const hook = asRecord(next.hook)
  if (hook && customizations.hook) {
    hook.teacherPrompt =
      customizations.hook
    hook.__teacherCustomized = true
    next.hook = hook
  }

  setField(
    'boardPlan',
    'text',
    customizations.boardPlan,
  )
  setField(
    'define',
    'teacherScript',
    customizations.define,
  )
  setField(
    'explain',
    'teacherScript',
    customizations.explain,
  )
  setField(
    'visualize',
    'teacherInstructions',
    customizations.visualize,
  )
  setField(
    'example',
    'explanation',
    customizations.example,
  )
  setField(
    'activity',
    'objective',
    customizations.activity,
  )

  if (customizations.activity) {
    const quickIdeas = asRecord(
      next.quickIdeas,
    )
    const lowActivity = asRecord(
      quickIdeas?.lowResourceActivity,
    )

    if (quickIdeas && lowActivity) {
      lowActivity.objective =
        customizations.activity
      lowActivity.__teacherCustomized = true
      quickIdeas.lowResourceActivity =
        lowActivity
      next.quickIdeas = quickIdeas
    }
  }

  if (customizations.howToTeach) {
    const section = asRecord(
      fullLesson.howToTeach,
    )

    if (section) {
      const moves = asStringArray(
        section.teacherMoves,
      )
      section.teacherMoves = [
        customizations.howToTeach,
        ...moves.slice(1),
      ]
      section.__teacherCustomized = true
      fullLesson.howToTeach = section
    }
  }



  const focusedHelp = asRecord(
    next.focusedHelp,
  )

  if (focusedHelp) {
    if (customizations.boardPlan) {
      focusedHelp.boardPlan =
        customizations.boardPlan
    }
    if (customizations.explain) {
      focusedHelp.explainSimply =
        customizations.explain
    }
    if (customizations.visualize) {
      focusedHelp.visualOrAnalogy =
        customizations.visualize
    }
    if (customizations.example) {
      focusedHelp.example =
        customizations.example
    }
    if (customizations.activity) {
      focusedHelp.activity =
        customizations.activity
    }
    if (customizations.howToTeach) {
      const reteachSteps = asStringArray(
        focusedHelp.reteachSteps,
      )
      focusedHelp.reteachSteps = [
        customizations.howToTeach,
        ...reteachSteps.slice(1),
      ]
    }
    next.focusedHelp = focusedHelp
  }

  next.fullLesson = fullLesson
  return next
}

export function loadLessonCustomizations(
  lessonIdentity: string,
): LessonCustomizations {
  try {
    const raw = localStorage.getItem(
      `${storagePrefix}${lessonIdentity}`,
    )

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as
      Record<string, unknown>
    const next: LessonCustomizations = {}

    Object.entries(parsed).forEach(
      ([key, value]) => {
        if (
          typeof value === 'string' &&
          value.trim()
        ) {
          next[
            key as CustomizableSectionKey
          ] = value.trim()
        }
      },
    )

    return next
  } catch {
    return {}
  }
}

export function saveLessonCustomizations(
  lessonIdentity: string,
  customizations: LessonCustomizations,
) {
  const key =
    `${storagePrefix}${lessonIdentity}`

  if (
    Object.keys(customizations).length ===
    0
  ) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(
    key,
    JSON.stringify(customizations),
  )
}
