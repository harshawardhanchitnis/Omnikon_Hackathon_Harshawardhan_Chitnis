import type {
  AssessmentQuestion,
  CheckIn,
  ClassroomProfile,
  CommunityPublication,
  LessonPlan,
  Notification,
  PlanVersion,
  PlanVersionReason,
  PublicationReport,
  QuickCheckResult,
  Reflection,
  ShareSnapshot,
  SyncConflict,
  TeachingSession,
  Worksheet
} from "@chalkbox/contracts";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  demoAssessmentQuestions,
  demoCheckIns,
  demoClassroomProfiles,
  demoNotifications,
  demoPlanVersions,
  demoPlans,
  demoPublications,
  demoQuickChecks,
  demoReflections,
  demoSessions,
  demoShares,
  demoSyncConflicts,
  demoTeacher,
  demoWorksheets
} from "@/data/demo-fixtures";
import { clearOfflineDatabase, offlineDb } from "@/lib/offline-db";
import { sanitiseShareSnapshot } from "@/lib/sharing";
import { uid } from "@/lib/utils";
import { loadActivityRemote, saveCheckInRemote } from "@/services/activity-repository";
import {
  loadExtendedDomainRemote,
  revokeShareRemote,
  saveAssessmentQuestionRemote,
  saveClassroomRemote,
  savePlanVersionRemote,
  savePublicationRemote,
  savePublicationReportRemote,
  saveQuickCheckRemote,
  saveShareRemote,
  saveWorksheetRemote
} from "@/services/extended-domain-repository";
import {
  createOfflineMutation,
  queueMutation,
  replayMutationQueue,
  resolveSyncConflict
} from "@/services/offline-sync";
import { loadPlansRemote } from "@/services/plan-repository";
import { useAppStore } from "@/store/app-store";

export interface DomainState {
  plans: LessonPlan[];
  sessions: TeachingSession[];
  checkIns: CheckIn[];
  reflections: Reflection[];
  notifications: Notification[];
  planVersions: PlanVersion[];
  shares: ShareSnapshot[];
  classroomProfiles: ClassroomProfile[];
  assessmentQuestions: AssessmentQuestion[];
  worksheets: Worksheet[];
  publications: CommunityPublication[];
  publicationReports: PublicationReport[];
  quickChecks: QuickCheckResult[];
  conflicts: SyncConflict[];
  pendingMutationCount: number;
  ready: boolean;
}

