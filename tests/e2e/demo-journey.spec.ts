import { expect, test } from "@playwright/test";

test("judge can complete the flagship classroom-engine lifecycle", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a strong lesson plan/i })).toBeVisible();
  await page.getByRole("link", { name: /explore the prepared demo/i }).click();
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();

  await page.goto("/plans/plan_photosynthesis_flagship/preview");
  await expect(
    page.getByRole("heading", { name: /photosynthesis: how leaves make food/i })
  ).toBeVisible();
  await expect(page.getByText(/9 structured blocks/i)).toBeVisible();
  await page.getByRole("link", { name: /teach mode/i }).click();
  await expect(page.getByText(/teach · block 1\/9/i)).toBeVisible();

  await page.getByRole("button", { name: /one final prediction/i }).click();
  await expect(page.getByText(/teach · block 9\/9/i)).toBeVisible();
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

test("teacher can record an anonymous Quick Check 2.0 signal", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await page.goto("/plans/plan_photosynthesis_flagship/teach");
  await expect(page.getByText(/quick check 2\.0/i)).toBeVisible();
  await page.getByRole("button", { name: /capture class pulse/i }).click();
  await page.getByRole("button", { name: /increase secure/i }).click({ clickCount: 3 });
  await page.getByRole("button", { name: /increase developing/i }).click();
  await page.getByRole("button", { name: /save aggregate check/i }).click();
  await expect(page.getByText(/1 check saved/i)).toBeVisible();
});

test("Present mode receives only learner-safe content", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await page.goto("/plans/plan_photosynthesis_flagship/teach");
  await expect(page.getByText(/teach · block 1\/9/i)).toBeVisible();
  await page.goto("/plans/plan_photosynthesis_flagship/present");
  await expect(page.getByText(/live learner view · teacher notes excluded/i)).toBeVisible();
  await expect(page.getByText(/where does a plant's food come from/i).first()).toBeVisible();
  await expect(page.getByText(/private teaching note/i)).toHaveCount(0);
  await expect(page.getByText(/teacher cue/i)).toHaveCount(0);
});

test("mobile demo exposes the primary navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only navigation assertion");
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Assessments" }).last().click();
  await expect(page.getByRole("heading", { name: /assessment bank/i })).toBeVisible();
});

test("judge can build a worksheet from provenance-labelled questions", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await page.goto("/assessments");
  await expect(page.getByRole("heading", { name: /assessment bank/i })).toBeVisible();
  await page
    .getByRole("button", { name: /^worksheet$/i })
    .first()
    .click();
  await page.getByRole("button", { name: /worksheet tray · 1/i }).click();
  await expect(page.getByRole("heading", { name: /worksheet builder/i })).toBeVisible();
  await expect(page.getByText(/no sign-in, named record/i)).toBeVisible();
});

test("judge can inspect and adapt a moderated community snapshot", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: /community lessons/i })).toBeVisible();
  await page
    .getByRole("link", { name: /inspect/i })
    .first()
    .click();
  await expect(page.getByText(/immutable and safe/i)).toBeVisible();
  await page.getByRole("button", { name: /adapt for my class/i }).click();
  await expect(page.getByText(/community-clone|saved on this device/i).first()).toBeVisible();
});
