export type TextbookLesson = {
  key: string
  classLevel: 8 | 9 | 10
  subject: 'Science'
  title: string
  sourceFile: string
}

export const textbookLessons: TextbookLesson[] = [
  {
    key: 'class-8-chemical-effects-electric-current',
    classLevel: 8,
    subject: 'Science',
    title: 'Chemical Effects of Electric Current',
    sourceFile:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
  },
  {
    key: 'class-8-materials-metals-non-metals',
    classLevel: 8,
    subject: 'Science',
    title: 'Materials: Metals and Non-Metals',
    sourceFile:
      'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
  },
  {
    key: 'class-9-force-laws-motion',
    classLevel: 9,
    subject: 'Science',
    title: 'Force and Laws of Motion',
    sourceFile:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
  },
  {
    key: 'class-9-work-energy',
    classLevel: 9,
    subject: 'Science',
    title: 'Work and Energy',
    sourceFile:
      'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
  },
  {
    key: 'class-10-life-processes',
    classLevel: 10,
    subject: 'Science',
    title: 'Life Processes',
    sourceFile:
      'NCERT-Class-10-Life-Processes-and-Electricity.pdf',
  },
  {
    key: 'class-10-electricity',
    classLevel: 10,
    subject: 'Science',
    title: 'Electricity',
    sourceFile:
      'NCERT-Class-10-Life-Processes-and-Electricity.pdf',
  },
]

export const supportedClasses = [8, 9, 10] as const

export function getLessonsForClass(classLevel: number) {
  return textbookLessons.filter(
    (lesson) => lesson.classLevel === classLevel,
  )
}

export function getTextbookLesson(key: string) {
  return textbookLessons.find((lesson) => lesson.key === key)
}