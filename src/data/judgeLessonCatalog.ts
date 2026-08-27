type JsonRecord = Record<string, unknown>

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

const judgeModules =
  import.meta.glob(
    './judgeLessons/*.json',
    {
      eager: true,
      import: 'default',
    },
  ) as Record<string, unknown>

const judgeArtifacts =
  Object.values(
    judgeModules,
  ).filter(isRecord)

export function getJudgeLessonArtifact(
  lessonKey: string,
) {
  return judgeArtifacts.find(
    (artifact) => {
      if (
        artifact.lessonKey ===
          lessonKey
      ) {
        return true
      }

      const lesson =
        isRecord(
          artifact.lesson,
        )
          ? artifact.lesson
          : null

      return (
        lesson?.lessonKey ===
        lessonKey
      )
    },
  )
}

export function hasJudgeLesson(
  lessonKey: string,
) {
  return Boolean(
    getJudgeLessonArtifact(
      lessonKey,
    ),
  )
}