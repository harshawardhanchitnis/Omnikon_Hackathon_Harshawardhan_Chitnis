import type {
  AssessmentQuestion,
  LessonPlan,
  LessonActivity,
  LearningObjective,
  AssessmentItem
} from "@chalkbox/contracts";
import { appConfig } from "@/lib/config";
import { invokeFunction, supabase } from "@/lib/supabase";
import { uid } from "@/lib/utils";

export type QuestionVariant =
  "easier" | "similar" | "harder" | "application" | "misconception" | "hindi" | "bilingual";

interface AiActionResponse<T> {
  result: T;
  provider: "gemini";
  model: string;
  requestId: string;
  latencyMs: number;
}

export interface AiPreparedResult<T> {
  result: T;
  provider: "gemini" | "prepared-demo";
  model: string;
  latencyMs: number;
}

async function ensureAiSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`AI demo session could not start: ${error.message}`);
}

export function createPreparedAssessmentVariant(
  question: AssessmentQuestion,
  variant: QuestionVariant
): AssessmentQuestion {
  const now = new Date().toISOString();
  const prefix: Record<QuestionVariant, string> = {
    easier: "Foundation version: ",
    similar: "Parallel context: ",
    harder: "Challenge version: ",
    application: "Apply this in a familiar local context: ",
    misconception: `Test the misconception “${question.misconceptionTarget ?? "the most common error"}”: `,
    hindi: "हिंदी अभ्यास रूप — ",
    bilingual: "English + हिन्दी अभ्यास — "
  };
  return {
    ...structuredClone(question),
    id: uid("question"),
    prompt: `${prefix[variant]}${question.prompt}`,
    difficulty:
      variant === "easier"
        ? "foundation"
        : variant === "harder"
          ? "challenge"
          : question.difficulty,
    language:
      variant === "hindi"
        ? "Hindi"
        : variant === "bilingual"
          ? "Bilingual English–Hindi"
          : question.language,
    provenance: "ai-derived",
    reviewState: "unreviewed",
    attribution:
      "Prepared demonstration variant—not a live AI response. Teacher review is required.",
    createdAt: now,
    updatedAt: now
  };
}

export async function generateAssessmentVariant(
  question: AssessmentQuestion,
  variant: QuestionVariant
): Promise<AiPreparedResult<AssessmentQuestion>> {
  const startedAt = performance.now();
  if (!appConfig.hasSupabase) {
    return {
      result: createPreparedAssessmentVariant(question, variant),
      provider: "prepared-demo",
      model: "Prepared ChalkBox variant",
      latencyMs: Math.round(performance.now() - startedAt)
    };
  }
  await ensureAiSession();
  const response = await invokeFunction<
    AiActionResponse<
      Pick<
        AssessmentQuestion,
        | "prompt"
        | "type"
        | "purpose"
        | "difficulty"
        | "marks"
        | "options"
        | "answer"
        | "explanation"
        | "misconceptionTarget"
      >
    >
  >("ai-action", {
    action: "generate-assessment",
    input: {
      grade: question.grade,
      subject: question.subject,
      board: question.board,
      language:
        variant === "hindi"
          ? "Hindi"
          : variant === "bilingual"
            ? "Bilingual English–Hindi"
            : question.language,
      topic: question.topic,
      sourceQuestion: question,
      variant
    }
  });
  const now = new Date().toISOString();
  return {
    result: {
      ...structuredClone(question),
      ...response.result,
      id: uid("question"),
      language:
        variant === "hindi"
          ? "Hindi"
          : variant === "bilingual"
            ? "Bilingual English–Hindi"
            : question.language,
      provenance: "ai-derived",
      reviewState: "unreviewed",
      attribution: `AI-derived with ${response.model}; teacher review required. Grounding provenance remains attached to the source item.`,
      createdAt: now,
      updatedAt: now
    },
    provider: "gemini",
    model: response.model,
    latencyMs: response.latencyMs
  };
}

export type RegenerableSection =
  "objectives" | "activities" | "assessments" | "homework" | "teacherNotes";

export type RegeneratedSectionValue =
  LearningObjective[] | LessonActivity[] | AssessmentItem[] | string;

interface GeneratedObjectiveValue {
  text: string;
  bloomLevel: LearningObjective["bloomLevel"];
}

type GeneratedActivityValue = Omit<LessonActivity, "id">;

interface GeneratedAssessmentValue {
  prompt: string;
  type: AssessmentItem["type"];
  answerGuide: string;
  objectiveIndexes: number[];
}

function preparedSection(plan: LessonPlan, section: RegenerableSection): RegeneratedSectionValue {
  if (section === "activities")
    return plan.activities.map((activity) => ({
      ...structuredClone(activity),
      id: uid("activity"),
      differentiation:
        activity.differentiation ?? "Offer a spoken, sketched or written response pathway."
    }));
  if (section === "objectives")
    return plan.objectives.map((objective) => ({
      ...structuredClone(objective),
      id: uid("objective")
    }));
  if (section === "assessments")
    return plan.assessments.map((assessment) => ({
      ...structuredClone(assessment),
      id: uid("assessment")
    }));
  return section === "homework" ? plan.homework : plan.teacherNotes;
}

export async function regeneratePlanSection(
  plan: LessonPlan,
  section: RegenerableSection,
  instruction: string
): Promise<AiPreparedResult<RegeneratedSectionValue>> {
  const startedAt = performance.now();
  if (!appConfig.hasSupabase) {
    return {
      result: preparedSection(plan, section),
      provider: "prepared-demo",
      model: "Prepared ChalkBox adjustment",
      latencyMs: Math.round(performance.now() - startedAt)
    };
  }
  await ensureAiSession();
  const response = await invokeFunction<AiActionResponse<unknown>>("ai-action", {
    action: "regenerate-section",
    input: {
      section,
      currentValue: plan[section],
      instruction,
      planContext: {
        grade: plan.grade,
        additionalGrade: plan.additionalGrade,
        subject: plan.subject,
        board: plan.board,
        language: plan.language,
        topic: plan.topic,
        durationMinutes: plan.durationMinutes,
        classSize: plan.classSize,
        availableMaterials: plan.availableMaterials,
        constraints: plan.constraints,
        objectives: plan.objectives
      }
    }
  });
  let normalised: RegeneratedSectionValue;
  if (section === "objectives") {
    normalised = (response.result as GeneratedObjectiveValue[]).map((item) => ({
      id: uid("objective"),
      ...item
    }));
  } else if (section === "activities") {
    normalised = (response.result as GeneratedActivityValue[]).map((item) => ({
      id: uid("activity"),
      ...item
    }));
  } else if (section === "assessments") {
    normalised = (response.result as GeneratedAssessmentValue[]).map(
      ({ objectiveIndexes, ...item }) => ({
        id: uid("assessment"),
        ...item,
        checksObjectiveIds: objectiveIndexes
          .map((index) => plan.objectives[index]?.id)
          .filter((id): id is string => Boolean(id))
      })
    );
  } else {
    normalised = String(response.result);
  }
  return {
    result: normalised,
    provider: "gemini",
    model: response.model,
    latencyMs: response.latencyMs
  };
}