export interface DomainActions {
  hydrate: () => Promise<void>;
  addPlan: (plan: LessonPlan) => Promise<void>;
  updatePlan: (id: string, patch: Partial<LessonPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  clonePlan: (source: LessonPlan, title?: string) => Promise<LessonPlan>;
  startSession: (planId: string) => Promise<TeachingSession>;
  updateSession: (id: string, patch: Partial<TeachingSession>) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  addReflection: (reflection: Reflection) => Promise<void>;
  addQuickCheck: (quickCheck: QuickCheckResult) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  createPlanVersion: (
    planId: string,
    reason: PlanVersionReason,
    label?: string
  ) => Promise<PlanVersion>;
  restorePlanVersion: (versionId: string) => Promise<void>;
  duplicatePlanVersion: (versionId: string) => Promise<LessonPlan>;
  createShare: (planId: string, expiresAt?: string) => Promise<ShareSnapshot>;
  revokeShare: (shareId: string) => Promise<void>;
  saveClassroomProfile: (profile: ClassroomProfile) => Promise<void>;
  archiveClassroomProfile: (profileId: string) => Promise<void>;
  duplicateClassroomProfile: (profileId: string) => Promise<ClassroomProfile>;
  addQuestionToPlan: (questionId: string, planId: string) => Promise<void>;
  saveAssessmentQuestion: (question: AssessmentQuestion) => Promise<void>;
  saveWorksheet: (worksheet: Worksheet) => Promise<void>;
  createWorksheet: (questionIds?: string[]) => Promise<Worksheet>;
  submitPublication: (planId: string) => Promise<CommunityPublication>;
  withdrawPublication: (publicationId: string) => Promise<void>;
  moderatePublication: (
    publicationId: string,
    decision: "approved" | "rejected" | "unpublished",
    reason?: string
  ) => Promise<void>;
  reportPublication: (
    publicationId: string,
    reason: PublicationReport["reason"],
    note: string
  ) => Promise<void>;
  resolveConflict: (
    conflictId: string,
    resolution: "keep-local" | "keep-cloud" | "duplicate-both"
  ) => Promise<void>;
  resetDemo: () => Promise<void>;
}

type DomainContextValue = DomainState & DomainActions;

const DomainContext = createContext<DomainContextValue | null>(null);

function clone<T>(value: T): T {
  return structuredClone(value);
}

// This module intentionally exports the provider's seed helper for demo bootstrap/reset.
// eslint-disable-next-line react-refresh/only-export-components
export async function seedDemoDomainData(force = false) {
  if (force) await clearOfflineDatabase();
  const alreadySeeded = await offlineDb.meta.get("demo-seeded-v2");
  if (alreadySeeded && !force) return;
  await offlineDb.transaction("rw", offlineDb.tables, async () => {
    await Promise.all([
      offlineDb.plans.bulkPut(clone(demoPlans)),
      offlineDb.sessions.bulkPut(clone(demoSessions)),
      offlineDb.checkIns.bulkPut(clone(demoCheckIns)),
      offlineDb.reflections.bulkPut(clone(demoReflections)),
      offlineDb.notifications.bulkPut(clone(demoNotifications)),
      offlineDb.planVersions.bulkPut(clone(demoPlanVersions)),
      offlineDb.shares.bulkPut(clone(demoShares)),
      offlineDb.classroomProfiles.bulkPut(clone(demoClassroomProfiles)),
      offlineDb.assessmentQuestions.bulkPut(clone(demoAssessmentQuestions)),
      offlineDb.worksheets.bulkPut(clone(demoWorksheets)),
      offlineDb.publications.bulkPut(clone(demoPublications)),
      offlineDb.quickChecks.bulkPut(clone(demoQuickChecks)),
      offlineDb.conflicts.bulkPut(clone(demoSyncConflicts)),
      offlineDb.meta.put({
        key: "demo-seeded-v2",
        value: "true",
        updatedAt: new Date().toISOString()
      })
    ]);
  });
}

// Kept beside the provider so moderation rules share one authoritative implementation.
// eslint-disable-next-line react-refresh/only-export-components
export function canModeratePublication(mode: ReturnType<typeof useAppStore.getState>["mode"]) {
  return mode === "admin" || mode === "demo-admin";
}

const emptyState: DomainState = {
  plans: [],
  sessions: [],
  checkIns: [],
  reflections: [],
  notifications: [],
  planVersions: [],
  shares: [],
  classroomProfiles: [],
  assessmentQuestions: [],
  worksheets: [],
  publications: [],
  publicationReports: [],
  quickChecks: [],
  conflicts: [],
  pendingMutationCount: 0,
  ready: false
};

export function DomainProvider({ children }: PropsWithChildren) {
  const mode = useAppStore((state) => state.mode);
  const profile = useAppStore((state) => state.profile);
  const setConnectivity = useAppStore((state) => state.setConnectivity);
  const resetDemoUi = useAppStore((state) => state.resetDemoUi);
  const [state, setState] = useState<DomainState>(emptyState);

  const hydrate = useCallback(async () => {
    if (mode.startsWith("demo")) await seedDemoDomainData();
    if (mode === "teacher" || mode === "admin") {
      const [remotePlans, remoteActivity, remoteExtended] = await Promise.all([
        loadPlansRemote().catch(() => []),
        loadActivityRemote().catch(() => ({ sessions: [], checkIns: [], reflections: [] })),
        loadExtendedDomainRemote().catch(() => null)
      ]);
      await Promise.all([
        remotePlans.length ? offlineDb.plans.bulkPut(remotePlans) : Promise.resolve(),
        remoteActivity.sessions.length
          ? offlineDb.sessions.bulkPut(remoteActivity.sessions)
          : Promise.resolve(),
        remoteActivity.checkIns.length
          ? offlineDb.checkIns.bulkPut(remoteActivity.checkIns)
          : Promise.resolve(),
        remoteActivity.reflections.length
          ? offlineDb.reflections.bulkPut(remoteActivity.reflections)
          : Promise.resolve(),
        remoteExtended?.planVersions.length
          ? offlineDb.planVersions.bulkPut(remoteExtended.planVersions)
          : Promise.resolve(),
        remoteExtended?.shares.length
          ? offlineDb.shares.bulkPut(remoteExtended.shares)
          : Promise.resolve(),
        remoteExtended?.classroomProfiles.length
          ? offlineDb.classroomProfiles.bulkPut(remoteExtended.classroomProfiles)
          : Promise.resolve(),
        remoteExtended?.assessmentQuestions.length
          ? offlineDb.assessmentQuestions.bulkPut(remoteExtended.assessmentQuestions)
          : Promise.resolve(),
        remoteExtended?.worksheets.length
          ? offlineDb.worksheets.bulkPut(remoteExtended.worksheets)
          : Promise.resolve(),
        remoteExtended?.publications.length
          ? offlineDb.publications.bulkPut(remoteExtended.publications)
          : Promise.resolve(),
        remoteExtended?.publicationReports.length
          ? offlineDb.publicationReports.bulkPut(remoteExtended.publicationReports)
          : Promise.resolve(),
        remoteExtended?.quickChecks.length
          ? offlineDb.quickChecks.bulkPut(remoteExtended.quickChecks)
          : Promise.resolve()
      ]);
    }
    const [
      plans,
      sessions,
      checkIns,
      reflections,
      notifications,
      planVersions,
      shares,
      classroomProfiles,
      assessmentQuestions,
      worksheets,
      publications,
      publicationReports,
      quickChecks,
      conflicts,
      pendingMutations
    ] = await Promise.all([
      offlineDb.plans.toArray(),
      offlineDb.sessions.toArray(),
      offlineDb.checkIns.toArray(),
      offlineDb.reflections.toArray(),
      offlineDb.notifications.toArray(),
      offlineDb.planVersions.toArray(),
      offlineDb.shares.toArray(),
      offlineDb.classroomProfiles.toArray(),
      offlineDb.assessmentQuestions.toArray(),
      offlineDb.worksheets.toArray(),
      offlineDb.publications.toArray(),
      offlineDb.publicationReports.toArray(),
      offlineDb.quickChecks.toArray(),
      offlineDb.conflicts.filter((item) => !item.resolvedAt).toArray(),
      offlineDb.mutations.filter((item) => item.status !== "synced").count()
    ]);
    setState({
      plans,
      sessions,
      checkIns,
      reflections,
      notifications,
      planVersions,
      shares,
      classroomProfiles,
      assessmentQuestions,
      worksheets,
      publications,
      publicationReports,
      quickChecks,
      conflicts,
      pendingMutationCount: pendingMutations,
      ready: true
    });
  }, [mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void hydrate(), 0);
    return () => window.clearTimeout(timer);
  }, [hydrate]);

