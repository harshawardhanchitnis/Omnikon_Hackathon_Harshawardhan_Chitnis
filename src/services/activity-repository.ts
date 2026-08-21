import type { CheckIn, Reflection, TeachingSession, UserProfile } from "@chalkbox/contracts";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function saveSessionRemote(session: TeachingSession) {
  if (!supabase) return;
  const { error } = await supabase.from("teaching_sessions").upsert({
    id: session.id,
    plan_id: session.planId,
    owner_id: session.ownerId,
    started_at: session.startedAt,
    completed_at: session.completedAt ?? null,
    current_activity_index: session.currentActivityIndex,
    elapsed_seconds: session.elapsedSeconds,
    paused: session.paused,
    attendance_count: session.attendanceCount ?? null,
    quick_notes: session.quickNotes
  });
  if (error) throw new Error(error.message);
}

export async function saveCheckInRemote(checkIn: CheckIn) {
  if (!supabase) return;
  const { error } = await supabase.from("check_ins").upsert({
    id: checkIn.id,
    plan_id: checkIn.planId,
    session_id: checkIn.sessionId ?? null,
    owner_id: checkIn.ownerId,
    understanding: checkIn.understanding,
    engagement: checkIn.engagement,
    pace: checkIn.pace,
    evidence: checkIn.evidence,
    created_at: checkIn.createdAt
  });
  if (error) throw new Error(error.message);
}

export async function saveReflectionRemote(reflection: Reflection) {
  if (!supabase) return;
  const { error } = await supabase.from("reflections").upsert({
    id: reflection.id,
    plan_id: reflection.planId,
    owner_id: reflection.ownerId,
    went_well: reflection.wentWell,
    improve_next_time: reflection.improveNextTime,
    student_outcome: reflection.studentOutcome,
    rating: reflection.rating,
    next_step: reflection.nextStep,
    created_at: reflection.createdAt
  });
  if (error) throw new Error(error.message);
}

export async function saveProfileRemote(profile: UserProfile) {
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: profile.fullName,
      school_name: profile.schoolName,
      district: profile.district,
      state: profile.state,
      preferred_language: profile.preferredLanguage,
      grades: profile.grades,
      subjects: profile.subjects,
      onboarding_complete: profile.onboardingComplete,
      last_active_at: profile.lastActiveAt
    })
    .eq("id", profile.id);
  if (error) throw new Error(error.message);
}

export async function loadProfileRemote(user: User): Promise<UserProfile> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name,
    email: user.email ?? "",
    schoolName: data.school_name,
    district: data.district,
    state: data.state,
    preferredLanguage: data.preferred_language,
    grades: data.grades,
    subjects: data.subjects,
    onboardingComplete: data.onboarding_complete,
    createdAt: data.created_at,
    lastActiveAt: data.last_active_at
  };
}

export async function loadActivityRemote(): Promise<{
  sessions: TeachingSession[];
  checkIns: CheckIn[];
  reflections: Reflection[];
}> {
  if (!supabase) return { sessions: [], checkIns: [], reflections: [] };
  const [sessionResult, checkInResult, reflectionResult] = await Promise.all([
    supabase.from("teaching_sessions").select("*").order("started_at", { ascending: false }),
    supabase.from("check_ins").select("*").order("created_at", { ascending: false }),
    supabase.from("reflections").select("*").order("created_at", { ascending: false })
  ]);
  const error = sessionResult.error ?? checkInResult.error ?? reflectionResult.error;
  if (error) throw new Error(error.message);
  return {
    sessions: (sessionResult.data ?? []).map((row) => ({
      id: row.id,
      planId: row.plan_id,
      ownerId: row.owner_id,
      startedAt: row.started_at,
      ...(row.completed_at ? { completedAt: row.completed_at } : {}),
      currentActivityIndex: row.current_activity_index,
      elapsedSeconds: row.elapsed_seconds,
      paused: row.paused,
      ...(row.attendance_count !== null ? { attendanceCount: row.attendance_count } : {}),
      quickNotes: row.quick_notes as string[]
    })),
    checkIns: (checkInResult.data ?? []).map((row) => ({
      id: row.id,
      planId: row.plan_id,
      ...(row.session_id ? { sessionId: row.session_id } : {}),
      ownerId: row.owner_id,
      understanding: row.understanding as CheckIn["understanding"],
      engagement: row.engagement as CheckIn["engagement"],
      pace: row.pace as CheckIn["pace"],
      evidence: row.evidence,
      createdAt: row.created_at
    })),
    reflections: (reflectionResult.data ?? []).map((row) => ({
      id: row.id,
      planId: row.plan_id,
      ownerId: row.owner_id,
      wentWell: row.went_well,
      improveNextTime: row.improve_next_time,
      studentOutcome: row.student_outcome as Reflection["studentOutcome"],
      rating: row.rating as Reflection["rating"],
      nextStep: row.next_step,
      createdAt: row.created_at
    }))
  };
}
