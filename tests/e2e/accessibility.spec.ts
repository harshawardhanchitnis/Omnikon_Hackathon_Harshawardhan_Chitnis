import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page has no automatically detectable serious accessibility issues", async ({
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a strong lesson plan/i })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
});

test("teacher dashboard has no automatically detectable serious accessibility issues", async ({
  page
}) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /good morning, meera/i })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
});
