import { describe, expect, it } from "vitest";
import { canModeratePublication } from "@/state/domain-context";

describe("community role boundary", () => {
  it("never grants moderation to teacher modes", () => {
    expect(canModeratePublication("teacher")).toBe(false);
    expect(canModeratePublication("demo-teacher")).toBe(false);
    expect(canModeratePublication("guest")).toBe(false);
  });

  it("grants moderation only to admin modes", () => {
    expect(canModeratePublication("admin")).toBe(true);
    expect(canModeratePublication("demo-admin")).toBe(true);
  });
});
