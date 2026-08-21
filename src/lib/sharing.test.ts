import { describe, expect, it } from "vitest";
import { demoPlans } from "@/data/demo-fixtures";
import { isShareActive, sanitiseShareSnapshot } from "@/lib/sharing";

describe("immutable sharing", () => {
  it("removes private ownership and teacher notes from a detached snapshot", () => {
    const source = structuredClone(demoPlans[0]!);
    const shared = sanitiseShareSnapshot(source, "public-token-123456");
    source.title = "Changed later";
    expect(shared.title).not.toBe(source.title);
    expect(shared.teacherNotes).toBe("");
    expect(shared.ownerId).toBe("shared");
    expect(shared.publicSlug).toBe("public-token-123456");
  });

  it("rejects revoked and expired links", () => {
    const snapshot = sanitiseShareSnapshot(demoPlans[0]!, "public-token-123456");
    const base = {
      id: "share_1",
      token: "public-token-123456",
      planId: snapshot.id,
      planVersionId: "version_1",
      ownerId: demoPlans[0]!.ownerId,
      snapshot,
      createdAt: "2026-08-20T00:00:00.000Z"
    };
    expect(isShareActive(base, Date.parse("2026-08-21T00:00:00.000Z"))).toBe(true);
    expect(isShareActive({ ...base, revokedAt: "2026-08-20T12:00:00.000Z" })).toBe(false);
    expect(
      isShareActive(
        { ...base, expiresAt: "2026-08-20T12:00:00.000Z" },
        Date.parse("2026-08-21T00:00:00.000Z")
      )
    ).toBe(false);
  });
});
