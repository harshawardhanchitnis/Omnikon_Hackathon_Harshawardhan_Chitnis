import { Font, Text, type TextProps } from "@react-pdf/renderer";

Font.register({
  family: "NotoSansLatin",
  fonts: [
    { src: "/fonts/NotoSansLatin-Regular.woff", fontWeight: 400 },
    { src: "/fonts/NotoSansLatin-SemiBold.woff", fontWeight: 600 }
  ]
});

Font.register({
  family: "NotoSansDevanagari",
  fonts: [
    { src: "/fonts/NotoSansDevanagari-Regular.woff", fontWeight: 400 },
    { src: "/fonts/NotoSansDevanagari-SemiBold.woff", fontWeight: 600 }
  ]
});

type PdfTextProps = Omit<TextProps, "children"> & { children: string };

function isDevanagari(character: string) {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x0900 && codePoint <= 0x097f) || (codePoint >= 0xa8e0 && codePoint <= 0xa8ff)
  );
}

function mixedTextRuns(value: string) {
  const runs: Array<{ text: string; devanagari: boolean }> = [];
  for (const character of value) {
    const devanagari = isDevanagari(character);
    const latest = runs.at(-1);
    if (latest?.devanagari === devanagari) latest.text += character;
    else runs.push({ text: character, devanagari });
  }
  return runs;
}

export function PdfText({ children, style, ...props }: PdfTextProps) {
  const runs = mixedTextRuns(children);
  return (
    <Text {...props} style={[{ fontFamily: "NotoSansLatin" }, style]}>
      {runs.map((run, index) => (
        <Text
          key={`${index}-${run.text.slice(0, 8)}`}
          style={{ fontFamily: run.devanagari ? "NotoSansDevanagari" : "NotoSansLatin" }}
        >
          {run.text}
        </Text>
      ))}
    </Text>
  );
}
