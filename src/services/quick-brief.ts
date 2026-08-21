import type {
  ClassroomProfile,
  GradeLevel,
  PlanGenerationInput,
  QuickBriefExtraction,
  Subject
} from "@chalkbox/contracts";
import { planGenerationInputSchema } from "@chalkbox/contracts";
import { appConfig } from "@/lib/config";
import { invokeFunction } from "@/lib/supabase";

const subjectMatchers: Array<[RegExp, Subject]> = [
  [/\b(science|physics|chemistry|biology)\b/i, "Science"],
  [/\b(math|maths|mathematics|fraction|geometry|algebra)\b/i, "Mathematics"],
  [/\b(social science|history|geography|civics)\b/i, "Social Science"],
  [/\b(ev?s|environmental studies)\b/i, "Environmental Studies"],
  [/\benglish\b/i, "English"],
  [/\bhindi\b/i, "Hindi"]
];

function parseGrades(brief: string) {
  const matches = [
    ...brief.matchAll(/(?:class|grade|classes)\s*(\d{1,2})(?:\s*(?:\+|and|&|,)\s*(\d{1,2}))?/gi)
  ];
  const candidates = matches
    .flatMap((match) => [match[1], match[2]])
    .filter((value): value is string => Boolean(value))
    .filter((value) => Number(value) >= 1 && Number(value) <= 10)
    .slice(0, 2) as GradeLevel[];
  return [...new Set(candidates)];
}

function parseTopic(brief: string) {
  const topicMatch = brief.match(
    /(?:lesson|plan|teach|explain)\s+(?:on|about|for)?\s*([^,.]+?)(?:\s+using|\s+with|\s+for\s+(?:class|grade)|\s+in\s+\d+\s*(?:minutes?|mins?)|[,.]|$)/i
  );
  return topicMatch?.[1]?.trim() || brief.slice(0, 120).trim();
}

export function parseQuickBriefLocally(
  brief: string,
  defaults: PlanGenerationInput,
  classroom?: ClassroomProfile
): QuickBriefExtraction {
  const grades = parseGrades(brief);
  const duration = brief.match(/(\d{2,3})\s*[-–]?\s*(?:minutes?|mins?)/i)?.[1];
  const classSize = brief.match(/(?:class of|for)\s+(\d{1,3})\s+(?:learners?|students?)/i)?.[1];
  const subject = subjectMatchers.find(([pattern]) => pattern.test(brief))?.[1];
  const bilingual = /bilingual|english\s*(?:and|\+)\s*hindi|hinglish/i.test(brief);
  const hindi = !bilingual && /\bhindi\b/i.test(brief);
  const board = /state board/i.test(brief)
    ? "State Board"
    : /cbse|ncert/i.test(brief)
      ? "CBSE/NCERT"
      : (classroom?.board ?? defaults.board);
  const materialCandidates = [
    [/(chalk|black)board/i, "Blackboard"],
    [/scrap paper|paper/i, "Scrap paper"],
    [/household|local object/i, "Local objects"],
    [/textbook/i, "Textbook"],
    [/phone/i, "Basic phone"],
    [/projector/i, "Projector"]
  ] as const;
  const constraintCandidates = [
    [/no projector|without (?:a )?projector/i, "No projector"],
    [/offline|no internet/i, "No internet"],
    [/intermittent (?:internet|electricity)/i, "Intermittent electricity"],
    [/mixed[- ]ability|mixed (?:levels|reading)/i, "Mixed reading levels"],
    [/large class/i, "Large class"],
    [/multilingual/i, "Multilingual class"]
  ] as const;
  const materials = materialCandidates
    .filter(([pattern]) => pattern.test(brief))
    .map(([, label]) => label);
  const constraints = constraintCandidates
    .filter(([pattern]) => pattern.test(brief))
    .map(([, label]) => label);
  const assumptions: string[] = [];
  if (!grades.length) assumptions.push(`Used default Class ${classroom?.grade ?? defaults.grade}.`);
  if (!subject) assumptions.push(`Used default subject ${defaults.subject}.`);
  if (!duration)
    assumptions.push(
      `Used ${classroom?.typicalDurationMinutes ?? defaults.durationMinutes} minutes.`
    );
  if (!materials.length) assumptions.push("Used the classroom profile’s common materials.");

  const candidate: PlanGenerationInput = {
    ...defaults,
    grade: grades[0] ?? classroom?.grade ?? defaults.grade,
    ...(grades[1] || classroom?.additionalGrade
      ? { additionalGrade: grades[1] ?? classroom?.additionalGrade }
      : {}),
    subject: subject ?? defaults.subject,
    topic: parseTopic(brief),
    durationMinutes: duration
      ? Number(duration)
      : (classroom?.typicalDurationMinutes ?? defaults.durationMinutes),
    language: bilingual
      ? "Bilingual English–Hindi"
      : hindi
        ? "Hindi"
        : (classroom?.language ?? defaults.language),
    board,
    classSize: classSize ? Number(classSize) : (classroom?.learnerCount ?? defaults.classSize),
    availableMaterials: materials.length
      ? materials
      : (classroom?.commonMaterials ?? defaults.availableMaterials),
    constraints: constraints.length ? constraints : defaults.constraints,
    learningLevel: /advanced|challenge/i.test(brief)
      ? "advanced"
      : /struggling|support[- ]needed|reading support/i.test(brief)
        ? "support-needed"
        : "mixed"
  };
  const parsed = planGenerationInputSchema.safeParse(candidate);
  if (!parsed.success)
    throw new Error("The brief contains details outside the supported planning bounds.");
  return {
    ...parsed.data,
    brief,
    confidence: assumptions.length <= 1 ? "high" : assumptions.length <= 3 ? "medium" : "low",
    assumptions,
    extractionMethod: "rule-based"
  };
}

export async function parseQuickBrief(
  brief: string,
  defaults: PlanGenerationInput,
  classroom?: ClassroomProfile
) {
  if (!appConfig.hasSupabase) return parseQuickBriefLocally(brief, defaults, classroom);
  try {
    const response = await invokeFunction<{
      result: Omit<QuickBriefExtraction, "extractionMethod">;
    }>("ai-action", {
      action: "parse-brief",
      input: { brief, defaults, classroom }
    });
    return { ...response.result, extractionMethod: "gemini" as const };
  } catch {
    return parseQuickBriefLocally(brief, defaults, classroom);
  }
}
