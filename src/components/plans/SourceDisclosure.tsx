import type { LessonPlan } from "@chalkbox/contracts";
import { ExternalLink, Info, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function SourceDisclosure({ plan }: { plan: LessonPlan }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h3 className="font-black">Sources & responsible AI</h3>
          <p className="text-muted mt-1 text-xs leading-5">{plan.aiDisclosure}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {plan.sources.map((source) => (
          <div key={source.id} className="rounded-xl border border-black/5 p-3">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-moss-700 inline-flex items-center gap-1 text-sm font-bold hover:underline"
            >
              {source.title}
              <ExternalLink className="size-3.5" />
            </a>
            <p className="text-muted mt-1 text-xs leading-5">{source.attribution}</p>
          </div>
        ))}
      </div>
      <p className="text-muted mt-4 flex gap-2 text-[11px] leading-5">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        ChalkBox supports teacher judgement; it does not replace syllabus verification or classroom
        safeguarding.
      </p>
    </Card>
  );
}
