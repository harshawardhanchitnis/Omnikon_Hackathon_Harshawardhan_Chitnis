import type { GeneratedPlan, GenerationInput } from "./lesson-schema.ts";

export function qualityScore(plan: GeneratedPlan, input: GenerationInput) {
  const allocated = plan.activities.reduce((sum, item) => sum + item.durationMinutes, 0);
  const checks = [
    plan.objectives.length >= 2,
    Math.abs(allocated - input.durationMinutes) <= 5,
    plan.activities.every((item) => item.offlineAlternative.length >= 5),
    plan.assessments.every((item) => item.objectiveIndexes.length > 0),
    plan.activities.every((item) =>
      item.materials.every(
        (material) =>
          input.availableMaterials.some(
            (available) => available.toLowerCase() === material.toLowerCase()
          ) || ["none", "notebook", "pencil"].includes(material.toLowerCase())
      )
    )
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
