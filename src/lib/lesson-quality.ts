import type { LessonPlan } from "@chalkbox/contracts";
import {
  rebalanceBlockDurations,
  totalBlockMinutes,
  validateMultigradeSchedule
} from "@/lib/classroom-engine";

export interface QualityCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export function evaluatePlan(plan: LessonPlan): { score: number; checks: QualityCheck[] } {
  const allocatedMinutes = totalBlockMinutes(plan.classroomBlocks);
  const blockTypes = new Set(plan.classroomBlocks.map((block) => block.type));
  const multigradeIssues = validateMultigradeSchedule(
    plan.classroomBlocks,
    plan.additionalGrade ? [plan.grade, plan.additionalGrade] : [plan.grade]
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
      passed: allocatedMinutes === plan.durationMinutes,
      detail:
        allocatedMinutes === plan.durationMinutes
          ? `Exactly ${plan.durationMinutes} minutes allocated`
          : `${allocatedMinutes} of ${plan.durationMinutes} minutes allocated — use Fit to duration`
    },
    {
      label: "Low-resource ready",
      passed: plan.classroomBlocks.every((item) => Boolean(item.resourceAlternative)),
      detail: "Every teaching block includes a no-device or common-material alternative"
    },
    {
      label: "Structured classroom flow",
      passed:
        plan.classroomBlocks.length >= 5 &&
        blockTypes.has("hook") &&
        (blockTypes.has("quick-check") || blockTypes.has("exit-ticket")) &&
        (blockTypes.has("recap") || blockTypes.has("exit-ticket")),
      detail: `${plan.classroomBlocks.length} explicit instructional blocks`
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
        plan.grounding.status !== "ungrounded" &&
        plan.grounding.verifiedSourceIds.length > 0 &&
        plan.sources.every((source) => Boolean(source.attribution)),
      detail:
        plan.grounding.status === "ungrounded"
          ? "No verified curriculum source retrieved"
          : `${plan.grounding.status.replace("-", " ")} · ${plan.grounding.verifiedSourceIds.length} verified source${plan.grounding.verifiedSourceIds.length === 1 ? "" : "s"}`
    },
    {
      label: "Multigrade feasibility",
      passed: multigradeIssues.length === 0,
      detail:
        multigradeIssues.length === 0
          ? "No block requires simultaneous direct instruction to two groups"
          : multigradeIssues[0]!.message
    }
  ];
  const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  return { score, checks };
}

export function fitPlanToDuration(plan: LessonPlan): LessonPlan {
  return {
    ...plan,
    classroomBlocks: rebalanceBlockDurations(plan.classroomBlocks, plan.durationMinutes),
    updatedAt: new Date().toISOString(),
    version: plan.version + 1
  };
}
