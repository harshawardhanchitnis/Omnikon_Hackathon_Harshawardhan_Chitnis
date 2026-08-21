import { describe, expect, it } from "vitest";
import { createOfflineMutation, hasVersionConflict } from "@/services/offline-sync";

describe("offline mutation contracts", () => {
  it("records the metadata required for ordered safe replay", () => {
    const mutation = createOfflineMutation("lesson-plan", "plan_1", "update", { version: 3 }, 2);
    expect(mutation).toMatchObject({
      entityId: "plan_1",
      entityType: "lesson-plan",
      mutationType: "update",
      baseVersion: 2,
      retryCount: 0,
      status: "pending"
    });
    expect(mutation.timestamp).toBeTruthy();
  });

  it("detects create and update conflicts without silently overwriting", () => {
    expect(hasVersionConflict(0, undefined)).toBe(false);
    expect(hasVersionConflict(0, 1)).toBe(true);
    expect(hasVersionConflict(4, 4)).toBe(false);
    expect(hasVersionConflict(4, 5)).toBe(true);
    expect(hasVersionConflict(4, undefined)).toBe(true);
  });
});
