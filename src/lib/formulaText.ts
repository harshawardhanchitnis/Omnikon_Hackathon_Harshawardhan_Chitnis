const symbolReplacements: Array<[RegExp, string]> = [
  [/\\propto\b/g, '∝'],
  [/\\Delta\b/g, 'Δ'],
  [/\\delta\b/g, 'δ'],
  [/\\Phi\b/g, 'Φ'],
  [/\\phi\b/g, 'φ'],
  [/\\rho\b/g, 'ρ'],
  [/\\theta\b/g, 'θ'],
  [/\\lambda\b/g, 'λ'],
  [/\\mu\b/g, 'μ'],
  [/\\alpha\b/g, 'α'],
  [/\\beta\b/g, 'β'],
  [/\\gamma\b/g, 'γ'],
  [/\\omega\b/g, 'ω'],
  [/\\Omega\b/g, 'Ω'],
  [/\\times\b/g, '×'],
  [/\\cdot\b/g, '·'],
  [/\\pm\b/g, '±'],
  [/\\leq\b/g, '≤'],
  [/\\geq\b/g, '≥'],
  [/\\neq\b/g, '≠'],
  [/\\approx\b/g, '≈'],
  [/\\rightarrow\b/g, '→'],
  [/\\leftarrow\b/g, '←'],
]

const superscriptMap: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  n: 'ⁿ',
}

function toSuperscript(
  value: string,
) {
  const converted = [...value]
    .map(
      (character) =>
        superscriptMap[
          character
        ] ?? character,
    )
    .join('')

  return converted
}

function replaceFractions(
  value: string,
) {
  let next = value
  const fraction =
    /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g

  for (let pass = 0; pass < 4; pass += 1) {
    const replaced = next.replace(
      fraction,
      (_match, numerator: string, denominator: string) =>
        `${numerator.trim()} / ${denominator.trim()}`,
    )

    if (replaced === next) {
      break
    }

    next = replaced
  }

  return next
}

export function formatFormulaText(
  value: string,
) {
  let next = replaceFractions(
    value,
  )

  for (const [pattern, replacement] of
    symbolReplacements) {
    next = next.replace(
      pattern,
      replacement,
    )
  }

  next = next
    .replace(
      /\^\{([0-9+\-n]+)\}/g,
      (_match, power: string) =>
        toSuperscript(power),
    )
    .replace(
      /\^([0-9+\-n])/g,
      (_match, power: string) =>
        toSuperscript(power),
    )
    .replace(
      /_\{([^{}]+)\}/g,
      (_match, subscript: string) =>
        `_${subscript.trim()}`,
    )
    .replace(/\\,/g, ' ')
    .replace(/\\;/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\([A-Za-z]+)/g, '$1')
    .replace(/Δ\s+([A-Za-zΦφρ])/g, 'Δ$1')
    .replace(/([ρΦφ])\s+([A-Za-z])/g, '$1$2')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return next
}
