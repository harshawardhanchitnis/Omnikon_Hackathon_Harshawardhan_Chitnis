import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { LessonPlan } from "@chalkbox/contracts";
import { PdfText } from "@/components/pdf/PdfText";

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: "NotoSansLatin",
    fontSize: 9,
    color: "#17211f",
    lineHeight: 1.45
  },
  brand: {
    color: "#1f6b5c",
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: { marginTop: 10, fontSize: 22, fontWeight: 600, lineHeight: 1.15 },
  meta: { marginTop: 8, flexDirection: "row", gap: 12, color: "#45534f" },
  section: { marginTop: 18 },
  sectionTitle: { marginBottom: 7, color: "#1f6b5c", fontSize: 12, fontWeight: 600 },
  objective: { marginBottom: 4 },
  activity: { marginBottom: 9, border: "1 solid #dfe5df", borderRadius: 6, padding: 8 },
  activityHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  activityTitle: { fontWeight: 600 },
  tiny: { fontSize: 7.5, color: "#64716d" },
  line: { marginBottom: 3 },
  note: { marginTop: 5, padding: 6, backgroundColor: "#eff8f5", borderRadius: 4 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#6f7d79",
    fontSize: 7
  }
});

export function LessonPlanDocument({ plan }: { plan: LessonPlan }) {
  return (
    <Document title={`${plan.title} — ChalkBox`} author="Team HarshLabs">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>ChalkBox · Classroom plan</Text>
        <PdfText style={styles.title}>{plan.title}</PdfText>
        <View style={styles.meta}>
          <PdfText>{`Grade ${plan.grade} · ${plan.subject}`}</PdfText>
          <Text>{plan.durationMinutes} minutes</Text>
          <Text>{plan.language}</Text>
          <Text>{plan.board}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning objectives</Text>
          {plan.objectives.map((objective, index) => (
            <PdfText
              key={objective.id}
              style={styles.objective}
            >{`${index + 1}. ${objective.text}`}</PdfText>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lesson sequence</Text>
          {plan.activities.map((activity, index) => (
            <View key={activity.id} style={styles.activity} wrap={false}>
              <View style={styles.activityHeader}>
                <PdfText style={styles.activityTitle}>{`${index + 1}. ${activity.title}`}</PdfText>
                <Text>{activity.durationMinutes} min</Text>
              </View>
              {activity.teacherSteps.map((step, stepIndex) => (
                <PdfText
                  key={`${activity.id}-${stepIndex}`}
                  style={styles.line}
                >{`• ${step}`}</PdfText>
              ))}
              <PdfText
                style={styles.note}
              >{`Learners: ${activity.studentSteps.join(" ")}`}</PdfText>
              <PdfText
                style={styles.tiny}
              >{`Materials: ${activity.materials.join(", ") || "None"} · Offline: ${activity.offlineAlternative ?? "No device required"}`}</PdfText>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment & follow-through</Text>
          {plan.assessments.map((item) => (
            <View key={item.id} style={{ marginBottom: 6 }}>
              <PdfText style={{ fontWeight: 600 }}>{item.prompt}</PdfText>
              <PdfText style={styles.tiny}>{`Answer guide: ${item.answerGuide}`}</PdfText>
            </View>
          ))}
          <PdfText>{`Homework: ${plan.homework}`}</PdfText>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sources & disclosure</Text>
          {plan.sources.map((source) => (
            <PdfText
              key={source.id}
              style={styles.tiny}
            >{`${source.title}: ${source.attribution}`}</PdfText>
          ))}
          <PdfText style={[styles.tiny, { marginTop: 4 }]}>{plan.aiDisclosure}</PdfText>
        </View>
        <View style={styles.footer} fixed>
          <Text>Your classroom. Your plan. Powered by HarshLabs AI.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
