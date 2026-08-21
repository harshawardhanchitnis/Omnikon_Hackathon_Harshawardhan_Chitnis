import type { LessonPlan } from "@chalkbox/contracts";
import { ArrowRight, Clock3, Copy, MoreHorizontal, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatDate, minutesLabel } from "@/lib/utils";
import { PlanStatusBadge } from "./PlanStatusBadge";

interface PlanCardProps {
  plan: LessonPlan;
  onClone?: (plan: LessonPlan) => void;
}

export function PlanCard({ plan, onClone }: PlanCardProps) {
  return (
    <Card className="group hover:shadow-lift flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5">
      <div className="from-moss-700 via-moss-500 to-sun-500 h-1.5 bg-gradient-to-r" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlanStatusBadge status={plan.status} />
            {plan.generationMode === "prepared-demo" && (
              <span className="text-[10px] font-black tracking-wider text-violet-700 uppercase">
                Prepared demo
              </span>
            )}
          </div>
          <ProgressRing
            value={plan.qualityScore}
            size="sm"
            label={`Quality score ${plan.qualityScore}`}
          />
        </div>
        <div className="mt-4 flex-1">
          <p className="text-moss-700 text-xs font-black tracking-[0.13em] uppercase">
            Grade {plan.grade} · {plan.subject}
          </p>
          <h3 className="text-ink-950 group-hover:text-moss-700 mt-2 text-lg font-black tracking-tight">
            {plan.title}
          </h3>
          <p className="text-muted mt-2 line-clamp-2 text-sm leading-6">{plan.topic}</p>
        </div>
        <div className="text-ink-500 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/5 pt-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {minutesLabel(plan.durationMinutes)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {plan.classSize} learners
          </span>
          <span className="ml-auto">{formatDate(plan.updatedAt)}</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Link
            to={`/plans/${plan.id}/edit`}
            className="bg-moss-700 hover:bg-moss-900 flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-white transition"
          >
            Open plan <ArrowRight className="size-4" />
          </Link>
          {onClone && (
            <button
              onClick={() => onClone(plan)}
              className="text-ink-700 hover:bg-moss-50 grid size-10 place-items-center rounded-xl border border-black/10 bg-white"
              aria-label={`Duplicate ${plan.title}`}
            >
              <Copy className="size-4" />
            </button>
          )}
          <button
            className="text-ink-700 hover:bg-moss-50 grid size-10 place-items-center rounded-xl border border-black/10 bg-white"
            aria-label={`More options for ${plan.title}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
