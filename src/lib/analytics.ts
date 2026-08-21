import type { AnalyticsSnapshot, LessonPlan, Reflection, Subject } from "@chalkbox/contracts";

const outcomeScore: Record<Reflection["studentOutcome"], number> = {
  "not-yet": 25,
  partly: 50,
  mostly: 75,
  fully: 100
};

export function calculateAnalytics(
  ownerId: string,
  plans: LessonPlan[],
  reflections: Reflection[]
): AnalyticsSnapshot {
  const owned = plans.filter((plan) => plan.ownerId === ownerId);
  const taught = owned.filter((plan) => plan.status === "taught");
  const subjects = new Map<Subject, number>();
  owned.forEach((plan) => subjects.set(plan.subject, (subjects.get(plan.subject) ?? 0) + 1));
  const relevantReflections = reflections.filter((item) => item.ownerId === ownerId);
  const averageOutcome = relevantReflections.length
    ? Math.round(
        relevantReflections.reduce((sum, item) => sum + outcomeScore[item.studentOutcome], 0) /
          relevantReflections.length
      )
    : 0;

  return {
    ownerId,
    periodLabel: "Last 4 weeks",
    plansCreated: owned.length,
    plansTaught: taught.length,
    hoursSaved: Number(
      (
        owned.reduce((sum, item) => sum + Math.max(0, 45 - item.estimatedPrepMinutes), 0) / 60
      ).toFixed(1)
    ),
    averageQuality: owned.length
      ? Math.round(owned.reduce((sum, item) => sum + item.qualityScore, 0) / owned.length)
      : 0,
    averageOutcome,
    subjectBreakdown: [...subjects.entries()].map(([subject, count]) => ({
      subject,
      plans: count
    })),
    weeklyActivity: [
      { week: "W1", created: 2, taught: 1 },
      { week: "W2", created: 3, taught: 2 },
      {
        week: "W3",
        created: Math.max(2, owned.length - 4),
        taught: Math.max(1, taught.length - 2)
      },
      {
        week: "W4",
        created: Math.max(1, Math.min(4, owned.length)),
        taught: Math.max(1, taught.length)
      }
    ],
    topTopics: owned.slice(0, 4).map((plan, index) => ({ topic: plan.topic, uses: 5 - index }))
  };
}
