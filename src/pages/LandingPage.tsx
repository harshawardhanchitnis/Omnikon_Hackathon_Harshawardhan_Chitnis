import {
  ArrowRight,
  BookOpenText,
  Check,
  HeartHandshake,
  Lightbulb,
  School,
  Sparkles,
  WifiOff,
} from 'lucide-react'

import { Link } from 'react-router-dom'

import Navbar from '@/components/layout/Navbar'

const classroomPromises = [
  {
    icon: WifiOff,
    title: 'Works around limited resources',
    description:
      'ChalkBox suggests practical alternatives when a projector, laboratory, internet connection or specialist equipment is unavailable.',
  },
  {
    icon: HeartHandshake,
    title: 'Built around the teacher',
    description:
      'Instead of giving teachers more content to read, ChalkBox tells them what to teach, how to explain it and what students should do.',
  },
  {
    icon: School,
    title: 'Designed for real classrooms',
    description:
      'Activities prioritize chalkboards, textbooks, paper, pencils and everyday objects that schools can realistically access.',
  },
]

const planningModes = [
  {
    icon: BookOpenText,
    eyebrow: 'Textbook Mode',
    title: 'Teach from my Textbook',
    description:
      'Choose the class, subject and chapter. ChalkBox uses curriculum-grounded textbook context to build a complete classroom-ready lesson.',
    href: '/textbook',
    points: [
      'Grounded in textbook content',
      'Structured lesson plan',
      'Practical classroom activities',
    ],
  },
  {
    icon: Sparkles,
    eyebrow: 'Topic Mode',
    title: 'Help me Teach a Topic',
    description:
      'Tell ChalkBox what you want to teach, the class level and available time. ChalkBox creates the lesson structure and teaching approach for you.',
    href: '/topic',
    points: [
      'Age-appropriate explanations',
      'Teacher-ready examples',
      'Adapted to available class time',
    ],
  },
]

const planningSteps = [
  {
    number: '01',
    title: 'Choose',
    description: 'Start from a textbook chapter or enter your own teaching topic.',
  },
  {
    number: '02',
    title: 'Generate',
    description:
      'ChalkBox creates objectives, teaching flow, activities and assessment.',
  },
  {
    number: '03',
    title: 'Teach & Adapt',
    description:
      'Use the plan directly or adapt it around your students and resources.',
  },
]

