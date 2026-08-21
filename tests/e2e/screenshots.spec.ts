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

  await page.goto("/plans/plan_water_cycle/preview");
  await expect(page.getByRole("heading", { name: /the water cycle around us/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "03-plan-preview.png"), fullPage: true });

  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: /what your planning is changing/i })
  ).toBeVisible();
  await page.screenshot({ path: path.join(output, "04-analytics.png"), fullPage: true });

  await page.goto("/plans/new");
  await expect(page.getByRole("heading", { name: /start with your classroom/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "05-quick-brief.png"), fullPage: true });

  await page.goto("/assessments");
  await expect(page.getByRole("heading", { name: /assessment bank/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "06-assessment-bank.png"), fullPage: true });

  await page.goto("/plans/plan_water_cycle/teach");
  await expect(page.getByText(/teach mode · step 1/i)).toBeVisible();
  await page.screenshot({ path: path.join(output, "07-teach-mode.png"), fullPage: true });

  await page.goto("/community");
  await expect(page.getByRole("heading", { name: /community lessons/i })).toBeVisible();
  await page.screenshot({ path: path.join(output, "08-community.png"), fullPage: true });
});
