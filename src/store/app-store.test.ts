import { describe, expect, it } from "vitest";
import { demoPlans, demoReflections, demoSessions } from "@/data/demo-fixtures";
import { migratePersistedAppState, selectPersistedAppState, useAppStore } from "@/store/app-store";

describe("application-store persistence boundary", () => {
  it("persists only identity, preferences, and small app counters", () => {
    const persisted = selectPersistedAppState(useAppStore.getState());
    expect(Object.keys(persisted).sort()).toEqual([
      "generationCount",
      "mode",
      "profile",
      "settings"
    ]);
    expect(persisted).not.toHaveProperty("plans");
    expect(persisted).not.toHaveProperty("sessions");
    expect(persisted).not.toHaveProperty("reflections");
  });

  it("drops legacy domain records during the v1 to v2 migration", () => {
    const migrated = migratePersistedAppState({
      mode: "demo-teacher",
      plans: demoPlans,
      sessions: demoSessions,
      reflections: demoReflections
    });
    expect(migrated.mode).toBe("demo-teacher");
    expect(migrated).not.toHaveProperty("plans");
    expect(migrated).not.toHaveProperty("sessions");
    expect(migrated).not.toHaveProperty("reflections");
  });
});
