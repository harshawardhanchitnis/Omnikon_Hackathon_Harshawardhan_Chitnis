import {
  lessonPlanSchema,
  type LessonPlan,
  type PlanGenerationInput,
  type PlanGenerationResult
} from "@chalkbox/contracts";
import { demoPlans, DEMO_TEACHER_ID } from "@/data/demo-fixtures";
import { appConfig } from "@/lib/config";
import { invokeFunction } from "@/lib/supabase";
import { slugify, uid } from "@/lib/utils";

export async function generateLessonPlan(
  input: PlanGenerationInput,
  ownerId: string,
  captchaToken?: string
): Promise<PlanGenerationResult> {
  if (!appConfig.hasSupabase) {
    throw new Error(
      "Cloud AI is not configured here. Use the clearly labelled prepared demo plan, or add the Supabase public environment variables."
    );
  }
  const { supabase } = await import("@/lib/supabase");
  let effectiveOwnerId = ownerId;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { data: anonymousData, error } = await supabase.auth.signInAnonymously({
        options: captchaToken ? { captchaToken } : undefined
      });
      if (error) throw new Error(`Demo AI session could not start: ${error.message}`);
      if (!anonymousData.user) throw new Error("Demo AI session did not return a user.");
      effectiveOwnerId = anonymousData.user.id;
    } else {
      effectiveOwnerId = data.session.user.id;
    }
  }
  const result = await invokeFunction<PlanGenerationResult>("generate-lesson-plan", {
    input,
    ownerId: effectiveOwnerId
  });
  const parsed = lessonPlanSchema.safeParse(result.plan);
  if (!parsed.success) {
    throw new Error("The generated plan did not pass ChalkBox quality validation. Please retry.");
  }
  return {
    ...result,
    plan:
      ownerId === DEMO_TEACHER_ID && effectiveOwnerId !== ownerId
        ? { ...parsed.data, ownerId }
        : parsed.data
  };
}

export function createPreparedDemoPlan(input?: Partial<PlanGenerationInput>): PlanGenerationResult {
  const template = demoPlans[0];
  if (!template) throw new Error("Prepared demo content is unavailable.");
  const now = new Date().toISOString();
  const id = uid("plan");
  const plan: LessonPlan = {
    ...structuredClone(template),
    id,
    ownerId: DEMO_TEACHER_ID,
    title: input?.topic ? `${input.topic}: Classroom-ready lesson` : template.title,
    topic: input?.topic ?? template.topic,
    grade: input?.grade ?? template.grade,
    additionalGrade: input?.additionalGrade,
    subject: input?.subject ?? template.subject,
    customSubject: input?.customSubject,
    board: input?.board ?? template.board,
    customBoard: input?.customBoard,
    language: input?.language ?? template.language,
    durationMinutes: input?.durationMinutes ?? template.durationMinutes,
    classSize: input?.classSize ?? template.classSize,
    availableMaterials: input?.availableMaterials?.length
      ? input.availableMaterials
      : template.availableMaterials,
    constraints: input?.constraints?.length ? input.constraints : template.constraints,
    activities: template.activities.map((activity) => ({ ...activity, id: uid("activity") })),
    objectives: template.objectives.map((objective) => ({ ...objective, id: uid("objective") })),
    assessments: template.assessments.map((assessment) => ({
      ...assessment,
      id: uid("assessment"),
      checksObjectiveIds: []
    })),
    generationMode: "prepared-demo",
    aiDisclosure:
      "Prepared demonstration content—not a live AI response. It exists so every judge can evaluate the complete workflow without setup or network access.",
    status: "draft",
    publicSlug: `${slugify(input?.topic ?? template.topic)}-${id.slice(-4)}`,
    isPublic: false,
    createdAt: now,
    updatedAt: now,
    version: 1
  };
  const objectiveIds = plan.objectives.map((item) => item.id);
  plan.assessments = plan.assessments.map((item, index) => ({
    ...item,
    checksObjectiveIds: objectiveIds[index] ? [objectiveIds[index]] : objectiveIds.slice(0, 1)
  }));
  return {
    plan,
    requestId: uid("demo_request"),
    provider: "prepared-demo",
    model: "Prepared ChalkBox example",
    retrievalCount: 1,
    latencyMs: 650,
    warnings: ["Prepared demo content; review and adapt before classroom use."]
  };
}
