/**
 * Textbook extraction audit.
 *
 * Reads every PDF locally and reports which pages are usable without touching
 * the Gemini API. Consumes ZERO quota. Run this before changing the ingestion
 * pipeline, so the fallback strategy is based on what the files actually
 * contain rather than on an assumption.
 *
 *   pnpm exec tsx scripts/audit-textbooks.ts
 *   pnpm exec tsx scripts/audit-textbooks.ts --dir data/textbooks --sample
 *
 *   --sample   print the first readable and first corrupted page, so you can
 *              eyeball whether the verdict is right
 *   --json     machine-readable output for the ingestion script to consume
 *   --dump     write full page text to textbook-audit-samples.txt, so a
 *              corrupted layer can be read in an editor instead of being
 *              mangled by the terminal's encoding
 *   --ascii    plain bar characters, for terminals without good UTF-8 support
 */
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractPdf, type ExtractionResult } from "./extract-pdf-text";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const DIR = value("dir") ?? "data/textbooks";

function bar(readable: number, total: number): string {
  const width = 24;
  const filled = total === 0 ? 0 : Math.round((readable / total) * width);
  const [on, off] = flag("ascii") ? ["#", "."] : ["\u2588", "\u2591"];
  return on.repeat(filled) + off.repeat(width - filled);
}

function ranges(pages: number[]): string {
  if (pages.length === 0) return "none";
  const out: string[] = [];
  let start = pages[0];
  let prev = pages[0];
  for (const page of pages.slice(1)) {
    if (page === prev + 1) { prev = page; continue; }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = page;
    prev = page;
  }
  out.push(start === prev ? `${start}` : `${start}-${prev}`);
  return out.join(", ");
}

async function main() {
  let files: string[];
  try {
    files = (await readdir(DIR)).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();
  } catch {
    console.error(`Could not read the directory "${DIR}". Pass --dir <path>.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`No PDFs found in "${DIR}".`);
    process.exit(1);
  }

  console.log("");
  console.log("  ChalkBox textbook extraction audit");
  console.log("  No API calls. No quota used.");
  console.log("");

  const results: ExtractionResult[] = [];

  for (const file of files) {
    const result = await extractPdf(join(DIR, file));
    results.push(result);

    const readable = result.readablePages.length;
    const pct = Math.round((readable / result.totalPages) * 100);

    console.log(`  ${result.fileName}`);
    console.log(`    ${bar(readable, result.totalPages)}  ${readable}/${result.totalPages} pages readable (${pct}%)`);

    if (result.corruptedPages.length > 0) {
      console.log(`    corrupted text layer : ${ranges(result.corruptedPages)}`);
      const worst = result.pages
        .filter((p) => p.verdict === "corrupted")
        .sort((a, b) => a.readability - b.readability)[0];
      if (worst) console.log(`    why                  : ${worst.reasons.join("; ")}`);
    }
    if (result.emptyPages.length > 0) {
      console.log(`    no text layer        : ${ranges(result.emptyPages)}`);
    }

    console.log(
      result.usableLocally
        ? "    → extract locally. Zero Gemini calls needed."
        : `    → needs model fallback for ${result.corruptedPages.length + result.emptyPages.length} page(s).`,
    );

    if (flag("sample")) {
      // Two of each. One example is not enough to judge a threshold, and a
      // single unlucky page (all equations, all table) misleads either way.
      const show = (verdict: string, limit: number, chars: number) =>
        result.pages
          .filter((p) => p.verdict === verdict)
          .slice(0, limit)
          .forEach((p) => {
            console.log(`\n    ${verdict} p${p.pageNumber} (score ${p.readability}):`);
            console.log(`      ${p.text.slice(0, chars).replace(/\n/g, "\n      ")}`);
          });
      show("readable", 2, 240);
      show("corrupted", 2, 160);
    }
    console.log("");
  }

  const totalPages = results.reduce((n, r) => n + r.totalPages, 0);
  const totalReadable = results.reduce((n, r) => n + r.readablePages.length, 0);
  const fallbackPages = totalPages - totalReadable;

  console.log("  ────────────────────────────────────────────");
  console.log(`  ${totalReadable}/${totalPages} pages readable locally`);
  console.log(`  ${fallbackPages} page(s) would need the model`);
  console.log("");
  if (fallbackPages === 0) {
    console.log("  Ingestion can run with zero transcription calls.");
  } else {
    // Deliberately does NOT recommend a call count. Batching several corrupted
    // pages into one request is usually far cheaper than one call per page,
    // and which grouping is right depends on how these pages cluster. Decide
    // that after reading the ranges above, not from this summary.
    console.log(`  ${fallbackPages} page(s) cannot be read locally.`);
    console.log("  Group them before deciding how many requests that costs.");
  }
  console.log("");

  if (flag("dump")) {
    const path = "textbook-audit-samples.txt";
    const lines: string[] = [];
    for (const result of results) {
      lines.push(`=== ${result.fileName} ===`, "");
      for (const page of result.pages) {
        lines.push(`--- page ${page.pageNumber} | ${page.verdict} | score ${page.readability} ---`);
        if (page.reasons.length) lines.push(`reasons: ${page.reasons.join("; ")}`);
        lines.push(page.text || "(no text)", "");
      }
    }
    await writeFile(path, lines.join("\n"), "utf8");
    console.log(`  Wrote ${path} — open it in an editor to check the verdicts.`);
    console.log("");
  }

  if (flag("json")) {
    const path = "textbook-audit.json";
    await writeFile(
      path,
      JSON.stringify(
        results.map((r) => ({
          fileName: r.fileName,
          totalPages: r.totalPages,
          readablePages: r.readablePages,
          corruptedPages: r.corruptedPages,
          emptyPages: r.emptyPages,
          usableLocally: r.usableLocally,
        })),
        null,
        2,
      ),
      "utf8",
    );
    console.log(`  Wrote ${path}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
