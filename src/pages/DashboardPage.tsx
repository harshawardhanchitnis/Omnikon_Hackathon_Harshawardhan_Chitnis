import {
  ArrowRight,
  Bell,
  BookOpen,
  BookOpenText,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FlaskConical,
  History,
  Leaf,
  Lightbulb,
  Menu,
  Search,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

const recentLessons = [
  {
    title: 'Nutrition in Plants',
    meta: 'Class 7 · Science',
    time: 'Today',
    icon: Leaf,
  },
  {
    title: 'Acids, Bases and Salts',
    meta: 'Class 7 · Science',
    time: '2 days ago',
    icon: FlaskConical,
  },
  {
    title: 'Heat Transfer',
    meta: 'Class 7 · Science',
    time: '4 days ago',
    icon: Sparkles,
  },
  {
    title: 'Force and Pressure',
    meta: 'Class 8 · Science',
    time: '6 days ago',
    icon: BookOpenText,
  },
]

function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f1] text-[#17211b]">
      <header className="sticky top-0 z-50 border-b border-[#dfe5dc] bg-[#fffef9]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] w-full max-w-[1560px] items-center gap-5 px-5 sm:px-8 lg:px-10 xl:px-12">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl text-[#455148] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <Link
            to="/"
            className="shrink-0 rounded-xl transition-transform hover:scale-[1.01]"
          >
            <img
              src="/branding/logo.png"
              alt="ChalkBox"
              className="w-[145px] sm:w-[160px]"
            />
          </Link>

          <div className="ml-auto hidden w-full max-w-[360px] md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a958d]" />

              <input
                type="search"
                placeholder="Search lessons..."
                className="h-10 w-full rounded-xl border border-[#dde4da] bg-[#f8f9f5] pl-10 pr-4 text-xs font-medium outline-none transition-all placeholder:text-[#9aa49d] focus:border-[#8fba9d] focus:bg-white focus:ring-4 focus:ring-[#e3efe5]"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl text-[#58645c] hover:bg-[#edf4ea] hover:text-[#0f5132]"
              aria-label="Help"
            >
              <CircleHelp className="size-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-xl text-[#58645c] hover:bg-[#edf4ea] hover:text-[#0f5132]"
              aria-label="Notifications"
            >
              <Bell className="size-4" />

              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#2d985b]" />
            </Button>

            <div className="ml-2 hidden items-center gap-3 border-l border-[#dde4da] pl-4 sm:flex">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#0f5132] text-xs font-extrabold text-white">
                DT
              </div>

              <div className="hidden xl:block">
                <p className="text-xs font-bold text-[#263229]">
                  Demo Teacher
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-[#7b867e]">
                  Science educator
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1560px] px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cddccc] bg-[#eef5eb] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#176b43]">
              <Sparkles className="size-3" />
              Teacher Workspace
            </div>

            <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-[#17211b] sm:text-4xl">
              Welcome back, Teacher 👋
            </h1>

            <p className="mt-2 text-sm font-medium text-[#68736c]">
              What would you like to plan today?
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#d7e2d4] bg-[#fffef9] px-4 py-2.5 shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#e8f2e5]">
              <Check className="size-4 text-[#176b43]" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7a857d]">
                Classroom setting
              </p>

              <p className="text-xs font-bold text-[#263229]">
                Low-resource friendly
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_330px]">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <article className="group relative overflow-hidden rounded-[26px] border border-[#bcd2be] bg-[#eaf3e7] p-7 shadow-[0_8px_24px_rgba(22,55,38,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_46px_rgba(22,55,38,0.12)] sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute -right-12 -top-12 size-40 rounded-full border border-[#c4d9c3]"
                />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0f5132] text-white shadow-[0_10px_24px_rgba(15,81,50,0.18)]">
                      <BookOpen className="size-6" />
                    </div>

                    <span className="rounded-full border border-[#bad0bc] bg-[#fffef9]/80 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#176b43]">
                      Textbook Mode
                    </span>
                  </div>

                  <h2 className="mt-8 text-2xl font-extrabold tracking-[-0.025em] text-[#17211b]">
                    Teach from my Textbook
                  </h2>

                  <p className="mt-3 max-w-[480px] text-[13px] font-medium leading-7 text-[#566259]">
                    Select your class, subject and chapter. ChalkBox uses
                    textbook-grounded context to create your lesson plan.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {[
                      'Curriculum grounded',
                      'Classroom activities',
                      'Assessment ready',
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-bold text-[#48604e]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <Link to="/textbook" className="inline-block">
                    <Button
                      type="button"
                      className="group/button mt-8 h-11 rounded-xl bg-[#0f5132] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#0b3d28]"
                    >
                      Start from Textbook

                      <ArrowRight className="ml-1 size-3.5 transition-transform group-hover/button:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </article>

              <article className="group relative overflow-hidden rounded-[26px] border border-[#dddcd3] bg-[#fffef9] p-7 shadow-[0_8px_24px_rgba(22,55,38,0.045)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#cad8c8] hover:shadow-[0_22px_46px_rgba(22,55,38,0.1)] sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute -right-12 -top-12 size-40 rounded-full border border-[#e1e6dc]"
                />

                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#176b43] text-white shadow-[0_10px_24px_rgba(15,81,50,0.15)]">
                      <Sparkles className="size-6" />
                    </div>

                    <span className="rounded-full border border-[#d3ddd0] bg-[#f5f8f1] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#176b43]">
                      Topic Mode
                    </span>
                  </div>

                  <h2 className="mt-8 text-2xl font-extrabold tracking-[-0.025em] text-[#17211b]">
                    Help me Teach a Topic
                  </h2>

                  <p className="mt-3 max-w-[480px] text-[13px] font-medium leading-7 text-[#566259]">
                    Tell ChalkBox the topic, class level and teaching time.
                    We&apos;ll build the lesson structure around your needs.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {[
                      'Custom topic',
                      'Age appropriate',
                      'Time adapted',
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-[#f0f5ed] px-3 py-1.5 text-[10px] font-bold text-[#48604e]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="group/button mt-8 h-11 rounded-xl border-[#bfcfbd] bg-white px-5 text-xs font-bold text-[#0f5132] hover:bg-[#edf4ea]"
                  >
                    Start with a Topic

                    <ArrowRight className="ml-1 size-3.5 transition-transform group-hover/button:translate-x-1" />
                  </Button>
                </div>
              </article>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-[22px] border border-[#dde4da] bg-[#fffef9] p-6 shadow-[0_6px_20px_rgba(22,55,38,0.035)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-[#176b43]" />

                      <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#208653]">
                        Pick up where you left off
                      </p>
                    </div>

                    <h3 className="mt-3 text-lg font-extrabold text-[#17211b]">
                      Photosynthesis Process
                    </h3>

                    <p className="mt-1 text-[11px] font-medium text-[#768178]">
                      Class 7 · Science
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl border-[#cbd8c9] bg-white px-4 text-[11px] font-bold text-[#176b43] hover:bg-[#edf4ea]"
                  >
                    Continue
                  </Button>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold">
                    <span className="text-[#667269]">
                      Lesson progress
                    </span>

                    <span className="text-[#176b43]">60%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#e8eee5]">
                    <div className="h-full w-[60%] rounded-full bg-[#208653]" />
                  </div>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-[22px] border border-[#cbdccb] bg-[#eef5eb] p-6">
                <div
                  aria-hidden="true"
                  className="absolute -bottom-12 -right-10 size-32 rounded-full border border-[#c8dac7]"
                />

                <div className="relative">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#dcebdd]">
                    <Lightbulb className="size-4 text-[#176b43]" />
                  </div>

                  <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#208653]">
                    ChalkBox Tip
                  </p>

                  <h3 className="mt-2 text-base font-extrabold text-[#17211b]">
                    Start with what you already have.
                  </h3>

                  <p className="mt-2 text-[11px] font-medium leading-6 text-[#5d6961]">
                    A textbook, chalkboard and everyday classroom objects can
                    be enough for an engaging lesson.
                  </p>
                </div>
              </article>
            </div>
          </div>

          <aside className="h-fit rounded-[24px] border border-[#dde4da] bg-[#fffef9] p-5 shadow-[0_7px_24px_rgba(22,55,38,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#208653]">
                  Your Library
                </p>

                <h2 className="mt-1 text-lg font-extrabold text-[#17211b]">
                  Recent Lessons
                </h2>
              </div>

              <div className="flex size-9 items-center justify-center rounded-xl bg-[#edf4ea]">
                <Clock3 className="size-4 text-[#176b43]" />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {recentLessons.map((lesson) => {
                const Icon = lesson.icon

                return (
                  <button
                    key={lesson.title}
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-[#d6e1d3] hover:bg-[#f1f6ee]"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#edf4ea] text-[#176b43] transition-colors group-hover:bg-[#dfeedd]">
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-extrabold text-[#263229]">
                        {lesson.title}
                      </p>

                      <p className="mt-1 text-[9px] font-medium text-[#7d887f]">
                        {lesson.meta}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[8px] font-medium text-[#929b95]">
                        {lesson.time}
                      </p>

                      <ChevronRight className="ml-auto mt-1 size-3 text-[#9aa39d] transition-transform group-hover:translate-x-0.5 group-hover:text-[#176b43]" />
                    </div>
                  </button>
                )
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-4 h-10 w-full rounded-xl border-[#d1dcd0] bg-white text-[11px] font-bold text-[#176b43] hover:bg-[#edf4ea]"
            >
              View all lessons
            </Button>

            <div className="mt-5 rounded-2xl bg-[#0f5132] p-4 text-white">
              <div className="flex items-center gap-2">
                <BookOpenText className="size-4 text-[#b9d7c2]" />

                <p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#b9d7c2]">
                  Classroom ready
                </p>
              </div>

              <p className="mt-3 text-sm font-bold leading-5">
                Your lesson history will stay organized here.
              </p>

              <p className="mt-2 text-[10px] font-medium leading-5 text-[#cce0d1]">
                Sign in to save plans, revisit lessons and continue editing
                anytime.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default DashboardPage