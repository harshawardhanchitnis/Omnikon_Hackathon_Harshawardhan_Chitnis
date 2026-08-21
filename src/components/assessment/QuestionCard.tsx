import type { AssessmentQuestion } from "@chalkbox/contracts";
import { BookPlus, FilePlus2, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const difficultyTone = {
  foundation: "blue",
  core: "green",
  challenge: "amber"
} as const;

interface QuestionCardProps {
  question: AssessmentQuestion;
  selected?: boolean;
  onToggleWorksheet: (question: AssessmentQuestion) => void;
  onAddToLesson: (question: AssessmentQuestion) => void;
  onGenerateSimilar: (question: AssessmentQuestion) => void;
  onViewProvenance: (question: AssessmentQuestion) => void;
}

export function QuestionCard({
  question,
  selected,
  onToggleWorksheet,
  onAddToLesson,
  onGenerateSimilar,
  onViewProvenance
}: QuestionCardProps) {
  return (
    <Card className="group hover:border-moss-500/30 hover:shadow-lift flex h-full flex-col overflow-hidden border-black/7 transition duration-300 hover:-translate-y-0.5">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
        <Badge tone={difficultyTone[question.difficulty]}>{question.difficulty}</Badge>
        <Badge>{question.type.replace("-", " ")}</Badge>
        <span className="text-ink-500 ml-auto text-[10px] font-black tracking-wider uppercase">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-moss-700 text-[10px] font-black tracking-[0.12em] uppercase">
          {question.chapter} · {question.topic}
        </p>
        <h3 className="text-ink-950 mt-3 text-base leading-7 font-black">{question.prompt}</h3>
        {question.options && (
          <ol className="text-muted mt-4 grid gap-2 text-xs sm:grid-cols-2">
            {question.options.map((option, index) => (
              <li key={option} className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-ink-700 mr-1 font-black">
                  {String.fromCharCode(65 + index)}.
                </span>{" "}
                {option}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={() => onViewProvenance(question)}
            className="text-ink-500 hover:text-moss-700 flex items-center gap-1.5 text-[11px] font-bold"
          >
            {question.reviewState === "curator-approved" ? (
              <ShieldCheck className="size-3.5" />
            ) : (
              <GitBranch className="size-3.5" />
            )}
            {question.provenance.replaceAll("-", " ")} · {question.reviewState.replaceAll("-", " ")}
          </button>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={selected ? "primary" : "secondary"}
              onClick={() => onToggleWorksheet(question)}
            >
              <FilePlus2 className="size-3.5" /> {selected ? "In tray" : "Worksheet"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onAddToLesson(question)}
            >
              <BookPlus className="size-3.5" /> Add to lesson
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="col-span-2"
              onClick={() => onGenerateSimilar(question)}
            >
              <Sparkles className="size-3.5" /> Generate a reviewed variant
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
