import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { LessonPlan } from "@chalkbox/contracts";

const styles = StyleSheet.create({
  page: { padding: 34, fontFamily: "Helvetica", fontSize: 9, color: "#17211f", lineHeight: 1.45 },
  brand: {
    color: "#1f6b5c",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: { marginTop: 10, fontSize: 22, fontWeight: 700, lineHeight: 1.15 },
  meta: { marginTop: 8, flexDirection: "row", gap: 12, color: "#45534f" },
  section: { marginTop: 18 },
  sectionTitle: { marginBottom: 7, color: "#1f6b5c", fontSize: 12, fontWeight: 700 },
  objective: { marginBottom: 4 },
  activity: { marginBottom: 9, border: "1 solid #dfe5df", borderRadius: 6, padding: 8 },
  activityHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  activityTitle: { fontWeight: 700 },
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
        <Text style={styles.title}>{plan.title}</Text>
        <View style={styles.meta}>
          <Text>
            Grade {plan.grade} · {plan.subject}
          </Text>
          <Text>{plan.durationMinutes} minutes</Text>
          <Text>{plan.language}</Text>
          <Text>{plan.board}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning objectives</Text>
          {plan.objectives.map((objective, index) => (
            <Text key={objective.id} style={styles.objective}>
              {index + 1}. {objective.text}
            </Text>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lesson sequence</Text>
          {plan.activities.map((activity, index) => (
            <View key={activity.id} style={styles.activity} wrap={false}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>
                  {index + 1}. {activity.title}
                </Text>
                <Text>{activity.durationMinutes} min</Text>
              </View>
              {activity.teacherSteps.map((step, stepIndex) => (
                <Text key={`${activity.id}-${stepIndex}`} style={styles.line}>
                  • {step}
                </Text>
              ))}
              <Text style={styles.note}>Learners: {activity.studentSteps.join(" ")}</Text>
              <Text style={styles.tiny}>
                Materials: {activity.materials.join(", ") || "None"} · Offline:{" "}
                {activity.offlineAlternative ?? "No device required"}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment & follow-through</Text>
          {plan.assessments.map((item) => (
            <View key={item.id} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: 700 }}>{item.prompt}</Text>
              <Text style={styles.tiny}>Answer guide: {item.answerGuide}</Text>
            </View>
          ))}
          <Text>Homework: {plan.homework}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sources & disclosure</Text>
          {plan.sources.map((source) => (
            <Text key={source.id} style={styles.tiny}>
              {source.title}: {source.attribution}
            </Text>
          ))}
          <Text style={[styles.tiny, { marginTop: 4 }]}>{plan.aiDisclosure}</Text>
        </View>
        <View style={styles.footer} fixed>
          <Text>Your classroom. Your plan. Powered by HarshLabs AI.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
