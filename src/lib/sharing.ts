import type { LessonPlan, ShareSnapshot } from "@chalkbox/contracts";

export function sanitiseShareSnapshot(plan: LessonPlan): LessonPlan {
  return {
    ...structuredClone(plan),
    ownerId: "shared",
    teacherNotes: "",
    isPublic: true,
    publicSlug: undefined
  };
}

export function isShareActive(share: ShareSnapshot, now = Date.now()) {
  return !share.revokedAt && (!share.expiresAt || new Date(share.expiresAt).getTime() > now);
}
