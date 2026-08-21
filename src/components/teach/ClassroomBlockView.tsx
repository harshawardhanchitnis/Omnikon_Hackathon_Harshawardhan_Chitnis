import type { InstructionalBlock } from "@chalkbox/contracts";
import {
  AlertTriangle,
  BookOpenCheck,
  Eye,
  Lightbulb,
  MessageCircleQuestion,
  Users
} from "lucide-react";
import { ClassroomVisual } from "@/components/teach/ClassroomVisual";

interface ClassroomBlockViewProps {
  block: InstructionalBlock;
  revealedStageIds: string[];
}

export function ClassroomBlockView({ block, revealedStageIds }: ClassroomBlockViewProps) {
  const revealed = block.revealStages.filter((stage) => revealedStageIds.includes(stage.id));
  return (
    <div className="space-y-5">
      {block.type === "visual" && <ClassroomVisual visual={block.visualData} />}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-emerald-900/10 bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-emerald-700 uppercase">
            <BookOpenCheck className="size-4" /> Teacher cue
          </p>
          <p className="mt-3 text-base leading-7 font-bold">{block.teacherCue}</p>
          {"teacherExplanation" in block && (
            <p className="mt-3 text-sm leading-6 text-slate-600">{block.teacherExplanation}</p>
          )}
          {"teacherResponse" in block && (
            <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm leading-6 font-bold text-emerald-950">
              Respond: {block.teacherResponse}
            </p>
          )}
          {"boardPrompt" in block && block.boardPrompt && (
            <p className="mt-3 rounded-xl bg-slate-950 p-3 font-mono text-sm font-bold text-white">
              Board: {block.boardPrompt}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-sky-900/10 bg-sky-50/60 p-5">
          <p className="flex items-center gap-2 text-xs font-black tracking-[0.14em] text-sky-800 uppercase">
            <Users className="size-4" /> Learners see / do
          </p>
          <ul className="mt-3 space-y-2">
            {block.learnerContent.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 font-bold">
                <span className="text-sky-600">•</span>
                {item}
              </li>
            ))}
          </ul>
          {"prompt" in block && (
            <p className="mt-3 rounded-xl bg-white p-3 text-sm font-black">{block.prompt}</p>
          )}
          {(block.type === "quick-check" || block.type === "exit-ticket") && (
            <div className="mt-3 rounded-xl bg-white p-3">
              <p className="flex gap-2 text-sm font-black">
                <MessageCircleQuestion className="size-4" />
                {block.question}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {block.options.map((option) => (
                  <p key={option.key} className="rounded-lg border p-2 text-xs font-bold">
                    <span className="mr-2 text-emerald-700">{option.key}</span>
                    {option.label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
      {block.type === "misconception" && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-900 uppercase">
            <AlertTriangle className="size-4" /> Misconception watch
          </p>
          <p className="mt-2 text-lg font-black text-amber-950">“{block.misconception}”</p>
          <p className="mt-2 text-sm leading-6">
            <strong>Listen for:</strong> {block.evidenceToListenFor}
          </p>
          <p className="mt-2 text-sm leading-6">
            <strong>Ask:</strong> {block.diagnosticQuestion}
          </p>
        </section>
      )}
      {revealed.map((stage) => (
        <section
          key={stage.id}
          className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-violet-200 bg-violet-50 p-5"
        >
          <p className="flex items-center gap-2 text-xs font-black tracking-wider text-violet-800 uppercase">
            <Eye className="size-4" /> {stage.label}
          </p>
          {stage.learnerContent.map((item) => (
            <p key={item} className="mt-2 text-base font-black text-violet-950">
              {item}
            </p>
          ))}
        </section>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <Lightbulb className="mr-2 inline size-4" />
          <strong>Support:</strong> {block.differentiation.support}
        </p>
        <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <strong>If resources fail:</strong> {block.resourceAlternative}
        </p>
      </div>
    </div>
  );
}
