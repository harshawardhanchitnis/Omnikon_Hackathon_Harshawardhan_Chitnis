import type { AppMode, AppSettings, UserProfile } from "@chalkbox/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultSettings, demoTeacher } from "@/data/demo-fixtures";

export interface AppStore {
  mode: AppMode;
  profile: UserProfile | null;
  settings: AppSettings;
  generationCount: number;
  sidebarOpen: boolean;
  commandOpen: boolean;
  isOnline: boolean;
  initialized: boolean;
  enterDemo: () => Promise<void>;
  enterDemoAdmin: () => Promise<void>;
  setAuthenticatedProfile: (profile: UserProfile) => void;
  signOut: () => void;
  setSettings: (patch: Partial<AppSettings>) => void;
  incrementGeneration: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setConnectivity: (online: boolean) => void;
  resetDemoUi: () => void;
}

export function selectPersistedAppState(state: AppStore) {
  return {
    mode: state.mode,
    profile: state.profile,
    settings: state.settings,
    generationCount: state.generationCount
  };
}

type LegacyPersistedState = Partial<AppStore> & {
  plans?: unknown;
  sessions?: unknown;
  checkIns?: unknown;
  reflections?: unknown;
  notifications?: unknown;
};

export function migratePersistedAppState(persistedState: unknown) {
  const legacy = (persistedState ?? {}) as LegacyPersistedState;
  return {
    mode: legacy.mode ?? "guest",
    profile: legacy.profile ?? null,
    settings: legacy.settings ?? defaultSettings,
    generationCount: legacy.generationCount ?? 0
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      mode: "guest",
      profile: null,
      settings: defaultSettings,
      generationCount: 0,
      sidebarOpen: false,
      commandOpen: false,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
      initialized: true,
      enterDemo: async () => {
        set({
          mode: "demo-teacher",
          profile: structuredClone(demoTeacher),
          initialized: true
        });
      },
      enterDemoAdmin: async () => {
        set({
          mode: "demo-admin",
          profile: structuredClone(demoTeacher),
          initialized: true
        });
      },
      setAuthenticatedProfile: (profile) => set({ mode: profile.role, profile, initialized: true }),
      signOut: () => set({ mode: "guest", profile: null, sidebarOpen: false }),
      setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      incrementGeneration: () => set((state) => ({ generationCount: state.generationCount + 1 })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCommandOpen: (open) => set({ commandOpen: open }),
      setConnectivity: (online) => set({ isOnline: online }),
      resetDemoUi: () =>
        set({
          mode: "demo-teacher",
          profile: structuredClone(demoTeacher),
          settings: structuredClone(defaultSettings),
          generationCount: 0,
          sidebarOpen: false,
          commandOpen: false,
          initialized: true
        })
    }),
    {
      name: "chalkbox-app-v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: selectPersistedAppState,
      migrate: migratePersistedAppState
    }
  )
);
