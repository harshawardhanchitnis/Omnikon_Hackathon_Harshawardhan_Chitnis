import { describe, expect, it } from "vitest";
import { gradeLevels, planGenerationInputSchema, subjects } from "@chalkbox/contracts";

const validInput = {
  grade: "6" as const,
  subject: "Science" as const,
  topic: "Separation of substances",
  durationMinutes: 45,
  language: "Bilingual English–Hindi" as const,
  board: "CBSE/NCERT" as const,
  classSize: 40,
  availableMaterials: ["Blackboard"],
  constraints: ["No projector"],
  learningLevel: "mixed" as const
};

describe("planning bounds", () => {
  it("locks supported grades to classes 1 through 10", () => {
    expect(gradeLevels).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });

  it("accepts one or two distinct grades and rejects a duplicate second grade", () => {
    expect(planGenerationInputSchema.safeParse(validInput).success).toBe(true);
    expect(
      planGenerationInputSchema.safeParse({ ...validInput, additionalGrade: "7" }).success
    ).toBe(true);
    expect(
      planGenerationInputSchema.safeParse({ ...validInput, additionalGrade: "6" }).success
    ).toBe(false);
  });

  it("enforces 20–90 minutes and 1–100 learners", () => {
    expect(
      planGenerationInputSchema.safeParse({ ...validInput, durationMinutes: 19 }).success
    ).toBe(false);
    expect(
      planGenerationInputSchema.safeParse({ ...validInput, durationMinutes: 91 }).success
    ).toBe(false);
    expect(planGenerationInputSchema.safeParse({ ...validInput, classSize: 0 }).success).toBe(
      false
    );
    expect(planGenerationInputSchema.safeParse({ ...validInput, classSize: 101 }).success).toBe(
      false
    );
  });

  it("supports a validated custom subject", () => {
    expect(subjects).toContain("Custom");
    expect(
      planGenerationInputSchema.safeParse({
        ...validInput,
        subject: "Custom",
        customSubject: "Agricultural Science"
      }).success
    ).toBe(true);
    expect(planGenerationInputSchema.safeParse({ ...validInput, subject: "Custom" }).success).toBe(
      false
    );
  });
});
