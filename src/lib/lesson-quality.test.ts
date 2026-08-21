import { describe, expect, it } from "vitest";
import { demoPlans } from "@/data/demo-fixtures";
import { evaluatePlan } from "./lesson-quality";

describe("evaluatePlan", () => {
  it("passes every deterministic check for the flagship prepared plan", () => {
    const plan = demoPlans.find((item) => item.id === "plan_photosynthesis_flagship");
    expect(plan).toBeDefined();
    const result = evaluatePlan(plan!);
    expect(result.score).toBe(100);
    expect(result.checks).toHaveLength(7);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("detects missing offline alternatives", () => {
    const source = demoPlans.find((item) => item.id === "plan_photosynthesis_flagship")!;
    const plan = structuredClone(source);
    plan.classroomBlocks[0]!.resourceAlternative = "";
    const result = evaluatePlan(plan);
    expect(result.score).toBeLessThan(100);
    expect(result.checks.find((check) => check.label === "Low-resource ready")?.passed).toBe(false);
  });
});
