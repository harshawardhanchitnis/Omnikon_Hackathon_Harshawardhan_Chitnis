import { describe, expect, it } from "vitest";
import { demoPlans } from "@/data/demo-fixtures";
import { evaluatePlan } from "./lesson-quality";

describe("evaluatePlan", () => {
  it("passes every deterministic check for the prepared water-cycle plan", () => {
    const plan = demoPlans[0];
    expect(plan).toBeDefined();
    const result = evaluatePlan(plan!);
    expect(result.score).toBe(100);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("detects missing offline alternatives", () => {
    const source = demoPlans[0]!;
    const plan = structuredClone(source);
    plan.activities[0]!.offlineAlternative = "";
    const result = evaluatePlan(plan);
    expect(result.score).toBeLessThan(100);
    expect(result.checks.find((check) => check.label === "Low-resource ready")?.passed).toBe(false);
  });
});
