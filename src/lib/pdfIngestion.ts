import { extractText, getDocumentProxy } from 'unpdf'

export type ClientExtractedPage = {
  pageNumber: number
  text: string
  readability: number
  verdict: 'readable' | 'empty' | 'corrupted'
}

export type ClientPdfExtraction = {
  totalPages: number
  pages: ClientExtractedPage[]
  readablePages: number
  usableLocally: boolean
  scannedFallbackEligible: boolean
}

export const PRODUCT_PDF_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  maxPages: 350,
  scannedMaxBytes: 12 * 1024 * 1024,
  scannedMaxPages: 48,
} as const

function cleanText(raw: string) {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function readability(text: string) {
  if (text.length < 120) return 0
  const chars = [...text]
  const suspicious = chars.filter((character) => {
    const code = character.codePointAt(0) ?? 0
    return (code >= 0xe000 && code <= 0xf8ff) || code === 0xfffd
  }).length
  const spaces = (text.match(/\s/g)?.length ?? 0) / Math.max(1, text.length)
  const ordinary = chars.filter((character) => {
    const code = character.codePointAt(0) ?? 0
    return (
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0x0900 && code <= 0x097f) ||
      character === '\n' ||
      character === '\t'
    )
  }).length
  const ordinaryRatio = ordinary / Math.max(1, chars.length)
  return Math.max(
    0,
    Math.min(1, (1 - suspicious / Math.max(1, chars.length) * 8) * ordinaryRatio * Math.min(1, spaces / 0.08)),
  )
}

function pdfOpenError(error: unknown) {
  const message = String(error instanceof Error ? error.message : error)
  if (/password|encrypted|encryption/i.test(message)) {
    return new Error('This PDF is password-protected. Remove the password and upload it again.')
  }
  return new Error('ChalkBox could not open this PDF. Check that the file is a valid, non-corrupted PDF.')
}

export async function extractPdfInBrowser(file: File): Promise<ClientPdfExtraction> {
  const lowerName = file.name.toLowerCase()
  if ((file.type && file.type !== 'application/pdf') || !lowerName.endsWith('.pdf')) {
    throw new Error('Upload a PDF file.')
  }
  if (file.size <= 0) {
    throw new Error('This PDF is empty.')
  }
  if (file.size > PRODUCT_PDF_LIMITS.maxBytes) {
    throw new Error('PDF is larger than the current 25 MB product limit.')
  }

  let totalPages = 0
  let rawPages: string[] = []
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const pdf = await getDocumentProxy(bytes)
    const extracted = await extractText(pdf, { mergePages: false })
    totalPages = extracted.totalPages
    rawPages = extracted.text as string[]
  } catch (error) {
    throw pdfOpenError(error)
  }

  if (totalPages <= 0) {
    throw new Error('ChalkBox could not find any pages in this PDF.')
  }
  if (totalPages > PRODUCT_PDF_LIMITS.maxPages) {
    throw new Error(
      `This PDF has ${totalPages} pages. The current product limit is ${PRODUCT_PDF_LIMITS.maxPages} pages per upload.`,
    )
  }

  const pages = Array.from({ length: totalPages }, (_, index) => {
    const cleaned = cleanText(rawPages[index] ?? '')
    const score = readability(cleaned)
    const verdict: ClientExtractedPage['verdict'] =
      cleaned.length < 120 ? 'empty' : score >= 0.55 ? 'readable' : 'corrupted'
    return {
      pageNumber: index + 1,
      text: cleaned,
      readability: Number(score.toFixed(3)),
      verdict,
    }
  })

  const readablePages = pages.filter((page) => page.verdict === 'readable').length
  const usableLocally = pages.length > 0 && readablePages / pages.length >= 0.9
  const scannedFallbackEligible =
    file.size <= PRODUCT_PDF_LIMITS.scannedMaxBytes &&
    totalPages <= PRODUCT_PDF_LIMITS.scannedMaxPages

  return {
    totalPages,
    pages,
    readablePages,
    usableLocally,
    scannedFallbackEligible,
  }
}
