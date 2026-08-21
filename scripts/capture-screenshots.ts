import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.CHALKBOX_SCREENSHOT_URL ?? "http://127.0.0.1:4173";
const output = path.resolve("docs/screenshots");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1
});

await page.goto(baseUrl);
await page.screenshot({ path: path.join(output, "01-landing.png"), fullPage: true });
await page.goto(`${baseUrl}/demo`);
await page.getByRole("heading", { name: /good morning, meera/i }).waitFor();
await page.goto(`${baseUrl}/plans/new`);
await page.getByRole("heading", { name: /start with your classroom/i }).waitFor();
await page.screenshot({ path: path.join(output, "02-quick-brief.png"), fullPage: true });

await page.goto(`${baseUrl}/plans/plan_photosynthesis_flagship/edit`);
await page.getByLabel("Lesson plan title").waitFor();
await page.screenshot({ path: path.join(output, "03-lesson-editor.png"), fullPage: true });

await page.goto(`${baseUrl}/plans/plan_photosynthesis_flagship/teach`);
await page.getByText(/teach · block 1\/9/i).waitFor();
await page.screenshot({ path: path.join(output, "04-classroom-mode.png"), fullPage: true });

await page.goto(`${baseUrl}/plans/plan_photosynthesis_flagship/present`);
await page.getByText(/live learner view/i).waitFor();
await page.screenshot({ path: path.join(output, "05-present-mode.png"), fullPage: true });

await page.goto(`${baseUrl}/plans/plan_photosynthesis_flagship/teach`);
await page.getByRole("button", { name: /capture class pulse/i }).click();
await page.getByRole("heading", { name: /^quick check$/i }).waitFor();
await page.screenshot({ path: path.join(output, "06-quick-check.png"), fullPage: true });

await page.goto(`${baseUrl}/assessments`);
await page.getByRole("heading", { name: /assessment bank/i }).waitFor();
await page.screenshot({ path: path.join(output, "07-assessment-bank.png"), fullPage: true });

const mobilePage = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1
});
await mobilePage.goto(`${baseUrl}/demo`);
await mobilePage.getByRole("heading", { name: /good morning, meera/i }).waitFor();
await mobilePage.goto(`${baseUrl}/plans/plan_photosynthesis_flagship/teach`);
await mobilePage.getByText(/teach · block 1\/9/i).waitFor();
await mobilePage.screenshot({ path: path.join(output, "08-mobile-classroom.png"), fullPage: true });

await browser.close();
console.log(`Screenshots written to ${output}`);
