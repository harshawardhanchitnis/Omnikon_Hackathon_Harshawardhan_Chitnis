/**
 * Local PDF text extraction, with corrupted-text-layer detection.
 *
 * Two failure modes have to be told apart:
 *
 *   1. A page with no text layer at all (a scan). Easy: almost no characters.
 *   2. A page whose text layer is present but MOJIBAKE. This is the dangerous
 *      one. A broken font CMap maps glyphs to private-use or arbitrary
 *      codepoints, so the page yields thousands of characters that satisfy a
 *      length check and are unreadable to a human.
 *
 * A length threshold alone lets case 2 into the corpus, where it gets chunked,
 * embedded and retrieved as though it were the chapter. So readability is
 * scored, never assumed.
 *
 *   pnpm add unpdf
 */
import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

export type PageVerdict = "readable" | "empty" | "corrupted";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  verdict: PageVerdict;
  readability: number;
  reasons: string[];
}

export interface ExtractionResult {
  fileName: string;
  totalPages: number;
  pages: ExtractedPage[];
  readablePages: number[];
  emptyPages: number[];
  corruptedPages: number[];
  usableLocally: boolean;
}

const MIN_CHARS_FOR_CONTENT = 120;
const READABILITY_THRESHOLD = 0.55;

const COMMON_WORDS = new Set([
  "the","a","of","and","is","to","in","it","that","as","are","for","on","we",
  "be","this","with","can","or","by","an","if","from","its","which","not","at",
]);

export function cleanPageText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/([a-z,;:])\n([a-z(])/g, "$1 $2")
    .replace(/^\s*\d{1,3}\s*$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function scoreReadability(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  if (text.length === 0) return { score: 0, reasons: ["no text"] };

  const chars = [...text];
  const total = chars.length;

  const suspicious = chars.filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return (cp >= 0xe000 && cp <= 0xf8ff) || cp === 0xfffd || (cp >= 0xfff0 && cp <= 0xffff);
  }).length;
  const suspiciousRatio = suspicious / total;
  if (suspiciousRatio > 0.02) {
    reasons.push(`${Math.round(suspiciousRatio * 100)}% private-use or replacement characters`);
  }

  const expected = chars.filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return (
      (cp >= 0x20 && cp <= 0x7e) ||
      (cp >= 0x0900 && cp <= 0x097f) ||
      c === "\n" || c === "\t" || c === "\u00b0" ||
      c === "\u2013" || c === "\u2014" ||
      c === "\u2018" || c === "\u2019" || c === "\u201c" || c === "\u201d"
    );
  }).length;
  const expectedRatio = expected / total;
  if (expectedRatio < 0.85) {
    reasons.push(`only ${Math.round(expectedRatio * 100)}% ordinary characters`);
  }

  const devanagari = chars.filter((c) => {
    const cp = c.codePointAt(0) ?? 0;
    return cp >= 0x0900 && cp <= 0x097f;
  }).length;
  const latin = chars.filter((c) => /[A-Za-z]/.test(c));

  let vowelRatio = 1;
  if (latin.length > 40 && devanagari < latin.length) {
    const vowels = latin.filter((c) => "aeiouAEIOU".includes(c)).length;
    vowelRatio = vowels / latin.length;
    if (vowelRatio < 0.22) {
      reasons.push(`vowel density ${Math.round(vowelRatio * 100)}% (prose is about 38%)`);
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  let wordShape = 1;
  if (words.length > 20) {
    const absurdlyLong = words.filter((w) => w.length > 28).length / words.length;
    const common =
      words.filter((w) => COMMON_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, ""))).length /
      words.length;
    wordShape =
      Math.max(0, 1 - absurdlyLong * 3) *
      (devanagari > 50 ? 1 : Math.min(1, common / 0.06));
    if (common < 0.02 && devanagari < 50) reasons.push("almost no common English words");
    if (absurdlyLong > 0.15) {
      reasons.push(`${Math.round(absurdlyLong * 100)}% of tokens are absurdly long`);
    }
  }

  const spaceRatio = (text.match(/\s/g)?.length ?? 0) / total;
  if (spaceRatio < 0.08) reasons.push("almost no whitespace");

  const score = Math.max(
    0,
    Math.min(
      1,
      (1 - suspiciousRatio * 6) *
        Math.min(1, expectedRatio / 0.9) *
        (vowelRatio < 0.22 ? vowelRatio / 0.22 : 1) *
        wordShape *
        (spaceRatio < 0.08 ? spaceRatio / 0.08 : 1),
    ),
  );

  return { score, reasons };
}

function judge(text: string): Pick<ExtractedPage, "verdict" | "readability" | "reasons"> {
  if (text.length < MIN_CHARS_FOR_CONTENT) {
    return { verdict: "empty", readability: 0, reasons: [`only ${text.length} characters`] };
  }
  const { score, reasons } = scoreReadability(text);
  return {
    verdict: score >= READABILITY_THRESHOLD ? "readable" : "corrupted",
    readability: Number(score.toFixed(3)),
    reasons,
  };
}

function summarise(fileName: string, totalPages: number, pages: ExtractedPage[]): ExtractionResult {
  const readablePages = pages.filter((p) => p.verdict === "readable").map((p) => p.pageNumber);
  return {
    fileName,
    totalPages,
    pages,
    readablePages,
    emptyPages: pages.filter((p) => p.verdict === "empty").map((p) => p.pageNumber),
    corruptedPages: pages.filter((p) => p.verdict === "corrupted").map((p) => p.pageNumber),
    // Usable only if nearly all of it survived. A partly corrupted chapter is
    // worse than none, because the gaps become invisible once chunked.
    usableLocally: pages.length > 0 && readablePages.length / pages.length >= 0.9,
  };
}

export async function extractPdf(path: string): Promise<ExtractionResult> {
  const bytes = new Uint8Array(await readFile(path));
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const pages: ExtractedPage[] = (text as string[]).map((raw, index) => {
    const cleaned = cleanPageText(raw);
    return { pageNumber: index + 1, text: cleaned, ...judge(cleaned) };
  });

  return summarise(path.split(/[\\/]/).pop() ?? path, totalPages, pages);
}

export async function extractPdfRange(
  path: string,
  firstPage: number,
  lastPage: number,
): Promise<ExtractionResult> {
  const all = await extractPdf(path);
  const pages = all.pages.filter(
    (p) => p.pageNumber >= firstPage && p.pageNumber <= lastPage,
  );
  return summarise(all.fileName, all.totalPages, pages);
}
