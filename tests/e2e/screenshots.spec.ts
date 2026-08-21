import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("capture the canonical judge evidence set", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop evidence is captured once.");
  const output = path.resolve("docs/screenshots");
  await mkdir(output, { recursive: true });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a strong lesson plan/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "01-landing.png"), fullPage: true });

  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  await page.goto("/plans/new");
  await expect(page.getByRole("heading", { name: /create a lesson/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "02-quick-brief.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/edit");
  await expect(page.getByLabel("Lesson plan title")).toBeVisible();
  await page.screenshot({ path: path.join(output, "03-lesson-editor.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/teach");
  await expect(page.getByText(/teach · block 1\/9/i)).toBeVisible();
  await page.screenshot({ path: path.join(output, "04-classroom-mode.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/present");
  await expect(page.getByText(/live learner view/i)).toBeVisible();
  await page.screenshot({ path: path.join(output, "05-present-mode.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/teach");
  await page.getByRole("button", { name: /capture class pulse/i }).click();
  await expect(page.getByRole("heading", { name: /^quick check$/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "06-quick-check.png"), fullPage: true });

  await page.goto("/assessments");
  await expect(page.getByRole("heading", { name: /assessment bank/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "07-assessment-bank.png"), fullPage: true });
});

test("capture the mobile classroom evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile evidence is captured once.");
  const output = path.resolve("docs/screenshots");
  await mkdir(output, { recursive: true });
  await page.goto("/demo");
  await page.goto("/plans/plan_photosynthesis_flagship/teach");
  await expect(page.getByText(/teach · block 1\/9/i)).toBeVisible();
  await page.screenshot({ path: path.join(output, "08-mobile-classroom.png"), fullPage: true });
});
