import type { GeneratedPlan, GenerationInput } from "./lesson-schema.ts";

export function qualityScore(plan: GeneratedPlan, input: GenerationInput) {
  const allocated = plan.classroomBlocks.reduce((sum, item) => sum + item.durationMinutes, 0);
  const blockTypes = new Set(plan.classroomBlocks.map((item) => item.type));
  const checks = [
    plan.objectives.length >= 2,
    allocated === input.durationMinutes,
    plan.classroomBlocks.every((item) => item.resourceAlternative.length >= 5),
    plan.assessments.every((item) => item.objectiveIndexes.length > 0),
    plan.activities.every((item) =>
      item.materials.every(
        (material) =>
          input.availableMaterials.some(
            (available) => available.toLowerCase() === material.toLowerCase()
          ) || ["none", "notebook", "pencil"].includes(material.toLowerCase())
      )
    ),
    blockTypes.has("misconception"),
    blockTypes.has("quick-check") || blockTypes.has("exit-ticket"),
    blockTypes.has("visual")
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
