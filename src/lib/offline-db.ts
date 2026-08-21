import Dexie, { type EntityTable } from "dexie";
import type {
  AssessmentQuestion,
  CheckIn,
  ClassroomProfile,
  CommunityPublication,
  LessonPlan,
  Notification,
  OfflineMutation,
  PlanVersion,
  PublicationReport,
  QuickCheckResult,
  Reflection,
  ShareSnapshot,
  SyncConflict,
  TeachingSession,
  Worksheet
} from "@chalkbox/contracts";

export interface OfflineMeta {
  key: string;
  value: string;
  updatedAt: string;
}

export class ChalkBoxDatabase extends Dexie {
  plans!: EntityTable<LessonPlan, "id">;
  sessions!: EntityTable<TeachingSession, "id">;
  checkIns!: EntityTable<CheckIn, "id">;
  reflections!: EntityTable<Reflection, "id">;
  notifications!: EntityTable<Notification, "id">;
  planVersions!: EntityTable<PlanVersion, "id">;
  shares!: EntityTable<ShareSnapshot, "id">;
  classroomProfiles!: EntityTable<ClassroomProfile, "id">;
  assessmentQuestions!: EntityTable<AssessmentQuestion, "id">;
  worksheets!: EntityTable<Worksheet, "id">;
  publications!: EntityTable<CommunityPublication, "id">;
  publicationReports!: EntityTable<PublicationReport, "id">;
  quickChecks!: EntityTable<QuickCheckResult, "id">;
  mutations!: EntityTable<OfflineMutation, "id">;
  conflicts!: EntityTable<SyncConflict, "id">;
  meta!: EntityTable<OfflineMeta, "key">;

  constructor(databaseName = "chalkbox-offline-v1") {
    super(databaseName);
    this.version(1).stores({
      plans: "id, ownerId, status, subject, grade, updatedAt",
      sessions: "id, planId, ownerId, startedAt",
      checkIns: "id, planId, ownerId, createdAt",
      reflections: "id, planId, ownerId, createdAt",
      meta: "key, updatedAt"
    });
    this.version(2)
      .stores({
        plans: "id, ownerId, status, subject, grade, updatedAt, version",
        sessions: "id, planId, ownerId, startedAt, updatedAt, version",
        checkIns: "id, planId, ownerId, createdAt",
        reflections: "id, planId, ownerId, createdAt, updatedAt, version",
        notifications: "id, userId, read, createdAt",
        planVersions: "id, planId, ownerId, versionNumber, createdAt",
        shares: "id, &token, planId, ownerId, createdAt, revokedAt, expiresAt",
        classroomProfiles: "id, ownerId, grade, archived, updatedAt",
        assessmentQuestions:
          "id, ownerId, board, grade, subject, chapter, topic, type, purpose, difficulty, language, provenance, reviewState",
        worksheets: "id, ownerId, grade, subject, status, updatedAt",
        publications: "id, ownerId, planId, status, submittedAt, updatedAt",
        publicationReports: "id, publicationId, reporterId, status, createdAt",
        quickChecks: "id, planId, sessionId, ownerId, createdAt",
        mutations: "id, entityId, entityType, status, timestamp",
        conflicts: "id, mutationId, entityId, entityType, detectedAt, resolvedAt",
        meta: "key, updatedAt"
      })
      .upgrade(async (transaction) => {
        const now = new Date().toISOString();
        await transaction
          .table<LessonPlan, string>("plans")
          .toCollection()
          .modify((plan) => {
            plan.version = plan.version || 1;
            if (plan.board === ("CBSE" as LessonPlan["board"])) plan.board = "CBSE/NCERT";
            if (plan.board === ("Other" as LessonPlan["board"])) plan.board = "Custom";
            if (plan.language === ("Bilingual" as LessonPlan["language"])) {
              plan.language = "Bilingual English–Hindi";
            }
          });
        await transaction
          .table<TeachingSession, string>("sessions")
          .toCollection()
          .modify((session) => {
            session.version = session.version || 1;
            session.updatedAt =
              session.updatedAt || session.completedAt || session.startedAt || now;
          });
        await transaction
          .table<Reflection, string>("reflections")
          .toCollection()
          .modify((reflection) => {
            reflection.version = reflection.version || 1;
            reflection.updatedAt = reflection.updatedAt || reflection.createdAt || now;
          });
      });
  }
}

export const offlineDb = new ChalkBoxDatabase();

export async function clearOfflineDatabase() {
  await offlineDb.transaction("rw", offlineDb.tables, async () => {
    await Promise.all(offlineDb.tables.map((table) => table.clear()));
  });
}
