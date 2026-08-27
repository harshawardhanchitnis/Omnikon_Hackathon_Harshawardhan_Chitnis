import {
  useMemo,
  useState,
} from 'react'

import type {
  JsonRecord,
} from '@/lib/lessonExperience'
import {
  applyLessonCustomizations,
  loadLessonCustomizations,
  saveLessonCustomizations,
  type CustomizableSectionKey,
  type LessonCustomizations,
} from '@/lib/lessonCustomization'

export function useLessonCustomizations(
  lessonIdentity: string,
  originalLesson: JsonRecord,
) {
  const [customizations, setCustomizations] =
    useState<LessonCustomizations>(
      () =>
        loadLessonCustomizations(
          lessonIdentity,
        ),
    )

  const lesson = useMemo(
    () =>
      applyLessonCustomizations(
        originalLesson,
        customizations,
      ),
    [originalLesson, customizations],
  )

  const customized =
    Object.keys(customizations).length > 0

  function saveSection(
    key: CustomizableSectionKey,
    text: string,
  ) {
    setCustomizations((current) => {
      const next = {
        ...current,
      }
      const trimmed = text.trim()

      if (trimmed) {
        next[key] = trimmed
      } else {
        delete next[key]
      }

      saveLessonCustomizations(
        lessonIdentity,
        next,
      )
      return next
    })
  }

  function resetSection(
    key: CustomizableSectionKey,
  ) {
    setCustomizations((current) => {
      const next = {
        ...current,
      }
      delete next[key]
      saveLessonCustomizations(
        lessonIdentity,
        next,
      )
      return next
    })
  }

  function resetAll() {
    saveLessonCustomizations(
      lessonIdentity,
      {},
    )
    setCustomizations({})
  }

  return {
    lesson,
    customizations,
    customized,
    saveSection,
    resetSection,
    resetAll,
  }
}
