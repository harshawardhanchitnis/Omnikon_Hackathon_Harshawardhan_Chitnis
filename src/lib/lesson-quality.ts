import type { LessonPlan } from "@chalkbox/contracts";

export interface QualityCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export function evaluatePlan(plan: LessonPlan): { score: number; checks: QualityCheck[] } {
  const allocatedMinutes = plan.activities.reduce(
    (sum, activity) => sum + activity.durationMinutes,
    0
  );
  const checks: QualityCheck[] = [
    {
      label: "Clear learning outcomes",
      passed:
        plan.objectives.length >= 2 && plan.objectives.every((item) => item.text.length >= 12),
      detail: `${plan.objectives.length} measurable objectives`
    },
    {
      label: "Time-balanced sequence",
      passed: Math.abs(allocatedMinutes - plan.durationMinutes) <= 5,
      detail: `${allocatedMinutes} of ${plan.durationMinutes} minutes allocated`
    },
    {
      label: "Low-resource ready",
      passed: plan.activities.every((item) => Boolean(item.offlineAlternative)),
      detail: "Every activity includes an offline alternative"
    },
    {
      label: "Assessment alignment",
      passed:
        plan.assessments.length >= 2 &&
        plan.assessments.every((item) => item.checksObjectiveIds.length > 0),
      detail: `${plan.assessments.length} checks tied to objectives`
    },
    {
      label: "Curriculum transparency",
      passed:
        plan.sources.length > 0 && plan.sources.every((source) => Boolean(source.attribution)),
      detail: `${plan.sources.length} attributed curriculum source${plan.sources.length === 1 ? "" : "s"}`
    }
  ];
  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  return { score, checks };
}
