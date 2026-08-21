import { ArrowLeft, Maximize2, Radio, Square, Volume2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ClassroomVisual } from "@/components/teach/ClassroomVisual";
import { Button } from "@/components/ui/Button";
import { usePresentationState } from "@/hooks/use-classroom-broadcast";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { toLearnerClassroomBlock } from "@/lib/classroom-engine";
import { useDomain } from "@/state/domain-context";

export function PresentModePage() {
  const { planId } = useParams();
  const { plans, sessions } = useDomain();
  const plan = plans.find((item) => item.id === planId);
  const live = usePresentationState(planId);
  const session = sessions.find((item) => item.planId === planId && !item.completedAt);
  const fallbackBlock =
    plan?.classroomBlocks[session?.currentBlockIndex ?? 0] ?? plan?.classroomBlocks[0];
  const block =
    live?.block ??
    (fallbackBlock
      ? toLearnerClassroomBlock(fallbackBlock, session?.revealState[fallbackBlock.id] ?? [])
      : null);
  const speech = useSpeechSynthesis();

  if (!plan || !block)
    return (
      <main className="grid min-h-screen place-items-center">
        <Link to="/library">
          <Button>Return to library</Button>
        </Link>
      </main>
    );

  const readText = [block.title, ...block.learnerContent, ...block.revealedContent].join(". ");
  return (
    <div className="min-h-screen bg-[#0d2924] text-white">
      <header className="border-b border-white/10 bg-black/10">
        <div className="mx-auto flex h-16 max-w-[1700px] items-center gap-3 px-4 sm:px-6">
          <Link
            to={`/plans/${plan.id}/teach`}
            className="grid size-10 place-items-center rounded-xl text-white/75 hover:bg-white/10"
            aria-label="Return to Teach Mode"
          >
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{plan.title}</p>
            <p className="flex items-center gap-1 text-[10px] font-black tracking-[0.16em] text-emerald-200 uppercase">
              <Radio className="size-3" /> Live learner view · teacher notes excluded
            </p>
          </div>
          {speech.supported && (
            <button
              onClick={() =>
                speech.speaking ? speech.stop() : speech.speak(readText, plan.language)
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-black hover:bg-white/15"
            >
              {speech.speaking ? (
                <Square className="size-4 fill-current" />
              ) : (
                <Volume2 className="size-4" />
              )}
              {speech.speaking ? "Stop" : "Read aloud"}
            </button>
          )}
          <button
            onClick={() => void document.documentElement.requestFullscreen?.()}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/15"
            aria-label="Enter full screen"
          >
            <Maximize2 className="size-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1700px] flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <span className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black tracking-wider text-emerald-950 uppercase">
              {block.type.replaceAll("-", " ")}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
              {block.gradeLabel}
            </span>
          </div>
          <p className="text-xl font-black text-amber-300">{block.durationMinutes} minutes</p>
        </div>
        <h1 className="mt-7 max-w-6xl text-5xl leading-[1.03] font-black tracking-[-0.05em] text-balance sm:text-6xl lg:text-8xl">
          {block.title}
        </h1>
        {block.visualData && (
          <div className="mt-8 text-slate-950">
            <ClassroomVisual visual={block.visualData} large />
          </div>
        )}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {block.learnerContent.map((item, index) => (
            <div
              key={item}
              className="flex gap-5 rounded-3xl border border-white/10 bg-white/8 p-6 text-xl leading-8 font-bold sm:text-2xl sm:leading-10"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-300 text-base font-black text-slate-950">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        {block.question && (
          <section className="mt-8 rounded-3xl bg-white p-7 text-slate-950">
            <p className="text-3xl leading-tight font-black">{block.question}</p>
            {block.options && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {block.options.map((option) => (
                  <p
                    key={option.key}
                    className="rounded-2xl border-2 border-emerald-900/10 p-4 text-xl font-black"
                  >
                    <span className="mr-3 text-emerald-700">{option.key}</span>
                    {option.label}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}
        {block.revealedContent.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-2 mt-8 rounded-3xl bg-violet-200 p-7 text-violet-950">
            <p className="text-xs font-black tracking-[0.16em] uppercase">Revealed by teacher</p>
            {block.revealedContent.map((item) => (
              <p key={item} className="mt-2 text-3xl leading-tight font-black">
                {item}
              </p>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
