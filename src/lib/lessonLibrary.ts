import { textbookLessons } from '@/data/textbookCatalog'
import { asString } from '@/lib/lessonExperience'
import {
  activateTopicLessonBundle,
  loadTopicLessonHistory,
  type TopicLessonBundle,
} from '@/lib/topicMode'

export type LessonLibraryMode = 'textbook' | 'topic'

export type LessonLibraryItem = {
  id: string
  mode: LessonLibraryMode
  title: string
  classLevel: number
  subject: string
  meta: string
  updatedAt: string | null
  href: string
  badge: string
  searchableText: string
  topicBundle?: TopicLessonBundle
}

type TextbookVisit = {
  lessonKey: string
  visitedAt: string
}

const textbookRecentKey =
  'chalkbox-textbook-recent-v1'
const maxRecentTextbooks = 8

function safeParse(raw: string | null): unknown {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function loadTextbookVisits(): TextbookVisit[] {
  const parsed = safeParse(
    localStorage.getItem(textbookRecentKey),
  )

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.filter(
    (item): item is TextbookVisit =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as TextbookVisit).lessonKey === 'string' &&
      typeof (item as TextbookVisit).visitedAt === 'string',
  )
}

export function recordTextbookLessonVisit(
  lessonKey: string,
) {
  const next: TextbookVisit[] = [
    {
      lessonKey,
      visitedAt: new Date().toISOString(),
    },
    ...loadTextbookVisits().filter(
      (item) => item.lessonKey !== lessonKey,
    ),
  ].slice(0, maxRecentTextbooks)

  localStorage.setItem(
    textbookRecentKey,
    JSON.stringify(next),
  )
}

function getTextbookVisitTime(lessonKey: string) {
  return (
    loadTextbookVisits().find(
      (item) => item.lessonKey === lessonKey,
    )?.visitedAt ?? null
  )
}

function topicTitle(bundle: TopicLessonBundle) {
  return (
    asString(bundle.lesson.title) ??
    bundle.request.teacherRequest.slice(0, 80) ??
    'Topic teaching plan'
  )
}

export function getLessonLibraryItems(): LessonLibraryItem[] {
  const textbookItems = textbookLessons.map(
    (lesson): LessonLibraryItem => ({
      id: `textbook:${lesson.key}`,
      mode: 'textbook',
      title: lesson.title,
      classLevel: lesson.classLevel,
      subject: lesson.subject,
      meta: `Class ${lesson.classLevel} · ${lesson.subject}`,
      updatedAt: getTextbookVisitTime(lesson.key),
      href: `/lesson/${lesson.key}`,
      badge: 'Textbook verified',
      searchableText:
        `${lesson.title} class ${lesson.classLevel} ${lesson.subject} textbook verified`.toLowerCase(),
    }),
  )

  const topicItems = loadTopicLessonHistory().map(
    (bundle): LessonLibraryItem => {
      const title = topicTitle(bundle)
      const modeLabel =
        bundle.request.requestMode === 'focused'
          ? 'Focused help'
          : 'Complete lesson'

      return {
        id: `topic:${bundle.generationId}`,
        mode: 'topic',
        title,
        classLevel: bundle.request.classLevel,
        subject: bundle.request.subject,
        meta: `Class ${bundle.request.classLevel} · ${bundle.request.subject} · ${modeLabel}`,
        updatedAt: bundle.generatedAt,
        href: '/topic/lesson',
        badge: 'AI-generated · Science checked',
        searchableText:
          `${title} ${bundle.request.teacherRequest} class ${bundle.request.classLevel} ${bundle.request.subject} ${modeLabel}`.toLowerCase(),
        topicBundle: bundle,
      }
    },
  )

  return [...topicItems, ...textbookItems]
}

export function activateLibraryItem(item: LessonLibraryItem) {
  if (item.mode === 'topic' && item.topicBundle) {
    activateTopicLessonBundle(item.topicBundle)
  }
}

export function getRecentLibraryItems(limit = 6) {
  return getLessonLibraryItems()
    .filter((item) => item.updatedAt)
    .sort((left, right) => {
      const leftTime = left.updatedAt
        ? Date.parse(left.updatedAt)
        : 0
      const rightTime = right.updatedAt
        ? Date.parse(right.updatedAt)
        : 0
      return rightTime - leftTime
    })
    .slice(0, limit)
}
