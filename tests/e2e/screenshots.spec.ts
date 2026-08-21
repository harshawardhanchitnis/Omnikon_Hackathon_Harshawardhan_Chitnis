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
  await page.screenshot({ path: path.join(output, "02-dashboard.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/preview");
  await expect(
    page.getByRole("heading", { name: /photosynthesis: how leaves make food/i })
  ).toBeVisible();
  await page.screenshot({ path: path.join(output, "03-plan-preview.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/edit");
  await page.getByRole("button", { name: /teaching engine/i }).click();
  await expect(page.getByRole("heading", { name: /classroom teaching engine/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "04-teaching-engine.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/teach");
  await expect(page.getByText(/teach · block 1\/9/i)).toBeVisible();
  await page.screenshot({ path: path.join(output, "05-teach-mode.png"), fullPage: true });

  await page.goto("/plans/plan_photosynthesis_flagship/present");
  await expect(page.getByText(/live learner view/i)).toBeVisible();
  await page.screenshot({ path: path.join(output, "06-present-mode.png"), fullPage: true });

  await page.goto("/assessments");
  await expect(page.getByRole("heading", { name: /assessment bank/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "07-assessment-bank.png"), fullPage: true });

  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: /what your planning is changing/i })
  ).toBeVisible();
  await page.screenshot({ path: path.join(output, "08-analytics.png"), fullPage: true });
});
