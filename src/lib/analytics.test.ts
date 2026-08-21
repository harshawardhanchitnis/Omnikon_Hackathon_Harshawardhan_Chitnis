import { describe, expect, it } from "vitest";
import { demoPlans, demoReflections, DEMO_TEACHER_ID } from "@/data/demo-fixtures";
import { calculateAnalytics } from "./analytics";

describe("calculateAnalytics", () => {
  it("derives teacher-only insight values from plans and reflections", () => {
    const result = calculateAnalytics(DEMO_TEACHER_ID, demoPlans, demoReflections);
    expect(result.plansCreated).toBe(4);
    expect(result.plansTaught).toBe(1);
    expect(result.averageOutcome).toBe(75);
    expect(result.subjectBreakdown).toHaveLength(3);
    expect(result.hoursSaved).toBeGreaterThan(1);
  });
});
