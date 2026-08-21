import Dexie, { type EntityTable } from "dexie";
import type { CheckIn, LessonPlan, Reflection, TeachingSession } from "@chalkbox/contracts";

interface OfflineMeta {
  key: string;
  value: string;
  updatedAt: string;
}

class ChalkBoxDatabase extends Dexie {
  plans!: EntityTable<LessonPlan, "id">;
  sessions!: EntityTable<TeachingSession, "id">;
  checkIns!: EntityTable<CheckIn, "id">;
  reflections!: EntityTable<Reflection, "id">;
  meta!: EntityTable<OfflineMeta, "key">;

  constructor() {
    super("chalkbox-offline-v1");
    this.version(1).stores({
      plans: "id, ownerId, status, subject, grade, updatedAt",
      sessions: "id, planId, ownerId, startedAt",
      checkIns: "id, planId, ownerId, createdAt",
      reflections: "id, planId, ownerId, createdAt",
      meta: "key, updatedAt"
    });
  }
}

export const offlineDb = new ChalkBoxDatabase();

export async function clearOfflineDatabase() {
  await Promise.all([
    offlineDb.plans.clear(),
    offlineDb.sessions.clear(),
    offlineDb.checkIns.clear(),
    offlineDb.reflections.clear(),
    offlineDb.meta.clear()
  ]);
}
