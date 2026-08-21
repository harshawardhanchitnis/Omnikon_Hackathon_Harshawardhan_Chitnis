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
await page.screenshot({ path: path.join(output, "02-dashboard.png"), fullPage: true });
await page.goto(`${baseUrl}/plans/plan_water_cycle/preview`);
await page.getByRole("heading", { name: /the water cycle around us/i }).waitFor();
await page.screenshot({ path: path.join(output, "03-plan-preview.png"), fullPage: true });
await page.goto(`${baseUrl}/analytics`);
await page.getByRole("heading", { name: /what your planning is changing/i }).waitFor();
await page.screenshot({ path: path.join(output, "04-analytics.png"), fullPage: true });

await browser.close();
console.log(`Screenshots written to ${output}`);
