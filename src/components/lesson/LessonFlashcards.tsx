import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  LoaderCircle,
  RotateCw,
  Shuffle,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useLessonTranslation,
} from '@/hooks/useLessonTranslation'
import {
  buildFlashcards,
  type FlashcardCategory,
  type FormulaLike,
  type JsonRecord,
} from '@/lib/lessonExperience'
import type {
  LessonLanguage,
} from '@/lib/lessonLanguage'

type Props = {
  lesson: JsonRecord
  formulas?:
    FormulaLike[]
  language:
    LessonLanguage
}

const EnglishLabels:
  Record<
    FlashcardCategory,
    string
  > = {
    formula: 'Formulas',
    concept: 'Concepts',
    practice: 'Practice',
    check: 'Checks',
    misconception:
      'Misconceptions',
  }

const HindiLabels:
  Record<
    FlashcardCategory,
    string
  > = {
    formula: 'सूत्र',
    concept: 'अवधारणाएँ',
    practice: 'अभ्यास',
    check: 'जाँच',
    misconception:
      'गलत धारणाएँ',
  }

function LessonFlashcards({
  lesson,
  formulas = [],
  language,
}: Props) {
  const cards =
    useMemo(
      () =>
        buildFlashcards(
          lesson,
          formulas,
        ),
      [
        lesson,
        formulas,
      ],
    )

  const [
    category,
    setCategory,
  ] =
    useState<
      | FlashcardCategory
      | 'all'
    >('all')

  const filteredCards =
    useMemo(
      () =>
        category ===
        'all'
          ? cards
          : cards.filter(
              (card) =>
                card.category ===
                category,
            ),
      [cards, category],
    )

  const [
    deck,
    setDeck,
  ] =
    useState(
      filteredCards,
    )

  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(0)

  const [
    flipped,
    setFlipped,
  ] =
    useState(false)

  useEffect(() => {
    setDeck(
      filteredCards,
    )

    setActiveIndex(0)
    setFlipped(false)
  }, [filteredCards])

  const availableCategories =
    useMemo(
      () =>
        (
          Object.keys(
            EnglishLabels,
          ) as
            FlashcardCategory[]
        ).filter(
          (item) =>
            cards.some(
              (card) =>
                card.category ===
                item,
            ),
        ),
      [cards],
    )

  const safeIndex =
    deck.length > 0
      ? Math.min(
          activeIndex,
          deck.length - 1,
        )
      : 0

  const activeCard =
    deck[safeIndex]

  const translationInput =
    activeCard
      ? [
          activeCard.front,
          activeCard.back,
        ]
      : [
          '',
          '',
        ]

  const {
    texts:
      translatedCard,
    translating,
    error:
      translationError,
  } =
    useLessonTranslation(
      translationInput,
      language,
    )

  if (
    !activeCard
  ) {
    return (
      <div className="rounded-[26px] border border-[#dce4da] bg-white p-8 text-center">
        <Lightbulb className="mx-auto size-7 text-[#176b43]" />

        <p className="mt-3 text-sm font-extrabold">
          No recall cards available.
        </p>
      </div>
    )
  }

  const frontText =
    translatedCard[0] ??
    activeCard.front

  const backText =
    translatedCard[1] ??
    activeCard.back

  const categoryLabels =
    language ===
    'hindi'
      ? HindiLabels
      : EnglishLabels

  function next() {
    setActiveIndex(
      (current) =>
        (current + 1) %
        deck.length,
    )

    setFlipped(false)
  }

  function previous() {
    setActiveIndex(
      (current) =>
        (current -
          1 +
          deck.length) %
        deck.length,
    )

    setFlipped(false)
  }

  function shuffleDeck() {
    const shuffled =
      [...deck]

    for (
      let index =
        shuffled.length -
        1;
      index > 0;
      index -= 1
    ) {
      const randomIndex =
        Math.floor(
          Math.random() *
            (index + 1),
        )

      ;[
        shuffled[index],
        shuffled[
          randomIndex
        ],
      ] = [
        shuffled[
          randomIndex
        ],
        shuffled[index],
      ]
    }

    setDeck(shuffled)
    setActiveIndex(0)
    setFlipped(false)
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
            {language ===
            'hindi'
              ? 'कक्षा पुनरावृत्ति'
              : 'Classroom recall'}
          </p>

          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">
            {language ===
            'hindi'
              ? 'फ्लैशकार्ड'
              : 'Flashcards'}
          </h2>

          <p className="mt-1 text-[11px] font-medium text-[#778279]">
            {language ===
            'hindi'
              ? 'पहले प्रश्न। कार्ड पलटने के बाद ही उत्तर दिखाई देगा।'
              : 'Questions first. Answers only after you flip the card.'}
          </p>
        </div>

        <button
          type="button"
          onClick={
            shuffleDeck
          }
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d7e1d4] bg-white px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#5f6c63] hover:bg-[#edf5e9]"
        >
          <Shuffle className="size-3.5" />

          {language ===
          'hindi'
            ? 'मिलाएँ'
            : 'Shuffle'}
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() =>
            setCategory(
              'all',
            )
          }
          className={`shrink-0 rounded-full px-3 py-2 text-[9px] font-extrabold ${
            category ===
            'all'
              ? 'bg-[#176b43] text-white'
              : 'bg-[#edf1eb] text-[#667269]'
          }`}
        >
          {language ===
          'hindi'
            ? 'सभी'
            : 'All'}
        </button>

        {availableCategories.map(
          (item) => (
            <button
              key={item}
              type="button"
              onClick={() =>
                setCategory(
                  item,
                )
              }
              className={`shrink-0 rounded-full px-3 py-2 text-[9px] font-extrabold ${
                category ===
                item
                  ? 'bg-[#176b43] text-white'
                  : 'bg-[#edf1eb] text-[#667269]'
              }`}
            >
              {
                categoryLabels[
                  item
                ]
              }
            </button>
          ),
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="rounded-full bg-[#edf5e9] px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#176b43]">
          {
            categoryLabels[
              activeCard.category
            ]
          }
        </span>

        <span className="text-[10px] font-extrabold text-[#78847b]">
          {safeIndex + 1} /{' '}
          {deck.length}
        </span>
      </div>

      {language ===
        'hindi' &&
        translating && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[9px] font-bold text-[#208653]">
          <LoaderCircle className="size-3.5 animate-spin" />
          हिंदी तैयार हो रही है…
        </div>
      )}

      {translationError && (
        <div className="mt-3 rounded-xl border border-[#ead5d0] bg-[#fff8f6] px-4 py-3 text-[9px] font-semibold text-[#92564b]">
          {translationError}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setFlipped(
            (current) =>
              !current,
          )
        }
        className="mt-4 flex min-h-[340px] w-full flex-col items-center justify-center rounded-[30px] border border-[#cfe0d2] bg-[#fffef9] p-7 text-center shadow-[0_20px_55px_rgba(22,71,43,0.09)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_65px_rgba(22,71,43,0.13)] sm:p-10"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e8f1e5] text-[#176b43]">
          {flipped ? (
            <RotateCw className="size-5" />
          ) : (
            <Lightbulb className="size-5" />
          )}
        </div>

        <p className="mt-6 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
          {flipped
            ? language ===
              'hindi'
              ? 'उत्तर'
              : 'Answer'
            : language ===
                'hindi'
              ? 'प्रश्न'
              : 'Question'}
        </p>

        <p className="mt-4 max-w-[700px] whitespace-pre-line text-xl font-extrabold leading-8 tracking-[-0.025em] text-[#263229] sm:text-2xl">
          {flipped
            ? backText
            : frontText}
        </p>

        <p className="mt-8 text-[9px] font-bold text-[#89948c]">
          {language ===
          'hindi'
            ? flipped
              ? 'प्रश्न देखने के लिए कार्ड पर क्लिक करें'
              : 'उत्तर देखने के लिए कार्ड पर क्लिक करें'
            : flipped
              ? 'Click card to return to question'
              : 'Click card to reveal answer'}
        </p>
      </button>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={
            previous
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#d7e1d4] bg-white px-4 py-2.5 text-[9px] font-extrabold text-[#657168]"
        >
          <ChevronLeft className="size-3.5" />

          {language ===
          'hindi'
            ? 'पिछला'
            : 'Previous'}
        </button>

        <button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f5132] px-4 py-2.5 text-[9px] font-extrabold text-white"
        >
          {language ===
          'hindi'
            ? 'अगला'
            : 'Next'}

          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export default LessonFlashcards