import type { InstructionalBlock } from "@chalkbox/contracts";
import { describe, expect, it } from "vitest";
import { photosynthesisDemoPlan } from "@/data/photosynthesis-demo";
import {
  analyseQuickCheck,
  generateSecureShareToken,
  hashShareToken,
  rebalanceBlockDurations,
  toLearnerClassroomBlock,
  totalBlockMinutes,
  validateMultigradeSchedule
} from "./classroom-engine";

describe("Classroom Teaching Engine", () => {
  it("keeps flagship timing exact and repairs a changed target deterministically", () => {
    expect(totalBlockMinutes(photosynthesisDemoPlan.classroomBlocks!)).toBe(40);
    const fitted = rebalanceBlockDurations(photosynthesisDemoPlan.classroomBlocks!, 45);
    expect(totalBlockMinutes(fitted)).toBe(45);
    expect(fitted.every((block) => block.durationMinutes >= 1)).toBe(true);
  });

  it("projects only learner-safe fields and reveals content progressively", () => {
    const source = photosynthesisDemoPlan.classroomBlocks!.find(
      (block) => block.type === "misconception"
    )!;
    const revealId = source.revealStages[0]!.id;
    const learner = toLearnerClassroomBlock(source, [revealId]);
    expect(learner.revealedContent).toContain(
      "Roots take in water and minerals. Leaves make food."
    );
    expect(learner).not.toHaveProperty("teacherCue");
    expect(learner).not.toHaveProperty("teacherResponse");
    expect(learner).not.toHaveProperty("correctiveExplanation");
  });

  it("turns anonymous response counts into a misconception signal and next action", () => {
    const block = photosynthesisDemoPlan.classroomBlocks!.find(
      (item) => item.type === "quick-check"
    );
    expect(block?.type).toBe("quick-check");
    if (block?.type !== "quick-check") throw new Error("Flagship quick check missing");
    const analysis = analyseQuickCheck({ A: 7, B: 20, C: 10, D: 5 }, block);
    expect(analysis.totalResponses).toBe(42);
    expect(analysis.correctPercent).toBeGreaterThan(40);
    expect(analysis.misconceptionSignal).toMatch(/selected/i);
    expect(analysis.suggestedAction.length).toBeGreaterThan(10);
  });

  it("detects an impossible multigrade attention assignment", () => {
    const source = structuredClone(photosynthesisDemoPlan.classroomBlocks![0]!);
    const invalid = {
      ...source,
      type: "grade-specific",
      gradeTarget: {
        grades: ["6", "7"],
        label: "Two grades",
        teacherAttentionGrade: "6",
        independentGrade: "6"
      },
      teacherExplanation: "Teach one group while the other completes an independent task."
    } as InstructionalBlock;
    expect(validateMultigradeSchedule([invalid], ["6", "7"])).not.toHaveLength(0);
  });

  it("creates a high-entropy token and a stable server-compatible hash", async () => {
    const first = generateSecureShareToken();
    const second = generateSecureShareToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(await hashShareToken(first)).toBe(await hashShareToken(first));
    expect(await hashShareToken(first)).not.toContain("=");
  });
});
