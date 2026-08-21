import type { CheckInstructionalBlock, InstructionalBlock } from "@chalkbox/contracts";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Maximize2,
  NotebookPen,
  Pause,
  Play,
  Presentation,
  SkipForward,
  Square,
  Volume2,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { ClassroomBlockView } from "@/components/teach/ClassroomBlockView";
import { QuickCheckModal } from "@/components/teach/QuickCheckModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { publishPresentationState } from "@/hooks/use-classroom-broadcast";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { analyseQuickCheck, toLearnerClassroomBlock } from "@/lib/classroom-engine";
import { cn, uid } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

function timerLabel(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

const emptyBlocks: InstructionalBlock[] = [];
const emptyReveals: string[] = [];

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
  const startedPlanRef = useRef<string | null>(null);
  const startSessionRef = useRef(startSession);
  const updateSessionRef = useRef(updateSession);

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);
  useEffect(() => {
    updateSessionRef.current = updateSession;
  }, [updateSession]);
  useEffect(() => {
    if (!planId || startedPlanRef.current === planId) return;
    startedPlanRef.current = planId;
    void startSessionRef.current(planId).then((created) => {
      setSessionId(created.id);
      setElapsed(created.elapsedSeconds);
      elapsedRef.current = created.elapsedSeconds;
      setPaused(created.paused);
    });
  }, [planId]);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () =>
        setElapsed((value) => {
          elapsedRef.current = value + 1;
          return value + 1;
        }),
      1000
    );
    return () => window.clearInterval(timer);
  }, [paused]);
  useEffect(
    () => () => {
      if (sessionId)
        void updateSessionRef.current(sessionId, {
          elapsedSeconds: elapsedRef.current,
          paused: true
        });
    },
    [sessionId]
  );

  const blocks = plan?.classroomBlocks ?? emptyBlocks;
  const currentIndex = Math.min(session?.currentBlockIndex ?? 0, Math.max(0, blocks.length - 1));
  const block = blocks[currentIndex];
  const revealedStageIds = block ? (session?.revealState[block.id] ?? emptyReveals) : emptyReveals;
  const allocatedBefore = blocks
    .slice(0, currentIndex)
    .reduce((total, item) => total + item.durationMinutes * 60, 0);
  const blockRemaining = block ? allocatedBefore + block.durationMinutes * 60 - elapsed : 0;
  const lessonRemaining = plan ? plan.durationMinutes * 60 - elapsed : 0;

  useEffect(() => {
    if (!plan || !block) return;
    publishPresentationState({
      planId: plan.id,
      blockIndex: currentIndex,
      block: toLearnerClassroomBlock(block, revealedStageIds),
      updatedAt: new Date().toISOString()
    });
  }, [block, currentIndex, plan, revealedStageIds]);

  if (!plan || !block)
    return (
      <main className="grid min-h-screen place-items-center">
        <Link to="/library">
          <Button>Return to library</Button>
        </Link>
      </main>
    );

  const setIndex = async (index: number, skip = false) => {
    if (!sessionId) return;
    speech.stop();
    const bounded = Math.max(0, Math.min(blocks.length - 1, index));
    await updateSession(sessionId, {
      currentBlockIndex: bounded,
      currentActivityIndex: Math.min(plan.activities.length - 1, bounded),
      elapsedSeconds: elapsed,
      ...(skip
        ? { skippedBlockIds: [...new Set([...(session?.skippedBlockIds ?? []), block.id])] }
        : {})
    });
  };
  const togglePause = async () => {
    const next = !paused;
    setPaused(next);
    if (sessionId) await updateSession(sessionId, { paused: next, elapsedSeconds: elapsed });
  };
  const revealNext = async () => {
    if (!sessionId) return;
    const next = block.revealStages.find((stage) => !revealedStageIds.includes(stage.id));
    if (!next) return;
    await updateSession(sessionId, {
      revealState: { ...(session?.revealState ?? {}), [block.id]: [...revealedStageIds, next.id] }
    });
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
      currentBlockIndex: blocks.length - 1,
      currentActivityIndex: plan.activities.length - 1
    });
    navigate(`/plans/${plan.id}/reflect?session=${sessionId}`);
  };
  const lessonQuickChecks = quickChecks.filter((item) => item.sessionId === sessionId);
  const nextReveal = block.revealStages.find((stage) => !revealedStageIds.includes(stage.id));

  return (
    <div className="min-h-screen bg-[#eef2ec] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4">
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
            <p className="text-[10px] font-black tracking-wider text-emerald-700 uppercase">
              Teach · Block {currentIndex + 1}/{blocks.length} · exact {plan.durationMinutes} min
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
            target="_blank"
            className="hidden h-10 items-center gap-2 rounded-xl border border-black/8 px-3 text-xs font-black hover:bg-slate-100 md:flex"
          >
            <Presentation className="size-4" /> Open learner screen
          </Link>
          {speech.supported && (
            <button
              onClick={
                speech.speaking
                  ? speech.stop
                  : () =>
                      speech.speak([block.title, ...block.learnerContent].join(". "), plan.language)
              }
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
          <div className="flex h-11 items-center gap-3 rounded-xl bg-slate-950 px-3 text-white">
            <div>
              <p className="text-[9px] font-black tracking-wider text-white/50 uppercase">
                Lesson left
              </p>
              <p className="font-mono text-sm font-black tabular-nums">
                {timerLabel(lessonRemaining)}
              </p>
            </div>
            <button
              onClick={() => void togglePause()}
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
            className="h-full bg-emerald-700 transition-all"
            style={{ width: `${((currentIndex + 1) / blocks.length) * 100}%` }}
          />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 xl:grid-cols-[17rem_minmax(0,1fr)_19rem]"
      >
        <aside className="order-2 space-y-3 xl:order-1">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Teaching sequence</h2>
              <span className="text-xs font-black text-emerald-700">{plan.durationMinutes}m</span>
            </div>
            <ol className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto">
              {blocks.map((item, index) => (
                <li key={item.id}>
                  <button
                    onClick={() => void setIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs font-bold",
                      index === currentIndex
                        ? "bg-emerald-100 text-emerald-950"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg text-[10px]",
                        index < currentIndex ? "bg-emerald-700 text-white" : "bg-slate-100"
                      )}
                    >
                      {index < currentIndex ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.title}</span>
                      <span className="block text-[9px] font-black tracking-wider uppercase opacity-55">
                        {item.type} · {item.durationMinutes}m
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
          <Link
            to={`/plans/${plan.id}/preview`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700"
          >
            <ArrowLeft className="size-3.5" /> Exit without completing
          </Link>
        </aside>
        <section className="order-1 space-y-5 xl:order-2">
          <Card className="overflow-hidden">
            <div className="bg-emerald-950 px-5 py-6 text-white sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black tracking-wider uppercase">
                    {block.type.replaceAll("-", " ")}
                  </span>
                  <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">
                    {block.gradeTarget.label}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 font-mono font-black",
                    blockRemaining < 0
                      ? "bg-rose-500"
                      : blockRemaining < 60
                        ? "bg-amber-300 text-amber-950"
                        : "bg-white/10"
                  )}
                >
                  <Clock3 className="size-4" />
                  {timerLabel(blockRemaining)}
                </div>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                {block.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">{block.purpose}</p>
            </div>
            <div className="p-5 sm:p-8">
              <ClassroomBlockView block={block} revealedStageIds={revealedStageIds} />
            </div>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => void setIndex(currentIndex - 1)}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <div className="flex flex-wrap gap-2">
              {nextReveal && (
                <Button variant="secondary" onClick={() => void revealNext()}>
                  <Eye className="size-4" /> {nextReveal.label}
                </Button>
              )}
              {currentIndex < blocks.length - 1 && (
                <Button variant="ghost" onClick={() => void setIndex(currentIndex + 1, true)}>
                  <SkipForward className="size-4" /> Skip
                </Button>
              )}
              {currentIndex === blocks.length - 1 ? (
                <Button variant="sun" size="lg" onClick={() => void finish()}>
                  Finish & reflect <Check className="size-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={() => void setIndex(currentIndex + 1)}>
                  Next block <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
        <aside className="order-3 space-y-4">
          <Card className="overflow-hidden border-emerald-700/15">
            <div className="bg-emerald-950 p-4 text-white">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-amber-300" />
                <h2 className="text-sm font-black">Quick Check 2.0</h2>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-white/65">
                Anonymous counts, misconception signal and next action.
              </p>
            </div>
            <div className="p-4">
              <Button variant="sun" className="w-full" onClick={() => setQuickCheckOpen(true)}>
                Capture class pulse
              </Button>
              {lessonQuickChecks[0] && (
                <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-950">
                  <p>
                    {lessonQuickChecks.length} check{lessonQuickChecks.length === 1 ? "" : "s"}{" "}
                    saved
                  </p>
                  {lessonQuickChecks[0].suggestedAction && (
                    <p className="mt-1 font-medium">Next: {lessonQuickChecks[0].suggestedAction}</p>
                  )}
                </div>
              )}
            </div>
          </Card>
          {plan.additionalGrade && (
            <Card className="p-4">
              <h2 className="text-sm font-black">Multigrade attention</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Switch the teacher-focus group without changing the shared task.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[plan.grade, plan.additionalGrade].map((grade) => (
                  <Button
                    key={grade}
                    size="sm"
                    variant={session?.activeGrade === grade ? "primary" : "secondary"}
                    onClick={() =>
                      sessionId && void updateSession(sessionId, { activeGrade: grade })
                    }
                  >
                    Grade {grade}
                  </Button>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-4 text-emerald-700" />
              <h2 className="text-sm font-black">Private teaching note</h2>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Never shown on the learner screen.
            </p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What are you noticing?"
              className="mt-3 min-h-24 w-full resize-none rounded-xl border border-black/10 bg-[#faf9f5] p-3 text-sm outline-none focus:border-emerald-500"
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full"
              onClick={() => void addNote()}
              disabled={!note.trim()}
            >
              Save note
            </Button>
            {session?.quickNotes.length ? (
              <ul className="mt-3 space-y-2 border-t border-black/5 pt-3">
                {session.quickNotes.map((item, index) => (
                  <li key={index} className="rounded-lg bg-emerald-50 p-2 text-xs leading-5">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </aside>
      </main>
      {quickCheckOpen && (
        <QuickCheckModal
          classSize={plan.classSize}
          defaultPrompt={
            block.type === "quick-check" || block.type === "exit-ticket"
              ? block.question
              : (plan.assessments[0]?.prompt ?? `Show your understanding after “${block.title}”.`)
          }
          onClose={() => setQuickCheckOpen(false)}
          onSave={async (input) => {
            if (!sessionId) return;
            const checkBlock =
              block.type === "quick-check" || block.type === "exit-ticket"
                ? (block as CheckInstructionalBlock)
                : undefined;
            const analysis = analyseQuickCheck(input.counts, checkBlock);
            await addQuickCheck({
              id: uid("quickcheck"),
              planId: plan.id,
              sessionId,
              ownerId: profile?.id ?? plan.ownerId,
              blockId: block.id,
              ...input,
              ...(analysis.misconceptionSignal
                ? { misconceptionSignal: analysis.misconceptionSignal }
                : {}),
              suggestedAction: analysis.suggestedAction,
              createdAt: new Date().toISOString()
            });
          }}
        />
      )}
    </div>
  );
}
