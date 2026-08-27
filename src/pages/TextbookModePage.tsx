import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  FileText,
  GraduationCap,
  Leaf,
  Save,
  School,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Link,
  useNavigate,
} from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  getLessonsForClass,
  getTextbookLesson,
  supportedClasses,
} from '@/data/textbookCatalog'

const steps = [
  {
    number: 1,
    label: 'Class',
  },
  {
    number: 2,
    label: 'Subject',
  },
  {
    number: 3,
    label: 'Lesson',
  },
  {
    number: 4,
    label: 'Review',
  },
]

function TextbookModePage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)

  const [selectedClass, setSelectedClass] = useState<number>(8)
  const [selectedLessonKey, setSelectedLessonKey] = useState(
    'class-8-chemical-effects-electric-current',
  )

  const [duration, setDuration] = useState('40 minutes')
  const [resourceLevel, setResourceLevel] = useState('Low-resource')
  const [language, setLanguage] = useState('English')

  const availableLessons = useMemo(
    () => getLessonsForClass(selectedClass),
    [selectedClass],
  )

  const selectedLesson = getTextbookLesson(selectedLessonKey)

  function selectClass(classLevel: number) {
    setSelectedClass(classLevel)

    const firstLesson = getLessonsForClass(classLevel)[0]

    if (firstLesson) {
      setSelectedLessonKey(firstLesson.key)
    }
  }

  function openLessonWorkspace() {
    const durationMinutes =
      Number.parseInt(
        duration,
        10,
      ) || 40

    const resources =
      resourceLevel ===
      'Well-equipped classroom'
        ? 'well'
        : resourceLevel ===
            'Standard classroom'
          ? 'standard'
          : 'low'

    const openingLanguage =
      language === 'Hindi'
        ? 'hindi'
        : 'english'

    const query =
      new URLSearchParams({
        duration:
          String(
            durationMinutes,
          ),
        resources,
        language:
          openingLanguage,
      })

    navigate(
      `/lesson/${selectedLessonKey}?${query.toString()}`,
    )
  }

  function goNext() {
    setCurrentStep((step) => Math.min(step + 1, 4))
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 1))
  }

  return (
    <main className="min-h-screen bg-[#f7f7f1] text-[#17211b]">
      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-[#dde4da] bg-[#fffef9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-[1560px] items-center gap-4 px-5 sm:px-8 lg:px-10 xl:px-12">
          <Link
            to="/dashboard"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#d7e1d4] bg-white text-[#455148] transition-all hover:-translate-x-0.5 hover:bg-[#edf4ea] hover:text-[#0f5132]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <Link to="/" className="shrink-0">
            <img
              src="/branding/logo.png"
              alt="ChalkBox"
              className="w-[145px] sm:w-[158px]"
            />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="hidden h-9 rounded-xl border-[#d2ddd0] bg-white px-4 text-[11px] font-bold text-[#58645c] hover:bg-[#edf4ea] sm:flex"
            >
              <Save className="mr-1 size-3.5" />
              Save Draft
            </Button>

            <Link
              to="/dashboard"
              className="flex h-9 items-center rounded-xl px-3 text-[11px] font-bold text-[#176b43] transition-colors hover:bg-[#edf4ea]"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          GREEN HEADER
      ====================================================== */}

      <section className="relative overflow-hidden bg-[#0f5132] text-white">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-32 size-80 rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="absolute -right-20 -top-24 size-72 rounded-full bg-white/[0.035]"
        />

        <div
          aria-hidden="true"
          className="absolute bottom-[-80px] right-[30%] size-48 rounded-full border border-white/[0.07]"
        />

        <div className="relative mx-auto w-full max-w-[1560px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[780px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.09] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#d6eadb]">
                <BookOpen className="size-3.5" />
                Textbook Mode
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl lg:text-[42px]">
                Build a lesson from your textbook.
              </h1>

              <p className="mt-3 max-w-[720px] text-[13px] font-medium leading-7 text-[#cce0d1] sm:text-[14px]">
                Choose your class and lesson. ChalkBox retrieves the relevant
                textbook context and turns it into a structured,
                classroom-ready teaching plan.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.09] px-5 py-4 shadow-[0_12px_30px_rgba(4,34,20,0.15)] backdrop-blur-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                <Leaf className="size-[18px] text-[#b9d9c1]" />
              </div>

              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#a9cab2]">
                  Planning preference
                </p>

                <p className="mt-1 text-[12px] font-extrabold text-white">
                  Low-resource friendly
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STEPPER
      ====================================================== */}

      <section className="border-b border-[#dfe5dc] bg-[#fffef9]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-6 sm:px-8">
          <div className="flex items-start">
            {steps.map((step, index) => {
              const completed = currentStep > step.number
              const active = currentStep === step.number

              return (
                <div
                  key={step.number}
                  className={`relative flex flex-1 flex-col items-center ${index < steps.length - 1
                      ? "after:absolute after:left-[50%] after:top-4 after:h-px after:w-full after:bg-[#dce4da] after:content-['']"
                      : ''
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (step.number <= currentStep) {
                        setCurrentStep(step.number)
                      }
                    }}
                    className={`relative z-10 flex size-8 items-center justify-center rounded-full border text-[11px] font-extrabold transition-all ${completed
                        ? 'border-[#176b43] bg-[#176b43] text-white'
                        : active
                          ? 'border-[#176b43] bg-[#edf5e9] text-[#176b43] ring-4 ring-[#e4efe2]'
                          : 'border-[#d6ded3] bg-[#fffef9] text-[#8a958d]'
                      }`}
                  >
                    {completed ? (
                      <Check className="size-4" />
                    ) : (
                      step.number
                    )}
                  </button>

                  <span
                    className={`relative z-10 mt-2 bg-[#fffef9] px-2 text-[10px] font-bold ${active || completed
                        ? 'text-[#176b43]'
                        : 'text-[#8a958d]'
                      }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="mx-auto grid w-full max-w-[1360px] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_330px]">
        <section className="rounded-[26px] border border-[#dbe3d8] bg-[#fffef9] p-6 shadow-[0_8px_28px_rgba(22,55,38,0.045)] sm:p-8">
          {/* =================================================
              STEP 1
          ================================================== */}

          {currentStep === 1 && (
            <div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e6f1e3] text-[#176b43]">
                <GraduationCap className="size-5" />
              </div>

              <span className="mt-6 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                Step 1 of 4
              </span>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em]">
                Which class are you teaching?
              </h2>

              <p className="mt-2 text-[13px] font-medium leading-6 text-[#68736c]">
                Select the student level. ChalkBox will adapt explanations,
                examples, activities and assessment accordingly.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {supportedClasses.map((classLevel) => {
                  const selected = selectedClass === classLevel

                  return (
                    <button
                      key={classLevel}
                      type="button"
                      onClick={() => selectClass(classLevel)}
                      className={`min-h-[145px] rounded-2xl border p-5 text-left transition-all duration-200 ${selected
                          ? 'border-[#71a882] bg-[#edf5e9] shadow-[0_8px_22px_rgba(22,82,48,0.08)]'
                          : 'border-[#dce3d9] bg-white hover:-translate-y-0.5 hover:border-[#bfd0bd] hover:bg-[#f7faf5]'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <School
                          className={`size-5 ${selected
                              ? 'text-[#176b43]'
                              : 'text-[#7f8a82]'
                            }`}
                        />

                        {selected && (
                          <div className="flex size-5 items-center justify-center rounded-full bg-[#176b43]">
                            <Check className="size-3 text-white" />
                          </div>
                        )}
                      </div>

                      <p className="mt-6 text-lg font-extrabold text-[#17211b]">
                        Class {classLevel}
                      </p>

                      <p className="mt-2 text-[10px] font-semibold text-[#7a857d]">
                        2 demo lessons available
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* =================================================
              STEP 2
          ================================================== */}

          {currentStep === 2 && (
            <div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e6f1e3] text-[#176b43]">
                <BookOpen className="size-5" />
              </div>

              <span className="mt-6 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                Step 2 of 4
              </span>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em]">
                Choose your subject.
              </h2>

              <p className="mt-2 text-[13px] font-medium leading-6 text-[#68736c]">
                Science is the supported subject for the current ChalkBox
                hackathon demonstration.
              </p>

              <div className="mt-7">
                <div className="w-full max-w-[440px] rounded-2xl border border-[#71a882] bg-[#edf5e9] p-6 text-left shadow-[0_8px_22px_rgba(22,82,48,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[#176b43] text-white">
                      <Sparkles className="size-5" />
                    </div>

                    <div className="flex size-5 items-center justify-center rounded-full bg-[#176b43]">
                      <Check className="size-3 text-white" />
                    </div>
                  </div>

                  <h3 className="mt-5 text-xl font-extrabold">
                    Science
                  </h3>

                  <p className="mt-2 text-[11px] font-medium leading-5 text-[#647067]">
                    Grounded explanations, diagrams, examples, activities,
                    teaching strategies and checks for understanding.
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-[#dce4da] bg-[#f8faf6] px-4 py-3">
                  <p className="text-[10px] font-medium leading-5 text-[#6d786f]">
                    ChalkBox&apos;s architecture remains extensible to
                    additional subjects after the Science-first demo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              STEP 3
          ================================================== */}

          {currentStep === 3 && (
            <div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e6f1e3] text-[#176b43]">
                <FileText className="size-5" />
              </div>

              <span className="mt-6 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                Step 3 of 4
              </span>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em]">
                Which lesson are you teaching?
              </h2>

              <p className="mt-2 text-[13px] font-medium leading-6 text-[#68736c]">
                These lessons are backed by the textbook material prepared for
                the ChalkBox demonstration.
              </p>

              <div className="mt-7 grid gap-4">
                {availableLessons.map((lesson) => {
                  const selected =
                    selectedLessonKey === lesson.key

                  return (
                    <button
                      key={lesson.key}
                      type="button"
                      onClick={() =>
                        setSelectedLessonKey(lesson.key)
                      }
                      className={`group flex min-h-[92px] items-center gap-4 rounded-2xl border p-5 text-left transition-all ${selected
                          ? 'border-[#79a987] bg-[#edf5e9] shadow-[0_8px_22px_rgba(22,82,48,0.06)]'
                          : 'border-[#dce3da] bg-white hover:-translate-y-0.5 hover:border-[#bfd0bd] hover:bg-[#f8faf6]'
                        }`}
                    >
                      <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${selected
                            ? 'bg-[#176b43] text-white'
                            : 'bg-[#edf3ea] text-[#176b43]'
                          }`}
                      >
                        <BookOpen className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-extrabold text-[#263229]">
                          {lesson.title}
                        </p>

                        <p className="mt-1.5 text-[10px] font-medium text-[#7b867e]">
                          Class {lesson.classLevel} · {lesson.subject}
                        </p>
                      </div>

                      {selected && (
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#176b43]">
                          <Check className="size-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 rounded-xl border border-[#cddfcc] bg-[#f1f7ee] px-4 py-3">
                <p className="text-[10px] font-semibold leading-5 text-[#53645a]">
                  The textbook corpus for these demo lessons will be
                  pre-processed before judging, so lesson generation can
                  retrieve relevant content immediately.
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              STEP 4
          ================================================== */}

          {currentStep === 4 && selectedLesson && (
            <div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e6f1e3] text-[#176b43]">
                <Check className="size-5" />
              </div>

              <span className="mt-6 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#208653]">
                Step 4 of 4
              </span>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.025em]">
                Review your lesson setup.
              </h2>

              <p className="mt-2 text-[13px] font-medium leading-6 text-[#68736c]">
                Add your classroom preferences before ChalkBox retrieves the
                textbook context and builds the lesson.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#dce4da] bg-[#f8faf6] p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7b867e]">
                    Class
                  </p>

                  <p className="mt-2 text-sm font-extrabold">
                    Class {selectedClass}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#dce4da] bg-[#f8faf6] p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7b867e]">
                    Subject
                  </p>

                  <p className="mt-2 text-sm font-extrabold">
                    Science
                  </p>
                </div>

                <div className="rounded-2xl border border-[#dce4da] bg-[#f8faf6] p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#7b867e]">
                    Lesson
                  </p>

                  <p className="mt-2 text-sm font-extrabold">
                    {selectedLesson.title}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="duration"
                    className="mb-2 block text-[11px] font-extrabold text-[#344139]"
                  >
                    Class duration
                  </label>

                  <select
                    id="duration"
                    value={duration}
                    onChange={(event) =>
                      setDuration(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-[#d5dfd2] bg-white px-3 text-[12px] font-semibold outline-none focus:border-[#79aa88] focus:ring-4 focus:ring-[#e4efe2]"
                  >
                    <option>30 minutes</option>
                    <option>40 minutes</option>
                    <option>45 minutes</option>
                    <option>60 minutes</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="resources"
                    className="mb-2 block text-[11px] font-extrabold text-[#344139]"
                  >
                    Resource availability
                  </label>

                  <select
                    id="resources"
                    value={resourceLevel}
                    onChange={(event) =>
                      setResourceLevel(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-[#d5dfd2] bg-white px-3 text-[12px] font-semibold outline-none focus:border-[#79aa88] focus:ring-4 focus:ring-[#e4efe2]"
                  >
                    <option>Low-resource</option>
                    <option>Standard classroom</option>
                    <option>Well-equipped classroom</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="language"
                    className="mb-2 block text-[11px] font-extrabold text-[#344139]"
                  >
                    Teaching language
                  </label>

                  <select
                    id="language"
                    value={language}
                    onChange={(event) =>
                      setLanguage(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-[#d5dfd2] bg-white px-3 text-[12px] font-semibold outline-none focus:border-[#79aa88] focus:ring-4 focus:ring-[#e4efe2]"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>English + Hindi support</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#c9ddc8] bg-[#edf5e9] p-5">
                <div className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#176b43] text-white">
                    <Sparkles className="size-4" />
                  </div>

                  <div>
                    <p className="text-[12px] font-extrabold text-[#263229]">
                      Ready for ChalkBox
                    </p>

                    <p className="mt-1 text-[11px] font-medium leading-6 text-[#59655d]">
                      ChalkBox will retrieve content for{' '}
                      <strong>{selectedLesson.title}</strong> and build a{' '}
                      <strong>{duration}</strong> lesson optimized for a{' '}
                      <strong>
                        {resourceLevel.toLowerCase()}
                      </strong>{' '}
                      classroom.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              NAVIGATION
          ================================================== */}

          <div className="mt-9 flex items-center justify-between border-t border-[#e1e6de] pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1}
              onClick={goBack}
              className="h-10 rounded-xl border-[#d2ddd0] bg-white px-4 text-[11px] font-bold text-[#566259] hover:bg-[#edf4ea]"
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Back
            </Button>

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={goNext}
                className="group h-10 rounded-xl bg-[#0f5132] px-5 text-[11px] font-bold text-white hover:bg-[#0b3d28]"
              >
                Continue

                <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={
                  openLessonWorkspace
                }
                className="group h-11 rounded-xl bg-[#0f5132] px-6 text-[12px] font-extrabold text-white shadow-[0_9px_24px_rgba(15,81,50,0.18)] hover:-translate-y-0.5 hover:bg-[#0b3d28]"
              >
                <Sparkles className="mr-1 size-4" />

                Generate Lesson Plan

                <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </section>

        {/* =====================================================
            RIGHT SIDEBAR
        ====================================================== */}

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-[#ceddcc] bg-[#edf5e9] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#176b43]" />

              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#176b43]">
                What ChalkBox will build
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {[
                'Learning objectives',
                'Timed teaching flow',
                'Topic explanations',
                'Examples and visuals',
                'Teacher & student actions',
                'Low-resource activities',
                'Checks for understanding',
                'Assessment prompts',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-[11px] font-semibold text-[#47534a]"
                >
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#dcebdd]">
                    <Check className="size-3 text-[#176b43]" />
                  </div>

                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dce3d9] bg-[#fffef9] p-5 shadow-[0_6px_20px_rgba(22,55,38,0.035)]">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#edf4ea]">
              <Clock3 className="size-4 text-[#176b43]" />
            </div>

            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#208653]">
              Duration-aware
            </p>

            <h3 className="mt-2 text-sm font-extrabold">
              No more guessing lesson timings.
            </h3>

            <p className="mt-2 text-[10px] font-medium leading-5 text-[#6a756d]">
              ChalkBox divides the available class period across explanation,
              activities, discussion and assessment.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#0f5132] p-5 text-white">
            <div className="flex items-center gap-2">
              <Leaf className="size-4 text-[#b8d8c0]" />

              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#b8d8c0]">
                Resource aware
              </p>
            </div>

            <p className="mt-3 text-sm font-bold leading-6">
              Every lesson should still work when technology does not.
            </p>

            <p className="mt-2 text-[10px] font-medium leading-5 text-[#cce0d1]">
              ChalkBox prioritizes textbooks, chalkboards, paper and everyday
              classroom objects whenever resources are limited.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default TextbookModePage