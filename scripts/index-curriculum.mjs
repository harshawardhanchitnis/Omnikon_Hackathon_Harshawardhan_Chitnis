import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const adminAccessToken = process.env.SUPABASE_ADMIN_ACCESS_TOKEN;

if (!supabaseUrl || !publishableKey || !adminAccessToken) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and a short-lived SUPABASE_ADMIN_ACCESS_TOKEN."
  );
}

const sourcePaths = process.argv[2]
  ? [path.resolve(process.argv[2])]
  : [
      path.resolve("data/curriculum/chalkbox-original.json"),
      path.resolve("data/curriculum/ncert-class-8-science-derived.json")
    ];
const entries = [];
for (const sourcePath of sourcePaths) {
  const payload = JSON.parse(await readFile(sourcePath, "utf8"));
  if (!Array.isArray(payload.sources) || payload.sources.length === 0) {
    throw new Error(`${sourcePath}: curriculum bundle must contain a non-empty sources array.`);
  }
  entries.push(...payload.sources);
}

for (const entry of entries) {
  const response = await fetch(`${supabaseUrl}/functions/v1/index-curriculum`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
      apikey: publishableKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(entry)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${entry.source?.title ?? "Source"}: ${result.error ?? response.statusText}`);
  }
  process.stdout.write(
    `${entry.source.title}: ${result.indexedChunks} chunks indexed with attribution.\n`
  );
}
