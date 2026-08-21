import type { LessonPlan } from "@chalkbox/contracts";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { evaluatePlan } from "@/lib/lesson-quality";

export function QualityPanel({ plan }: { plan: LessonPlan }) {
  const { score, checks } = evaluatePlan(plan);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <ProgressRing value={score} />
        <div>
          <p className="text-moss-700 text-xs font-black tracking-wider uppercase">Plan quality</p>
          <h3 className="font-black">
            {score === 100 ? "Classroom-ready" : "A few checks need attention"}
          </h3>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-2.5 text-sm">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            )}
            <div>
              <p className="font-bold">{check.label}</p>
              <p className="text-muted mt-0.5 text-xs leading-5">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
