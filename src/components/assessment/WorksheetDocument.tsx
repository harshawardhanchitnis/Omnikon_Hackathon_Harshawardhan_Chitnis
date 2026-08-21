import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Worksheet } from "@chalkbox/contracts";
import { PdfText } from "@/components/pdf/PdfText";

const styles = StyleSheet.create({
  page: {
    padding: 38,
    fontFamily: "NotoSansLatin",
    fontSize: 10,
    color: "#17211f",
    lineHeight: 1.55
  },
  brand: { color: "#176252", fontSize: 9, fontWeight: 600, letterSpacing: 1.1 },
  title: { marginTop: 10, fontSize: 21, fontWeight: 600 },
  meta: { marginTop: 7, color: "#596863" },
  line: { marginTop: 18, borderBottom: "1 solid #cfd8d2" },
  instructions: { marginTop: 14, padding: 9, borderRadius: 5, backgroundColor: "#f1f6f2" },
  question: { marginTop: 18 },
  questionRow: { flexDirection: "row", gap: 7 },
  number: { width: 20, fontWeight: 600 },
  prompt: { flex: 1, fontWeight: 600 },
  marks: { width: 42, color: "#596863", textAlign: "right" },
  option: { marginTop: 5, marginLeft: 27 },
  answerSpace: { marginTop: 10, marginLeft: 27, borderBottom: "1 solid #dfe5df", height: 18 },
  answer: { marginTop: 8, marginLeft: 27, padding: 7, borderRadius: 4, backgroundColor: "#fff3c9" },
  footer: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#66736f"
  }
});

export function WorksheetDocument({
  worksheet,
  answers = false
}: {
  worksheet: Worksheet;
  answers?: boolean;
}) {
  const totalMarks = worksheet.items.reduce((sum, item) => sum + item.marks, 0);
  return (
    <Document title={`${worksheet.title} — ChalkBox`} author="Team HarshLabs">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>
          CHALKBOX · {answers ? "TEACHER ANSWER KEY" : "LEARNER WORKSHEET"}
        </Text>
        <PdfText style={styles.title}>{worksheet.title}</PdfText>
        <PdfText
          style={styles.meta}
        >{`Class ${worksheet.grade} · ${worksheet.subject} · ${worksheet.chapter} · Total ${totalMarks} marks`}</PdfText>
        {!answers && (
          <>
            <View style={styles.line} />
            <PdfText style={styles.meta}>
              Name / समूह: ____________________________ Date: _______________
            </PdfText>
          </>
        )}
        <PdfText style={styles.instructions}>{worksheet.instructions}</PdfText>
        {worksheet.items
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item, index) => (
            <View key={item.id} style={styles.question} wrap={false}>
              <View style={styles.questionRow}>
                <Text style={styles.number}>{index + 1}.</Text>
                <PdfText style={styles.prompt}>{item.questionSnapshot.prompt}</PdfText>
                <Text style={styles.marks}>[{item.marks}]</Text>
              </View>
              {item.questionSnapshot.options?.map((option, optionIndex) => (
                <PdfText
                  key={option}
                  style={styles.option}
                >{`${String.fromCharCode(65 + optionIndex)}. ${option}`}</PdfText>
              ))}
              {answers ? (
                <PdfText
                  style={styles.answer}
                >{`Answer: ${item.questionSnapshot.answer}${item.questionSnapshot.explanation ? `\nWhy: ${item.questionSnapshot.explanation}` : ""}`}</PdfText>
              ) : (
                <View style={styles.answerSpace} />
              )}
            </View>
          ))}
        <View style={styles.footer} fixed>
          <Text>No student account or personal data required.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
