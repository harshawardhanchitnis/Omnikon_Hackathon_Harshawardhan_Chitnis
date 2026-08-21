import { describe, expect, it } from "vitest";
import { parseQuickBriefLocally } from "./quick-brief";

const defaults = {
  grade: "6" as const,
  subject: "Science" as const,
  topic: "Placeholder topic",
  durationMinutes: 45,
  language: "Bilingual English–Hindi" as const,
  board: "CBSE/NCERT" as const,
  classSize: 35,
  availableMaterials: ["Blackboard"],
  constraints: ["No projector"],
  learningLevel: "mixed" as const
};

describe("Quick Brief extraction review", () => {
  it("extracts bounded structured details without generating a lesson", () => {
    const result = parseQuickBriefLocally(
      "Create a 40-minute Class 6 science lesson on separation of substances using only a chalkboard and household materials. Include mixed-ability support.",
      defaults
    );
    expect(result).toMatchObject({
      grade: "6",
      subject: "Science",
      durationMinutes: 40,
      topic: "separation of substances",
      learningLevel: "mixed"
    });
    expect(result.availableMaterials).toContain("Blackboard");
  });

  it("rejects an extracted duration outside the canonical bounds", () => {
    expect(() =>
      parseQuickBriefLocally("Create a 120-minute Class 6 science lesson on water.", defaults)
    ).toThrow(/bounds/);
  });
});
