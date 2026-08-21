import type {
  AppMode,
  AppSettings,
  CheckIn,
  LessonPlan,
  Notification,
  Reflection,
  TeachingSession,
  UserProfile
} from "@chalkbox/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  defaultSettings,
  demoCheckIns,
  demoNotifications,
  demoPlans,
  demoReflections,
  demoSessions,
  demoTeacher
} from "@/data/demo-fixtures";
import { clearOfflineDatabase, offlineDb } from "@/lib/offline-db";
import { uid } from "@/lib/utils";
import {
  loadActivityRemote,
  saveCheckInRemote,
  saveReflectionRemote,
  saveSessionRemote
} from "@/services/activity-repository";
import {
  loadPlansRemote,
  queuePlanSync,
  removePlanRemote,
  savePlanRemote
} from "@/services/plan-repository";

interface AppStore {
  mode: AppMode;
  profile: UserProfile | null;
  plans: LessonPlan[];
  sessions: TeachingSession[];
  checkIns: CheckIn[];
  reflections: Reflection[];
  notifications: Notification[];
  settings: AppSettings;
  generationCount: number;
  sidebarOpen: boolean;
  commandOpen: boolean;
  initialized: boolean;
  enterDemo: () => Promise<void>;
  enterDemoAdmin: () => Promise<void>;
  setAuthenticatedProfile: (profile: UserProfile) => void;
  signOut: () => void;
  hydrateOffline: () => Promise<void>;
  addPlan: (plan: LessonPlan) => Promise<void>;
  updatePlan: (id: string, patch: Partial<LessonPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  clonePlan: (source: LessonPlan, title?: string) => Promise<LessonPlan>;
  startSession: (planId: string) => Promise<TeachingSession>;
  updateSession: (id: string, patch: Partial<TeachingSession>) => Promise<void>;
  addCheckIn: (checkIn: CheckIn) => Promise<void>;
  addReflection: (reflection: Reflection) => Promise<void>;
  markNotificationRead: (id: string) => void;
  setSettings: (patch: Partial<AppSettings>) => void;
  incrementGeneration: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  resetDemo: () => Promise<void>;
}

async function seedDexie() {
  await offlineDb.transaction(
    "rw",
    [offlineDb.plans, offlineDb.sessions, offlineDb.checkIns, offlineDb.reflections],
    async () => {
      await offlineDb.plans.bulkPut(structuredClone(demoPlans));
      await offlineDb.sessions.bulkPut(structuredClone(demoSessions));
      await offlineDb.checkIns.bulkPut(structuredClone(demoCheckIns));
      await offlineDb.reflections.bulkPut(structuredClone(demoReflections));
    }
  );
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      mode: "guest",
      profile: null,
      plans: [],
      sessions: [],
      checkIns: [],
      reflections: [],
      notifications: [],
      settings: defaultSettings,
      generationCount: 0,
      sidebarOpen: false,
      commandOpen: false,
      initialized: false,
      enterDemo: async () => {
        const existingPlans = get().plans;
        if (existingPlans.length === 0) await seedDexie();
        set({
          mode: "demo-teacher",
          profile: structuredClone(demoTeacher),
          plans: existingPlans.length ? existingPlans : structuredClone(demoPlans),
          sessions: get().sessions.length ? get().sessions : structuredClone(demoSessions),
          checkIns: get().checkIns.length ? get().checkIns : structuredClone(demoCheckIns),
          reflections: get().reflections.length
            ? get().reflections
            : structuredClone(demoReflections),
          notifications: get().notifications.length
            ? get().notifications
            : structuredClone(demoNotifications),
          initialized: true
        });
      },
      enterDemoAdmin: async () => {
        await get().enterDemo();
        set({ mode: "demo-admin" });
      },
      setAuthenticatedProfile: (profile) => set({ mode: profile.role, profile, initialized: true }),
      signOut: () => set({ mode: "guest", profile: null, sidebarOpen: false }),
      hydrateOffline: async () => {
        const [plans, sessions, checkIns, reflections] = await Promise.all([
          offlineDb.plans.toArray(),
          offlineDb.sessions.toArray(),
          offlineDb.checkIns.toArray(),
          offlineDb.reflections.toArray()
        ]);
        let remotePlans: LessonPlan[] = [];
        let remoteActivity: {
          sessions: TeachingSession[];
          checkIns: CheckIn[];
          reflections: Reflection[];
        } = {
          sessions: [],
          checkIns: [],
          reflections: []
        };
        if (get().mode === "teacher") {
          [remotePlans, remoteActivity] = await Promise.all([
            loadPlansRemote().catch(() => []),
            loadActivityRemote().catch(() => ({ sessions: [], checkIns: [], reflections: [] }))
          ]);
          if (remotePlans.length) await offlineDb.plans.bulkPut(remotePlans);
          if (remoteActivity.sessions.length)
            await offlineDb.sessions.bulkPut(remoteActivity.sessions);
          if (remoteActivity.checkIns.length)
            await offlineDb.checkIns.bulkPut(remoteActivity.checkIns);
          if (remoteActivity.reflections.length)
            await offlineDb.reflections.bulkPut(remoteActivity.reflections);
        }
        const mergeById = <T extends { id: string }>(local: T[], remote: T[]) => [
          ...new Map([...local, ...remote].map((item) => [item.id, item])).values()
        ];
        set({
          plans: plans.length || remotePlans.length ? mergeById(plans, remotePlans) : get().plans,
          sessions:
            sessions.length || remoteActivity.sessions.length
              ? mergeById(sessions, remoteActivity.sessions)
              : get().sessions,
          checkIns:
            checkIns.length || remoteActivity.checkIns.length
              ? mergeById(checkIns, remoteActivity.checkIns)
              : get().checkIns,
          reflections:
            reflections.length || remoteActivity.reflections.length
              ? mergeById(reflections, remoteActivity.reflections)
              : get().reflections,
          initialized: true
        });
      },
      addPlan: async (plan) => {
        await offlineDb.plans.put(plan);
        set((state) => ({ plans: [plan, ...state.plans] }));
        if (get().mode === "teacher") {
          try {
            await savePlanRemote(plan);
          } catch {
            await queuePlanSync(plan.id, "upsert");
          }
        }
      },
      updatePlan: async (id, patch) => {
        const existing = get().plans.find((plan) => plan.id === id);
        if (!existing) return;
        const updated: LessonPlan = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        await offlineDb.plans.put(updated);
        set((state) => ({ plans: state.plans.map((plan) => (plan.id === id ? updated : plan)) }));
        if (get().mode === "teacher") {
          try {
            await savePlanRemote(updated);
          } catch {
            await queuePlanSync(updated.id, "upsert");
          }
        }
      },
      deletePlan: async (id) => {
        await offlineDb.plans.delete(id);
        set((state) => ({ plans: state.plans.filter((plan) => plan.id !== id) }));
        if (get().mode === "teacher") {
          try {
            await removePlanRemote(id);
          } catch {
            await queuePlanSync(id, "delete");
          }
        }
      },
      clonePlan: async (source, title) => {
        const now = new Date().toISOString();
        const clone: LessonPlan = {
          ...structuredClone(source),
          id: uid("plan"),
          ownerId: get().profile?.id ?? demoTeacher.id,
          title: title ?? `${source.title} — adapted`,
          status: "draft",
          generationMode: "community-clone",
          aiDisclosure:
            "Adapted from a community-contributed plan. Review local curriculum fit before teaching.",
          parentPlanId: source.id,
          isPublic: false,
          createdAt: now,
          updatedAt: now
        };
        await get().addPlan(clone);
        return clone;
      },
      startSession: async (planId) => {
        const active = get().sessions.find((item) => item.planId === planId && !item.completedAt);
        if (active) return active;
        const session: TeachingSession = {
          id: uid("session"),
          planId,
          ownerId: get().profile?.id ?? demoTeacher.id,
          startedAt: new Date().toISOString(),
          currentActivityIndex: 0,
          elapsedSeconds: 0,
          paused: false,
          quickNotes: []
        };
        await offlineDb.sessions.put(session);
        set((state) => ({ sessions: [session, ...state.sessions] }));
        if (get().mode === "teacher") void saveSessionRemote(session).catch(() => undefined);
        return session;
      },
      updateSession: async (id, patch) => {
        const existing = get().sessions.find((item) => item.id === id);
        if (!existing) return;
        const updated = { ...existing, ...patch };
        await offlineDb.sessions.put(updated);
        set((state) => ({
          sessions: state.sessions.map((item) => (item.id === id ? updated : item))
        }));
        if (get().mode === "teacher") void saveSessionRemote(updated).catch(() => undefined);
      },
      addCheckIn: async (checkIn) => {
        await offlineDb.checkIns.put(checkIn);
        set((state) => ({ checkIns: [checkIn, ...state.checkIns] }));
        if (get().mode === "teacher") void saveCheckInRemote(checkIn).catch(() => undefined);
      },
      addReflection: async (reflection) => {
        await offlineDb.reflections.put(reflection);
        const plan = get().plans.find((item) => item.id === reflection.planId);
        if (plan) {
          await get().updatePlan(plan.id, { status: "taught", taughtAt: new Date().toISOString() });
        }
        set((state) => ({ reflections: [reflection, ...state.reflections] }));
        if (get().mode === "teacher") void saveReflectionRemote(reflection).catch(() => undefined);
      },
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          )
        })),
      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      incrementGeneration: () => set((state) => ({ generationCount: state.generationCount + 1 })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      resetDemo: async () => {
        await clearOfflineDatabase();
        await seedDexie();
        set({
          mode: "demo-teacher",
          profile: structuredClone(demoTeacher),
          plans: structuredClone(demoPlans),
          sessions: structuredClone(demoSessions),
          checkIns: structuredClone(demoCheckIns),
          reflections: structuredClone(demoReflections),
          notifications: structuredClone(demoNotifications),
          settings: structuredClone(defaultSettings),
          generationCount: 0,
          initialized: true
        });
      }
    }),
    {
      name: "chalkbox-app-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        profile: state.profile,
        plans: state.plans,
        sessions: state.sessions,
        checkIns: state.checkIns,
        reflections: state.reflections,
        notifications: state.notifications,
        settings: state.settings,
        generationCount: state.generationCount
      })
    }
  )
);
