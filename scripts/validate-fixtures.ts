import { lessonPlanSchema } from "@chalkbox/contracts";
import { demoPlans } from "../src/data/demo-fixtures";

const failures = demoPlans.flatMap((plan) => {
  const result = lessonPlanSchema.safeParse(plan);
  return result.success ? [] : [{ id: plan.id, issues: result.error.issues }];
});

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`Validated ${demoPlans.length} ChalkBox demo plans.`);
