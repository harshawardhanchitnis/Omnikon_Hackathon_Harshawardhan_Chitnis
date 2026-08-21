import { describe, expect, it } from "vitest";
import { lessonPlanSchema } from "@chalkbox/contracts";
import { demoPlans } from "./demo-fixtures";

describe("demo fixtures", () => {
  it.each(demoPlans.map((plan) => [plan.id, plan]))(
    "validates %s against the shared contract",
    (_id, plan) => {
      expect(lessonPlanSchema.safeParse(plan).success).toBe(true);
    }
  );

  it("contains no obvious student-identifying fields", () => {
    const serialized = JSON.stringify(demoPlans).toLowerCase();
    expect(serialized).not.toContain("studentname");
    expect(serialized).not.toContain("student_email");
    expect(serialized).not.toContain("phone_number");
  });
});