function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf5]">
      <Navbar />

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-10 size-[340px] rounded-full bg-[#e4eee1]/60 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-0 size-[400px] rounded-full bg-[#e7f0e4]/70 blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-[1560px] items-center gap-8 px-5 py-9 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:py-11 xl:px-12">
          <div className="max-w-[680px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfdccc] bg-[#f0f6ed] px-3.5 py-1.5 text-[12px] font-bold text-[#176b43] shadow-sm">
              <Sparkles className="size-3.5" />
              AI lesson planning built for real classrooms
            </div>

            <h1 className="text-[clamp(3.2rem,4.8vw,5.3rem)] font-bold leading-[1] tracking-[-0.052em] text-[#17211b]">
              Plan better lessons.
              <span className="mt-2 block text-[#176b43]">
                Teach with confidence.
              </span>
            </h1>

            <p className="mt-6 max-w-[650px] text-[16px] font-medium leading-8 text-[#4e5b53] sm:text-[17px]">
              ChalkBox turns textbook chapters and teaching topics into
              structured, classroom-ready lesson plans — with explanations,
              activities, assessments and practical alternatives for limited
              resources.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard?demo=1"
                className="group inline-flex h-11 items-center justify-center rounded-xl bg-[#0f5132] px-5 text-[13px] font-semibold text-white shadow-[0_8px_22px_rgba(15,81,50,0.17)] transition-all hover:-translate-y-0.5 hover:bg-[#0b3d28] hover:shadow-[0_12px_28px_rgba(15,81,50,0.24)]"
              >
                Try Verified Demo
                <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#cbd8c9] bg-[#fffef9] px-5 text-[13px] font-semibold text-[#0f5132] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#f0f6ed]"
              >
                Teacher Sign In
              </Link>
            </div>

            <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-[#667269]">
              <Check className="size-3.5 text-[#208653]" />
              Demo works without registration
            </p>

            <div className="mt-6 border-l-2 border-[#8bb79a] pl-4">
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#344139]">
                Your classroom. Your plan.
                <span className="ml-1 text-[#176b43]">
                  Powered by HarshLabs AI.
                </span>
              </p>
            </div>
          </div>

          {/* Hero illustration */}

          <div className="relative mx-auto flex w-full max-w-[760px] items-center justify-center lg:justify-end">
            <div
              aria-hidden="true"
              className="absolute right-[4%] top-[15%] h-[68%] w-[67%] rounded-[30px] bg-[#174d31]"
            />

            <div
              aria-hidden="true"
              className="absolute right-[7%] top-[18%] h-[63%] w-[61%] rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,#174d31,#0d3f28)]"
            />

            <img
              src="/illustrations/teacher-hero2.png"
              alt="Teacher preparing a ChalkBox lesson beside a classroom blackboard"
              className="relative z-10 max-h-[530px] w-auto max-w-full object-contain"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />

            <div className="absolute right-[1%] top-[32%] z-20 hidden w-[215px] rounded-2xl border border-[#d8e1d5] bg-[#fffef9]/95 p-4 shadow-[0_16px_36px_rgba(20,55,38,0.15)] backdrop-blur sm:block">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#e6f2e4]">
                  <Sparkles className="size-3.5 text-[#176b43]" />
                </div>

                <p className="text-[11px] font-bold text-[#263229]">
                  Lesson Plan Generated
                </p>
              </div>

              <div className="space-y-2">
                {[
                  'Aligned to textbook',
                  'Engaging activities',
                  'Differentiated ideas',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[10px] font-medium text-[#59655d]"
                  >
                    <div className="flex size-4 items-center justify-center rounded-full bg-[#e5f1e3]">
                      <Check className="size-2.5 text-[#176b43]" />
                    </div>

                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="absolute bottom-[7%] right-[2%] size-20 rounded-full border border-[#cedbcc]"
            />

            <div
              aria-hidden="true"
              className="absolute left-[10%] top-[22%] size-3 rotate-45 border border-[#abc1aa]"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          UNDER-RESOURCED CLASSROOMS
      ====================================================== */}

      <section
        id="for-schools"
        className="border-y border-[#dce4da] bg-[#f1f6ee]"
      >
        <div className="mx-auto grid w-full max-w-[1560px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-10 xl:px-12">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#176b43]">
              Built for classrooms with real constraints
            </span>

            <h2 className="mt-3 max-w-[500px] text-2xl font-extrabold leading-tight tracking-[-0.025em] text-[#17211b] sm:text-3xl">
              Better lesson planning should not depend on better
              infrastructure.
            </h2>

            <p className="mt-4 max-w-[540px] text-[14px] font-medium leading-7 text-[#536058]">
              ChalkBox helps teachers prepare meaningful lessons even when
              planning time, teaching materials, internet access and classroom
              technology are limited.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {classroomPromises.map((item) => {
              const Icon = item.icon

              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[#d6e1d3] bg-[#fffef9] p-5 shadow-[0_6px_20px_rgba(22,55,38,0.045)] transition-all duration-200 hover:-translate-y-1 hover:border-[#bcd0bc] hover:shadow-[0_14px_30px_rgba(22,55,38,0.09)]"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#e8f2e5] text-[#176b43]">
                    <Icon className="size-[18px]" />
                  </div>

                  <h3 className="mt-4 text-[13px] font-extrabold text-[#17211b]">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-[11px] font-medium leading-[1.7] text-[#58645c]">
                    {item.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          TWO CHALKBOX MODES
      ====================================================== */}

      <section
        id="features"
        className="mx-auto w-full max-w-[1560px] px-5 py-14 sm:px-8 lg:px-10 xl:px-12"
      >
        <div className="mx-auto max-w-[760px] text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#208653]">
            Two ways to start
          </span>

          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#17211b] sm:text-4xl">
            Plan the way that works for you.
          </h2>

          <p className="mx-auto mt-4 max-w-[650px] text-[14px] font-medium leading-7 text-[#5d6961]">
            Start from the textbook already used in your classroom, or tell
            ChalkBox exactly what you need help teaching.
          </p>
        </div>

        <div
          id="modes"
          className="mx-auto mt-9 grid max-w-[1220px] gap-5 lg:grid-cols-2"
        >
          {planningModes.map((mode, index) => {
            const Icon = mode.icon

            return (
              <article
                key={mode.title}
                className={`group relative overflow-hidden rounded-[26px] border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(19,62,40,0.12)] sm:p-8 ${
                  index === 0
                    ? 'border-[#bcd2be] bg-[#edf5e9]'
                    : 'border-[#d7ded4] bg-[#fffef9]'
                }`}
              >
                <div
                  aria-hidden="true"
                  className="absolute -right-12 -top-12 size-36 rounded-full border border-[#cbdccc]/70"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0f5132] text-white shadow-[0_8px_20px_rgba(15,81,50,0.17)]">
                      <Icon className="size-5" />
                    </div>

                    <span className="rounded-full border border-[#cbd8c9] bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#176b43]">
                      {mode.eyebrow}
                    </span>
                  </div>

                  <h3 className="mt-7 text-2xl font-extrabold tracking-[-0.025em] text-[#17211b]">
                    {mode.title}
                  </h3>

                  <p className="mt-3 max-w-[520px] text-[13px] font-medium leading-7 text-[#58645c]">
                    {mode.description}
                  </p>

                  <div className="mt-6 space-y-3">
                    {mode.points.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-3 text-[12px] font-semibold text-[#435047]"
                      >
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#dcebdd]">
                          <Check className="size-3 text-[#176b43]" />
                        </div>

                        {point}
                      </div>
                    ))}
                  </div>

                  <Link
                    to={mode.href}
                    className={`group/button mt-7 inline-flex h-10 items-center justify-center rounded-xl border px-5 text-[12px] font-bold transition-all ${
                      index === 0
                        ? 'border-transparent bg-[#0f5132] text-white hover:bg-[#0b3d28]'
                        : 'border-[#cbd8c9] bg-white text-[#0f5132] hover:bg-[#edf4ea]'
                    }`}
                  >
                    Explore {mode.eyebrow}
                    <ArrowRight className="ml-1 size-3.5 transition-transform group-hover/button:translate-x-1" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* =====================================================
          SIMPLE WORKFLOW
      ====================================================== */}

      <section
        id="how-it-works"
        className="border-y border-[#dce4da] bg-[#0f5132]"
      >
        <div className="mx-auto w-full max-w-[1560px] px-5 py-12 sm:px-8 lg:px-10 xl:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#a9d1b4]">
                Simple by design
              </span>

              <h2 className="mt-3 max-w-[430px] text-3xl font-extrabold tracking-[-0.035em] text-white">
                From planning question to classroom-ready lesson.
              </h2>

              <p className="mt-4 max-w-[460px] text-[13px] font-medium leading-6 text-[#c2dbc9]">
                ChalkBox handles the planning structure so teachers can spend
                more time preparing to teach — not formatting lesson plans.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {planningSteps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.11]"
                >
                  <span className="text-[11px] font-extrabold tracking-[0.16em] text-[#9cc7a8]">
                    {step.number}
                  </span>

                  <h3 className="mt-7 text-lg font-extrabold text-white">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-[11px] font-medium leading-6 text-[#c7dbcd]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SMALL TRANSITION
      ====================================================== */}

      <section className="mx-auto w-full max-w-[1560px] px-5 pb-6 pt-8 sm:px-8 lg:px-10 xl:px-12">
        <div className="grid gap-3 rounded-[26px] border border-[#d8e3d5] bg-[#fffef9] p-5 shadow-[0_8px_26px_rgba(22,55,38,0.045)] sm:grid-cols-3 sm:p-6">
          {[
            ['Verified Textbook Demo', 'Six audited textbook-based Science lessons open without a live AI call.'],
            ['Live Topic Mode', 'Generate unseen Class 8–10 Science teaching help with an independent Science audit.'],
            ['One Teaching Workspace', 'Move from planning into Start Class, Quick Teach, Flashcards, voice and print.'],
          ].map(([title, description]) => (
            <article key={title} className="rounded-2xl bg-[#f5f8f1] p-4">
              <Check className="size-4 text-[#176b43]" />
              <h3 className="mt-3 text-[12px] font-extrabold text-[#263229]">
                {title}
              </h3>
              <p className="mt-2 text-[10px] font-medium leading-5 text-[#68736c]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1560px] items-center gap-3 px-5 py-7 sm:px-8 lg:px-10 xl:px-12">
        <div className="h-px flex-1 bg-[#dfe5dc]" />

        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6d7970] hover:text-[#176b43]"
        >
          <Lightbulb className="size-3.5 text-[#176b43]" />
          Open the teacher workspace
          <ArrowRight className="size-3.5" />
        </Link>

        <div className="h-px flex-1 bg-[#dfe5dc]" />
      </div>
    </main>
  )
}

export default LandingPage