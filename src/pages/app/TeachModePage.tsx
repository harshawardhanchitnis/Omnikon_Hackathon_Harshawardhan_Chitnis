import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Maximize2,
  NotebookPen,
  Pause,
  Play,
  Presentation,
  Square,
  Volume2,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/brand/Logo";
import { QuickCheckModal } from "@/components/teach/QuickCheckModal";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

function timerLabel(total: number) {
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function TeachModePage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const { plans, sessions, quickChecks, startSession, updateSession, addQuickCheck } = useDomain();
  const plan = plans.find((item) => item.id === planId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const session = sessions.find((item) => item.id === sessionId);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState("");
  const [quickCheckOpen, setQuickCheckOpen] = useState(false);
  const speech = useSpeechSynthesis();
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (!planId) return;
    const init = async () => {
      const created = await startSession(planId);
      setSessionId(created.id);
      setElapsed(created.elapsedSeconds);
      elapsedRef.current = created.elapsedSeconds;
      setPaused(created.paused);
    };
    void init();
  }, [planId, startSession]);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        elapsedRef.current = value + 1;
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);
  useEffect(
    () => () => {
      if (sessionId)
        void updateSession(sessionId, { elapsedSeconds: elapsedRef.current, paused: true });
    },
    [sessionId, updateSession]
  );
  if (!plan)
    return (
      <main className="grid min-h-screen place-items-center">
        <Link to="/library">
          <Button>Return to library</Button>
        </Link>
      </main>
    );
  const currentIndex = session?.currentActivityIndex ?? 0;
  const activity = plan.activities[currentIndex] ?? plan.activities[0];
  if (!activity)
    return (
      <main className="grid min-h-screen place-items-center">
        <p>This plan has no teaching activities.</p>
      </main>
    );
  const setIndex = async (index: number) => {
    if (!sessionId) return;
    await updateSession(sessionId, { currentActivityIndex: index, elapsedSeconds: elapsed });
  };
  const togglePause = async () => {
    const next = !paused;
    setPaused(next);
    if (sessionId) await updateSession(sessionId, { paused: next, elapsedSeconds: elapsed });
  };
  const addNote = async () => {
    if (!sessionId || !note.trim()) return;
    await updateSession(sessionId, {
      quickNotes: [...(session?.quickNotes ?? []), note.trim()],
      elapsedSeconds: elapsed
    });
    setNote("");
  };
  const finish = async () => {
    if (!sessionId) return;
    await updateSession(sessionId, {
      completedAt: new Date().toISOString(),
      elapsedSeconds: elapsed,
      paused: true,
      currentActivityIndex: plan.activities.length - 1
    });
    navigate(`/plans/${plan.id}/reflect?session=${sessionId}`);
  };
  const readActivity = () => {
    const text = [
      activity.title,
      "Teacher actions.",
      ...activity.teacherSteps,
      "Learner actions.",
      ...activity.studentSteps
    ].join(". ");
    speech.speak(text, plan.language);
  };
  const lessonQuickChecks = quickChecks.filter((item) => item.sessionId === sessionId);
  return (
    <div className="text-ink-950 min-h-screen bg-[#eef2ec]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link
            to={`/plans/${plan.id}/preview`}
            className="grid size-10 place-items-center rounded-xl hover:bg-slate-100"
            aria-label="Exit Teach Mode"
          >
            <X />
          </Link>
          <Logo compact linkTo="" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{plan.title}</p>
            <p className="text-moss-700 text-[10px] font-bold tracking-wider uppercase">
              Teach Mode · Step {currentIndex + 1} of {plan.activities.length}
            </p>
          </div>
          <button
            onClick={() => void document.documentElement.requestFullscreen?.()}
            className="hidden size-10 place-items-center rounded-xl hover:bg-slate-100 sm:grid"
            aria-label="Enter full screen"
          >
            <Maximize2 className="size-5" />
          </button>
          <Link
            to={`/plans/${plan.id}/present`}
            className="hidden h-10 items-center gap-2 rounded-xl border border-black/8 px-3 text-xs font-black hover:bg-slate-100 md:flex"
          >
            <Presentation className="size-4" /> Project
          </Link>
          {speech.supported && (
            <button
              onClick={speech.speaking ? speech.stop : readActivity}
              className="hidden h-10 items-center gap-2 rounded-xl border border-black/8 px-3 text-xs font-black hover:bg-slate-100 sm:flex"
            >
              {speech.speaking ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <Volume2 className="size-4" />
              )}
              {speech.speaking ? "Stop" : "Listen"}
            </button>
          )}
          <div className="bg-ink-950 flex h-11 items-center gap-2 rounded-xl px-3 text-white">
            <Clock3 className="text-sun-500 size-4" />
            <span className="font-mono text-sm font-black tabular-nums">{timerLabel(elapsed)}</span>
            <button
              onClick={togglePause}
              className="grid size-7 place-items-center rounded-lg bg-white/10"
              aria-label={paused ? "Resume timer" : "Pause timer"}
            >
              {paused ? (
                <Play className="size-3.5 fill-current" />
              ) : (
                <Pause className="size-3.5 fill-current" />
              )}
            </button>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div
            className="bg-moss-700 h-full transition-all"
            style={{ width: `${((currentIndex + 1) / plan.activities.length) * 100}%` }}
          />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_19rem]"
      >
        <section className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-moss-900 px-5 py-6 text-white sm:px-8">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black tracking-wider uppercase">
                  {activity.type}
                </span>
                <span className="text-sun-500 text-sm font-black">
                  {activity.durationMinutes} minutes
                </span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                {activity.title}
              </h1>
            </div>
            <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-2">
              <div>
                <h2 className="text-moss-700 text-xs font-black tracking-[0.16em] uppercase">
                  Do this
                </h2>
                <ol className="mt-4 space-y-4">
                  {activity.teacherSteps.map((step, index) => (
                    <li key={index} className="flex gap-3 text-base leading-7">
                      <span className="bg-moss-100 text-moss-700 grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h2 className="text-moss-700 text-xs font-black tracking-[0.16em] uppercase">
                  Learners do this
                </h2>
                <ul className="mt-4 space-y-4">
                  {activity.studentSteps.map((step, index) => (
                    <li key={index} className="flex gap-3 text-base leading-7">
                      <Check className="text-moss-700 mt-1 size-5 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-amber-100 p-4 text-sm leading-6 text-amber-950">
              <span className="font-black">Inclusive support: </span>
              {activity.differentiation ?? "Offer multiple ways to respond."}
            </div>
            <div className="rounded-2xl bg-blue-100 p-4 text-sm leading-6 text-blue-950">
              <span className="font-black">If resources fail: </span>
              {activity.offlineAlternative ?? "Continue with board work and discussion."}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => setIndex(currentIndex - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            {currentIndex === plan.activities.length - 1 ? (
              <Button variant="sun" size="lg" onClick={finish}>
                Finish & reflect <Check className="size-4" />
              </Button>
            ) : (
              <Button size="lg" onClick={() => setIndex(currentIndex + 1)}>
                Next step <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </section>
        <aside className="space-y-4">
          <Card className="border-moss-700/15 overflow-hidden">
            <div className="bg-moss-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-sun-500 size-4" />
                <h2 className="text-sm font-black">Anonymous Quick Check</h2>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-white/65">
                Count response cards or understanding bands. No learner profiles.
              </p>
            </div>
            <div className="p-4">
              <Button variant="sun" className="w-full" onClick={() => setQuickCheckOpen(true)}>
                Capture class pulse
              </Button>
              {lessonQuickChecks.length > 0 && (
                <p className="text-moss-700 mt-3 text-center text-[11px] font-bold">
                  {lessonQuickChecks.length} check{lessonQuickChecks.length === 1 ? "" : "s"} saved
                  this session
                </p>
              )}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <NotebookPen className="text-moss-700 size-4" />
              <h2 className="text-sm font-black">Quick teaching note</h2>
            </div>
            <p className="text-muted mt-1 text-[11px] leading-5">
              Capture a pattern, never a student name.
            </p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What are you noticing?"
              className="bg-paper focus:border-moss-500 mt-3 min-h-24 w-full resize-none rounded-xl border border-black/10 p-3 text-sm outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full"
              onClick={addNote}
              disabled={!note.trim()}
            >
              Save note
            </Button>
            {session?.quickNotes.length ? (
              <ul className="mt-3 space-y-2 border-t border-black/5 pt-3">
                {session.quickNotes.map((item, index) => (
                  <li key={index} className="bg-moss-50 rounded-lg p-2 text-xs leading-5">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-black">Lesson map</h2>
            <ol className="mt-3 space-y-1">
              {plan.activities.map((item, index) => (
                <li key={item.id}>
                  <button
                    onClick={() => setIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs font-bold",
                      index === currentIndex
                        ? "bg-moss-100 text-moss-900"
                        : "text-ink-500 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-md text-[10px]",
                        index < currentIndex ? "bg-moss-700 text-white" : "bg-slate-100"
                      )}
                    >
                      {index < currentIndex ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
          <Link
            to={`/plans/${plan.id}/preview`}
            className="text-ink-500 hover:text-moss-700 inline-flex items-center gap-2 text-xs font-bold"
          >
            <ArrowLeft className="size-3.5" />
            Exit without completing
          </Link>
        </aside>
      </main>
      {quickCheckOpen && (
        <QuickCheckModal
          classSize={plan.classSize}
          defaultPrompt={
            plan.assessments[0]?.prompt ?? `Show how confident you are after “${activity.title}”.`
          }
          onClose={() => setQuickCheckOpen(false)}
          onSave={async (input) => {
            if (!sessionId) return;
            await addQuickCheck({
              id: uid("quickcheck"),
              planId: plan.id,
              sessionId,
              ownerId: profile?.id ?? plan.ownerId,
              activityId: activity.id,
              ...input,
              createdAt: new Date().toISOString()
            });
          }}
        />
      )}
    </div>
  );
}
