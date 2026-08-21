import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = [
  "data/curriculum/chalkbox-original.json",
  "data/curriculum/ncert-class-8-science-derived.json"
];
let sources = 0;
let chunks = 0;
for (const path of paths) {
  const text = await readFile(path, "utf8");
  const bundle = JSON.parse(text);
  if (!Array.isArray(bundle.sources) || bundle.sources.length === 0)
    throw new Error(`${path}: sources are required`);
  for (const entry of bundle.sources) {
    if (!entry.source?.title || !entry.source?.sourceUrl || !entry.source?.attribution)
      throw new Error(`${path}: incomplete source provenance`);
    if (!Array.isArray(entry.chunks) || entry.chunks.length < 1 || entry.chunks.length > 30)
      throw new Error(`${path}: each source needs 1–30 chunks`);
    for (const chunk of entry.chunks) {
      if (
        typeof chunk.content !== "string" ||
        chunk.content.length < 20 ||
        chunk.content.length > 4000
      )
        throw new Error(`${path}: invalid chunk length`);
    }
    sources += 1;
    chunks += entry.chunks.length;
  }
  process.stdout.write(
    `${path}: ${createHash("sha256").update(text).digest("hex").slice(0, 12)} verified\n`
  );
}
process.stdout.write(
  `Validated ${sources} attributed sources and ${chunks} original curriculum chunks.\n`
);
