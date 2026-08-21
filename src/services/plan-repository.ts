import type { LessonPlan } from "@chalkbox/contracts";
import { offlineDb } from "@/lib/offline-db";
import { supabase } from "@/lib/supabase";

function toDatabaseRow(plan: LessonPlan) {
  return {
    id: plan.id,
    owner_id: plan.ownerId,
    title: plan.title,
    subject: plan.subject,
    grade: plan.grade,
    topic: plan.topic,
    status: plan.status,
    quality_score: plan.qualityScore,
    is_public: plan.isPublic,
    public_slug: plan.publicSlug ?? null,
    generation_mode: plan.generationMode,
    plan_data: plan,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
    taught_at: plan.taughtAt ?? null
  };
}

export async function savePlanRemote(plan: LessonPlan) {
  if (!supabase) return;
  const { error } = await supabase.from("lesson_plans").upsert(toDatabaseRow(plan));
  if (error) throw new Error(error.message);
}

export async function removePlanRemote(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadPlansRemote(): Promise<LessonPlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("lesson_plans")
    .select("plan_data")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.plan_data as LessonPlan);
}

export async function queuePlanSync(planId: string, operation: "upsert" | "delete") {
  await offlineDb.meta.put({
    key: `sync:plan:${planId}`,
    value: operation,
    updatedAt: new Date().toISOString()
  });
}
