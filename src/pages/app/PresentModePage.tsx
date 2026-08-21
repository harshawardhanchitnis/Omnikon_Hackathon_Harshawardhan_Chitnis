import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Square, Volume2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { cn } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";

export function PresentModePage() {
  const { planId } = useParams();
  const { plans } = useDomain();
  const plan = plans.find((item) => item.id === planId);
  const [index, setIndex] = useState(0);
  const speech = useSpeechSynthesis();

  if (!plan) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Link to="/library">
          <Button>Return to library</Button>
        </Link>
      </main>
    );
  }
  const activity = plan.activities[index] ?? plan.activities[0];
  if (!activity) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p>This plan has no activities to present.</p>
      </main>
    );
  }
  const readText = [activity.title, ...activity.studentSteps].join(". ");

  return (
    <div className="min-h-screen bg-[#102d28] text-white">
      <header className="border-b border-white/10 bg-black/10">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link
            to={`/plans/${plan.id}/teach`}
            className="grid size-10 place-items-center rounded-xl text-white/75 hover:bg-white/10"
            aria-label="Return to Teach Mode"
          >
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{plan.title}</p>
            <p className="text-[10px] font-black tracking-[0.16em] text-emerald-200 uppercase">
              Learner view · no private notes
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
      <main className="mx-auto flex min-h-[calc(100vh-8.5rem)] max-w-[1600px] flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black tracking-wider text-emerald-950 uppercase">
            {activity.type}
          </span>
          <p className="text-xl font-black text-amber-300">{activity.durationMinutes} minutes</p>
        </div>
        <h1 className="mt-8 max-w-6xl text-5xl leading-[1.03] font-black tracking-[-0.05em] text-balance sm:text-6xl lg:text-8xl">
          {activity.title}
        </h1>
        <ol className="mt-10 grid gap-5 lg:grid-cols-2">
          {activity.studentSteps.map((step, stepIndex) => (
            <li
              key={stepIndex}
              className="flex gap-5 rounded-3xl border border-white/10 bg-white/8 p-6 text-xl leading-8 font-bold sm:text-2xl sm:leading-10"
            >
              <span className="text-ink-950 grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-300 text-base font-black">
                {stepIndex + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {activity.materials.length > 0 && (
          <p className="mt-8 text-lg font-bold text-white/65">
            <span className="text-white">You will use:</span> {activity.materials.join(" · ")}
          </p>
        )}
      </main>
      <footer className="sticky bottom-0 border-t border-white/10 bg-[#102d28]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={index === 0}
            onClick={() => {
              speech.stop();
              setIndex((value) => Math.max(0, value - 1));
            }}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <div className="flex max-w-[45vw] gap-1.5 overflow-hidden">
            {plan.activities.map((item, itemIndex) => (
              <button
                key={item.id}
                onClick={() => {
                  speech.stop();
                  setIndex(itemIndex);
                }}
                aria-label={`Show step ${itemIndex + 1}: ${item.title}`}
                className={cn(
                  "h-2 w-8 rounded-full transition",
                  itemIndex === index ? "bg-amber-300" : "bg-white/20"
                )}
              />
            ))}
          </div>
          <Button
            variant="sun"
            disabled={index === plan.activities.length - 1}
            onClick={() => {
              speech.stop();
              setIndex((value) => Math.min(plan.activities.length - 1, value + 1));
            }}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