  useEffect(() => {
    const onOnline = () => {
      setConnectivity(true);
      void replayMutationQueue().then(hydrate);
    };
    const onOffline = () => setConnectivity(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [hydrate, setConnectivity]);

  const value = useMemo<DomainContextValue>(() => {
    const createPlanVersion = async (planId: string, reason: PlanVersionReason, label?: string) => {
      const plan = await offlineDb.plans.get(planId);
      if (!plan) throw new Error("Plan not found");
      const storedVersions = await offlineDb.planVersions.where("planId").equals(planId).toArray();
      const versionNumber = Math.max(0, ...storedVersions.map((item) => item.versionNumber)) + 1;
      const version: PlanVersion = {
        id: uid("version"),
        planId,
        ownerId: plan.ownerId,
        versionNumber,
        reason,
        ...(label ? { label } : {}),
        snapshot: clone(plan),
        createdAt: new Date().toISOString()
      };
      await offlineDb.planVersions.put(version);
      if (mode === "teacher") void savePlanVersionRemote(version).catch(() => undefined);
      setState((current) => ({
        ...current,
        planVersions: [version, ...current.planVersions]
      }));
      return version;
    };

    const updatePlan = async (id: string, patch: Partial<LessonPlan>) => {
      const existing = state.plans.find((plan) => plan.id === id);
      if (!existing) return;
      const updated: LessonPlan = {
        ...existing,
        ...patch,
        version: existing.version + 1,
        updatedAt: new Date().toISOString()
      };
      await offlineDb.plans.put(updated);
      setState((current) => ({
        ...current,
        plans: current.plans.map((plan) => (plan.id === id ? updated : plan))
      }));
      if (mode === "teacher") {
        await queueMutation(
          createOfflineMutation("lesson-plan", updated.id, "update", updated, existing.version)
        );
      }
    };

    const addPlan = async (incoming: LessonPlan) => {
      const plan = { ...clone(incoming), version: incoming.version || 1 };
      await offlineDb.plans.put(plan);
      const initialVersion: PlanVersion = {
        id: uid("version"),
        planId: plan.id,
        ownerId: plan.ownerId,
        versionNumber: 1,
        reason: plan.generationMode === "manual" ? "manual-checkpoint" : "generated",
        snapshot: clone(plan),
        createdAt: plan.createdAt
      };
      await offlineDb.planVersions.put(initialVersion);
      setState((current) => ({
        ...current,
        plans: [plan, ...current.plans.filter((item) => item.id !== plan.id)],
        planVersions: [initialVersion, ...current.planVersions]
      }));
      if (mode === "teacher") {
        await queueMutation(createOfflineMutation("lesson-plan", plan.id, "create", plan, 0));
      }
    };

    const clonePlan = async (source: LessonPlan, title?: string) => {
      const now = new Date().toISOString();
      const plan: LessonPlan = {
        ...clone(source),
        id: uid("plan"),
        ownerId: profile?.id ?? demoTeacher.id,
        title: title ?? `${source.title} — adapted`,
        status: "draft",
        generationMode: "community-clone",
        aiDisclosure:
          "Adapted from an attributed immutable snapshot. Review curriculum fit before teaching.",
        parentPlanId: source.id,
        isPublic: false,
        publicSlug: undefined,
        createdAt: now,
        updatedAt: now,
        version: 1
      };
      await addPlan(plan);
      return plan;
    };

    return {
      ...state,
      hydrate,
      addPlan,
      updatePlan,
      deletePlan: async (id) => {
        const existing = state.plans.find((plan) => plan.id === id);
        if (!existing) return;
        await offlineDb.plans.delete(id);
        setState((current) => ({
          ...current,
          plans: current.plans.filter((plan) => plan.id !== id)
        }));
        if (mode === "teacher") {
          await queueMutation(
            createOfflineMutation("lesson-plan", id, "delete", existing, existing.version)
          );
        }
      },
      clonePlan,
      startSession: async (planId) => {
        const active = state.sessions.find((item) => item.planId === planId && !item.completedAt);
        if (active) return active;
        const now = new Date().toISOString();
        const session: TeachingSession = {
          id: uid("session"),
          planId,
          ownerId: profile?.id ?? demoTeacher.id,
          startedAt: now,
          currentActivityIndex: 0,
          elapsedSeconds: 0,
          paused: false,
          quickNotes: [],
          version: 1,
          updatedAt: now
        };
        await offlineDb.sessions.put(session);
        setState((current) => ({
          ...current,
          sessions: [session, ...current.sessions]
        }));
        if (mode === "teacher") {
          await queueMutation(
            createOfflineMutation("teaching-session", session.id, "create", session, 0)
          );
        }
        return session;
      },
      updateSession: async (id, patch) => {
        const existing = state.sessions.find((item) => item.id === id);
        if (!existing) return;
        const updated: TeachingSession = {
          ...existing,
          ...patch,
          version: existing.version + 1,
          updatedAt: new Date().toISOString()
        };
        await offlineDb.sessions.put(updated);
        setState((current) => ({
          ...current,
          sessions: current.sessions.map((item) => (item.id === id ? updated : item))
        }));
        if (mode === "teacher") {
          await queueMutation(
            createOfflineMutation(
              "teaching-session",
              updated.id,
              "update",
              updated,
              existing.version
            )
          );
        }
      },
      addCheckIn: async (checkIn) => {
        await offlineDb.checkIns.put(checkIn);
        setState((current) => ({
          ...current,
          checkIns: [checkIn, ...current.checkIns]
        }));
        if (mode === "teacher") void saveCheckInRemote(checkIn).catch(() => undefined);
      },
      addReflection: async (incoming) => {
        const now = new Date().toISOString();
        const reflection: Reflection = {
          ...incoming,
          version: incoming.version || 1,
          updatedAt: incoming.updatedAt || now
        };
        await offlineDb.reflections.put(reflection);
        setState((current) => ({
          ...current,
          reflections: [reflection, ...current.reflections]
        }));
        if (mode === "teacher") {
          await queueMutation(
            createOfflineMutation("reflection", reflection.id, "create", reflection, 0)
          );
        }
        await updatePlan(reflection.planId, { status: "taught", taughtAt: now });
      },
      addQuickCheck: async (quickCheck) => {
        await offlineDb.quickChecks.put(quickCheck);
        if (mode === "teacher") void saveQuickCheckRemote(quickCheck).catch(() => undefined);
        setState((current) => ({
          ...current,
          quickChecks: [quickCheck, ...current.quickChecks]
        }));
      },
      markNotificationRead: async (id) => {
        await offlineDb.notifications.update(id, { read: true });
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          )
        }));
      },
      createPlanVersion,
      restorePlanVersion: async (versionId) => {
        const version = state.planVersions.find((item) => item.id === versionId);
        if (!version) return;
        await createPlanVersion(version.planId, "manual-checkpoint", "Before restore");
        const current = state.plans.find((item) => item.id === version.planId);
        if (!current) return;
        await updatePlan(version.planId, {
          ...clone(version.snapshot),
          id: current.id,
          ownerId: current.ownerId,
          createdAt: current.createdAt,
          isPublic: false,
          publicSlug: undefined
        });
        await createPlanVersion(version.planId, "restored", `Restored v${version.versionNumber}`);
      },
      duplicatePlanVersion: async (versionId) => {
        const version = state.planVersions.find((item) => item.id === versionId);
        if (!version) throw new Error("Version not found");
        return clonePlan(
          version.snapshot,
          `${version.snapshot.title} — from v${version.versionNumber}`
        );
      },
      createShare: async (planId, expiresAt) => {
        const plan = state.plans.find((item) => item.id === planId);
        if (!plan) throw new Error("Plan not found");
        const version = await createPlanVersion(planId, "shared", "Immutable public snapshot");
        const token = uid("share").replaceAll("_", "-");
        const share: ShareSnapshot = {
          id: uid("share-record"),
          token,
          planId,
          planVersionId: version.id,
          ownerId: plan.ownerId,
          snapshot: sanitiseShareSnapshot(version.snapshot, token),
          createdAt: new Date().toISOString(),
          ...(expiresAt ? { expiresAt } : {})
        };
        await offlineDb.shares.put(share);
        if (mode === "teacher") void saveShareRemote(share).catch(() => undefined);
        setState((current) => ({ ...current, shares: [share, ...current.shares] }));
        return share;
      },
      revokeShare: async (shareId) => {
        const revokedAt = new Date().toISOString();
        await offlineDb.shares.update(shareId, { revokedAt });
        if (mode === "teacher") void revokeShareRemote(shareId, revokedAt).catch(() => undefined);
        setState((current) => ({
          ...current,
          shares: current.shares.map((share) =>
            share.id === shareId ? { ...share, revokedAt } : share
          )
        }));
      },
      saveClassroomProfile: async (classroom) => {
        await offlineDb.classroomProfiles.put(classroom);
        if (mode === "teacher") void saveClassroomRemote(classroom).catch(() => undefined);
        setState((current) => ({
          ...current,
          classroomProfiles: [
            classroom,
            ...current.classroomProfiles.filter((item) => item.id !== classroom.id)
          ]
        }));
      },
      archiveClassroomProfile: async (profileId) => {
        const existing = state.classroomProfiles.find((item) => item.id === profileId);
        if (!existing) return;
        const updated = { ...existing, archived: true, updatedAt: new Date().toISOString() };
        await offlineDb.classroomProfiles.put(updated);
        if (mode === "teacher") void saveClassroomRemote(updated).catch(() => undefined);
        setState((current) => ({
          ...current,
          classroomProfiles: current.classroomProfiles.map((item) =>
            item.id === profileId ? updated : item
          )
        }));
      },
      duplicateClassroomProfile: async (profileId) => {
        const source = state.classroomProfiles.find((item) => item.id === profileId);
        if (!source) throw new Error("Classroom profile not found");
        const now = new Date().toISOString();
        const duplicate = {
          ...clone(source),
          id: uid("classroom"),
          name: `${source.name} — copy`,
          archived: false,
          createdAt: now,
          updatedAt: now
        };
        await offlineDb.classroomProfiles.put(duplicate);
        if (mode === "teacher") void saveClassroomRemote(duplicate).catch(() => undefined);
        setState((current) => ({
          ...current,
          classroomProfiles: [duplicate, ...current.classroomProfiles]
        }));
        return duplicate;
      },
      addQuestionToPlan: async (questionId, planId) => {
        const question = state.assessmentQuestions.find((item) => item.id === questionId);
        const plan = state.plans.find((item) => item.id === planId);
        if (!question || !plan) return;
        await updatePlan(planId, {
          assessments: [
            ...plan.assessments,
            {
              id: uid("assessment"),
              prompt: question.prompt,
              type:
                question.purpose === "exit-ticket"
                  ? "exit-ticket"
                  : question.type === "short-answer" || question.type === "long-answer"
                    ? "written"
                    : "oral",
              answerGuide: question.answer,
              checksObjectiveIds: plan.objectives.slice(0, 1).map((item) => item.id)
            }
          ]
        });
      },
      saveAssessmentQuestion: async (question) => {
        await offlineDb.assessmentQuestions.put(question);
        if (mode === "teacher") void saveAssessmentQuestionRemote(question).catch(() => undefined);
        setState((current) => ({
          ...current,
          assessmentQuestions: [
            question,
            ...current.assessmentQuestions.filter((item) => item.id !== question.id)
          ]
        }));
      },
      saveWorksheet: async (worksheet) => {
        await offlineDb.worksheets.put(worksheet);
        if (mode === "teacher") void saveWorksheetRemote(worksheet).catch(() => undefined);
        setState((current) => ({
          ...current,
          worksheets: [worksheet, ...current.worksheets.filter((item) => item.id !== worksheet.id)]
        }));
      },
      createWorksheet: async (questionIds = []) => {
        const now = new Date().toISOString();
        const selected = state.assessmentQuestions.filter((item) => questionIds.includes(item.id));
        const worksheet: Worksheet = {
          id: uid("worksheet"),
          ownerId: profile?.id ?? demoTeacher.id,
          title: selected[0] ? `${selected[0].topic} practice` : "Untitled worksheet",
          instructions: "Answer every question. Show your thinking where appropriate.",
          grade: selected[0]?.grade ?? "6",
          subject: selected[0]?.subject ?? "Science",
          chapter: selected[0]?.chapter ?? "",
          language: selected[0]?.language ?? "English",
          includeAnswers: false,
          items: selected.map((question, index) => ({
            id: uid("worksheet-item"),
            questionId: question.id,
            questionSnapshot: clone(question),
            order: index,
            marks: question.marks
          })),
          status: "draft",
          createdAt: now,
          updatedAt: now
        };
        await offlineDb.worksheets.put(worksheet);
        if (mode === "teacher") void saveWorksheetRemote(worksheet).catch(() => undefined);
        setState((current) => ({
          ...current,
          worksheets: [worksheet, ...current.worksheets]
        }));
        return worksheet;
      },
      submitPublication: async (planId) => {
        const plan = state.plans.find((item) => item.id === planId);
        if (!plan) throw new Error("Plan not found");
        const version = await createPlanVersion(planId, "published", "Community submission");
        const now = new Date().toISOString();
        const publication: CommunityPublication = {
          id: uid("publication"),
          ownerId: plan.ownerId,
          planId,
          planVersionId: version.id,
          snapshot: sanitiseShareSnapshot(version.snapshot, "community"),
          authorName: profile?.fullName ?? "ChalkBox teacher",
          authorSchool: profile?.schoolName ?? "",
          status: "submitted",
          submittedAt: now,
          saves: 0,
          adaptations: 0,
          reports: 0,
          createdAt: now,
          updatedAt: now
        };
        await offlineDb.publications.put(publication);
        if (mode === "teacher") void savePublicationRemote(publication).catch(() => undefined);
        setState((current) => ({
          ...current,
          publications: [publication, ...current.publications]
        }));
        return publication;
      },
      withdrawPublication: async (publicationId) => {
        const publication = state.publications.find((item) => item.id === publicationId);
        if (!publication || publication.status !== "submitted") return;
        const updated = {
          ...publication,
          status: "withdrawn" as const,
          updatedAt: new Date().toISOString()
        };
        await offlineDb.publications.put(updated);
        if (mode === "teacher") void savePublicationRemote(updated).catch(() => undefined);
        setState((current) => ({
          ...current,
          publications: current.publications.map((item) =>
            item.id === publicationId ? updated : item
          )
        }));
      },
      moderatePublication: async (publicationId, decision, reason) => {
        if (!canModeratePublication(useAppStore.getState().mode)) {
          throw new Error("Only an admin can moderate community submissions");
        }
        const publication = state.publications.find((item) => item.id === publicationId);
        if (!publication) return;
        const now = new Date().toISOString();
        const updated: CommunityPublication = {
          ...publication,
          status: decision,
          reviewedAt: now,
          reviewedBy: profile?.id ?? "admin",
          ...(decision === "rejected" && reason ? { rejectionReason: reason } : {}),
          updatedAt: now
        };
        await offlineDb.publications.put(updated);
        if (mode === "teacher" || mode === "admin")
          void savePublicationRemote(updated).catch(() => undefined);
        setState((current) => ({
          ...current,
          publications: current.publications.map((item) =>
            item.id === publicationId ? updated : item
          )
        }));
      },
      reportPublication: async (publicationId, reason, note) => {
        const report: PublicationReport = {
          id: uid("publication-report"),
          publicationId,
          reporterId: profile?.id ?? demoTeacher.id,
          reason,
          note,
          status: "open",
          createdAt: new Date().toISOString()
        };
        await offlineDb.publicationReports.put(report);
        if (mode === "teacher") void savePublicationReportRemote(report).catch(() => undefined);
        const publication = state.publications.find((item) => item.id === publicationId);
        if (publication) {
          await offlineDb.publications.update(publicationId, { reports: publication.reports + 1 });
        }
        setState((current) => ({
          ...current,
          publicationReports: [report, ...current.publicationReports],
          publications: current.publications.map((item) =>
            item.id === publicationId ? { ...item, reports: item.reports + 1 } : item
          )
        }));
      },
      resolveConflict: async (conflictId, resolution) => {
        await resolveSyncConflict(conflictId, resolution);
        await hydrate();
        void replayMutationQueue().then(hydrate);
      },
      resetDemo: async () => {
        await seedDemoDomainData(true);
        resetDemoUi();
        await hydrate();
      }
    };
  }, [hydrate, mode, profile, resetDemoUi, state]);

  return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>;
}

// React context modules conventionally export their provider hook alongside the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useDomain() {
  const context = useContext(DomainContext);
  if (!context) throw new Error("useDomain must be used inside DomainProvider");
  return context;
}
