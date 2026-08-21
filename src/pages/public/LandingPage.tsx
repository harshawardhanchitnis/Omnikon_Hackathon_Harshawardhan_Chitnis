import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CloudOff,
  FileDown,
  Languages,
  Play,
  ShieldCheck,
  Sparkles,
  TimerReset,
  WandSparkles
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const features = [
  {
    icon: TimerReset,
    title: "Minutes, not evenings",
    text: "Move from a few classroom facts to a sequenced, editable plan with aligned checks."
  },
  {
    icon: CloudOff,
    title: "Designed for weak internet",
    text: "Open saved plans, teach from them and capture reflections even when connectivity disappears."
  },
  {
    icon: Languages,
    title: "Local classroom context",
    text: "Plan for mixed levels, bilingual explanation and materials already present in the school."
  },
  {
    icon: ShieldCheck,
    title: "Evidence you can inspect",
    text: "Every generated plan carries its source alignment, AI disclosure and an objective-based quality check."
  }
];

export function LandingPage() {
  return (
    <div className="bg-paper text-ink-950 min-h-screen">
      <PublicHeader />
      <main id="main-content">
        <section className="paper-grid relative overflow-hidden border-b border-black/5">
          <div className="bg-moss-100/70 absolute -top-36 -right-32 size-[34rem] rounded-full blur-3xl" />
          <div className="bg-sun-100/70 absolute -bottom-52 -left-32 size-[28rem] rounded-full blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:py-28">
            <motion.div initial={{ y: 16 }} animate={{ y: 0 }} transition={{ duration: 0.45 }}>
              <Badge tone="green" className="gap-2 bg-white/80">
                <Sparkles className="size-3.5" />
                Built for teachers who make more with less
              </Badge>
              <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] font-black tracking-[-0.06em] sm:text-6xl lg:text-[4.6rem]">
                A strong lesson plan,{" "}
                <span className="text-moss-700 relative whitespace-nowrap">
                  before the bell.
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 300 15"
                    className="text-sun-500 absolute -bottom-2 left-0 w-full"
                  >
                    <path
                      d="M4 10C75 2 212 3 296 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-ink-700 mt-7 max-w-xl text-lg leading-8">
                ChalkBox turns grade, topic, time and classroom constraints into a practical lesson
                teachers can edit, teach, assess and improve—without expensive tools.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/demo">
                  <Button size="lg" variant="sun" className="w-full sm:w-auto">
                    <Play className="size-4 fill-current" />
                    Explore the prepared demo
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Create free workspace <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
              <div className="text-ink-500 mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-moss-700 size-4" />
                  No card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-moss-700 size-4" />
                  Offline-ready
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="text-moss-700 size-4" />
                  Teacher stays in control
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.96, rotate: 1 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative"
            >
              <div className="bg-sun-500 absolute -top-5 -left-5 hidden rotate-[-6deg] rounded-xl px-4 py-2 text-xs font-black shadow-lg sm:block">
                9 min prep time
              </div>
              <Card className="shadow-lift relative overflow-hidden border-black/10 p-3 sm:p-4">
                <div className="bg-moss-900 rounded-xl p-4 text-white sm:p-6">
                  <div className="flex items-center justify-between">
                    <Logo inverse />
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black tracking-wider uppercase">
                      Ready to teach
                    </span>
                  </div>
                  <div className="mt-8">
                    <p className="text-xs font-black tracking-widest text-emerald-200 uppercase">
                      Grade 6 · Science · 45 min
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                      The Water Cycle Around Us
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/80">
                      Bilingual · 38 learners · no projector
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 p-2 pt-4 sm:grid-cols-2">
                  {[
                    { n: "01", t: "Where did the puddle go?", m: "5 min" },
                    { n: "02", t: "Make condensation visible", m: "12 min" },
                    { n: "03", t: "Build the cycle together", m: "10 min" },
                    { n: "04", t: "One-minute exit check", m: "8 min" }
                  ].map((item) => (
                    <div key={item.n} className="bg-paper rounded-xl border border-black/6 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-moss-700 font-black">{item.n}</span>
                        <span className="text-ink-500 text-[10px] font-bold">{item.m}</span>
                      </div>
                      <p className="mt-3 text-sm font-black">{item.t}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <div className="shadow-lift absolute -right-4 -bottom-5 rounded-2xl border border-black/8 bg-white p-3 sm:right-6">
                <p className="text-ink-500 text-[10px] font-black tracking-wider uppercase">
                  Quality check
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-moss-700 text-2xl font-black">100</span>
                  <span className="text-ink-700 text-xs font-bold">5/5 checks passed</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-moss-700 text-xs font-black tracking-[0.18em] uppercase">
              One connected workflow
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Plan. Teach. Learn what worked.
            </h2>
            <p className="text-muted mt-4 text-base leading-7">
              Most tools stop after generating text. ChalkBox follows the lesson into the classroom
              and feeds teacher reflection into the next plan.
            </p>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: WandSparkles,
                step: "01",
                title: "Describe the classroom",
                text: "Choose grade, subject, duration, language, materials and real constraints."
              },
              {
                icon: BookOpenCheck,
                step: "02",
                title: "Review a practical plan",
                text: "Edit objectives, timed activities, inclusive support and assessment evidence."
              },
              {
                icon: FileDown,
                step: "03",
                title: "Teach, reflect, reuse",
                text: "Use distraction-free Teach Mode, save an outcome and export or adapt next time."
              }
            ].map(({ icon: Icon, step, title, text }) => (
              <Card key={step} className="p-6">
                <div className="flex items-center justify-between">
                  <span className="bg-moss-100 text-moss-700 grid size-11 place-items-center rounded-2xl">
                    <Icon className="size-5" />
                  </span>
                  <span aria-hidden="true" className="text-ink-500 text-3xl font-black">
                    {step}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-black">{title}</h3>
                <p className="text-muted mt-2 text-sm leading-6">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-black/5 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-8">
            <div>
              <p className="text-moss-700 text-xs font-black tracking-[0.18em] uppercase">
                Built around the constraint
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Useful when the projector, printer—or internet—isn’t.
              </h2>
              <p className="text-muted mt-4 text-base leading-7">
                Activities prioritise common objects, board work, peer discussion and observable
                evidence. Saved plans remain available offline.
              </p>
              <Link
                to="/about"
                className="text-moss-700 mt-6 inline-flex items-center gap-2 text-sm font-black hover:underline"
              >
                Why ChalkBox exists <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-paper rounded-2xl p-5">
                  <Icon className="text-moss-700 size-5" />
                  <h3 className="mt-4 font-black">{title}</h3>
                  <p className="text-muted mt-2 text-sm leading-6">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="noise bg-moss-900 relative overflow-hidden rounded-[2rem] px-6 py-12 text-center text-white sm:px-12">
            <div className="relative">
              <p className="text-xs font-black tracking-[0.18em] text-emerald-200 uppercase">
                Omnikon National Hackathon 2026
              </p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Give every teacher a better starting point.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/80">
                Open the fully seeded walkthrough now. No account, API key or setup is required.
              </p>
              <Link to="/demo" className="mt-7 inline-block">
                <Button variant="sun" size="lg">
                  Launch ChalkBox demo <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-black/5 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Logo />
          <p className="text-muted text-xs leading-5">
            Your classroom. Your plan. Powered by HarshLabs AI.
            <br />
            Built by Harshawardhan Chitnis · Team HarshLabs
          </p>
          <div className="text-ink-500 flex gap-5 text-xs font-bold">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <a
              href="https://github.com/harshawardhanchitnis/Omnikon_Hackathon_Harshawardhan_Chitnis"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
