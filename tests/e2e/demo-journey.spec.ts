import { expect, test } from "@playwright/test";

test("judge can complete the prepared lesson lifecycle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a strong lesson plan/i })).toBeVisible();
  await page.getByRole("link", { name: /explore the prepared demo/i }).click();
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();

  await page
    .getByRole("link", { name: /create lesson plan/i })
    .first()
    .click();
  await page.getByRole("button", { name: /use prepared water-cycle example/i }).click();
  await expect(page.getByText("Prepared demo content").first()).toBeVisible();
  await expect(page.locator('input[value="The Water Cycle Around Us"]')).toBeVisible();

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("heading", { name: "The Water Cycle Around Us" })).toBeVisible();
  await page.getByRole("link", { name: /teach mode/i }).click();
  await expect(page.getByText(/teach mode · step 1/i)).toBeVisible();

  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: /next step/i }).click();
  }
  await page.getByRole("button", { name: /finish & reflect/i }).click();
  await page
    .getByLabel("What worked well?")
    .fill("Learners connected the demonstration to a familiar monsoon observation.");
  await page
    .getByLabel("What will you change next time?")
    .fill("I will leave two more minutes for the final conservation explanation.");
  await page
    .getByLabel("Your next teaching action")
    .fill("Revisit condensation with a quick cold-cup prompt tomorrow.");
  await page.getByRole("button", { name: /save & view insights/i }).click();
  await expect(
    page.getByRole("heading", { name: /what your planning is changing/i })
  ).toBeVisible();
});

test("mobile demo exposes the primary navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only navigation assertion");
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Insights" }).last().click();
  await expect(
    page.getByRole("heading", { name: /what your planning is changing/i })
  ).toBeVisible();
});
