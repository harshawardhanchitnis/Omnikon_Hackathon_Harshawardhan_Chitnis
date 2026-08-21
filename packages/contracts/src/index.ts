import { z } from "zod";

export const gradeLevels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
export const subjects = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "Environmental Studies",
  "Custom"
] as const;
export const boards = ["CBSE/NCERT", "State Board", "Custom"] as const;
export const lessonLanguages = ["English", "Hindi", "Bilingual English–Hindi"] as const;
export const planStatuses = ["draft", "ready", "taught", "archived"] as const;
export const userRoles = ["teacher", "admin"] as const;
export const appModes = ["guest", "demo-teacher", "teacher", "demo-admin", "admin"] as const;

export type GradeLevel = (typeof gradeLevels)[number];
export type Subject = (typeof subjects)[number];
export type PlanStatus = (typeof planStatuses)[number];
export type UserRole = (typeof userRoles)[number];
export type AppMode = (typeof appModes)[number];
export type Board = (typeof boards)[number];
export type LessonLanguage = (typeof lessonLanguages)[number];

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  schoolName: string;
  district: string;
  state: string;
  preferredLanguage: "English" | "Hindi" | "Marathi";
  grades: GradeLevel[];
  subjects: Subject[];
  onboardingComplete: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface CurriculumSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  license: string;
  attribution: string;
  grade: GradeLevel;
  subject: Subject;
  chapter?: string;
}

export interface LearningObjective {
  id: string;
  text: string;
  bloomLevel: "remember" | "understand" | "apply" | "analyse" | "evaluate" | "create";
}

export interface LessonActivity {
  id: string;
  title: string;
  type: "hook" | "explain" | "activity" | "practice" | "assessment" | "closure";
  durationMinutes: number;
  teacherSteps: string[];
  studentSteps: string[];
  materials: string[];
  differentiation?: string;
  offlineAlternative?: string;
}

export const instructionalBlockTypes = [
  "hook",
  "question",
  "explanation",
  "visual",
  "board-work",
  "demonstration",
  "misconception",
  "example",
  "guided-practice",
  "independent-practice",
  "discussion",
  "quick-check",
  "recap",
  "exit-ticket",
  "transition",
  "shared-multigrade",
  "grade-specific"
] as const;

export const visualBlockTypes = [
  "process",
  "comparison",
  "sequence",
  "cause-effect",
  "labeled-diagram",
  "input-output",
  "timeline",
  "table",
  "vocabulary",
  "equation"
] as const;

export type InstructionalBlockType = (typeof instructionalBlockTypes)[number];
export type VisualBlockType = (typeof visualBlockTypes)[number];

export interface GradeTarget {
  grades: GradeLevel[];
  teacherAttentionGrade?: GradeLevel;
  independentGrade?: GradeLevel;
  label: string;
}

export interface BlockDifferentiation {
  support: string;
  extension: string;
}

export interface RevealStage {
  id: string;
  label: string;
  kind: "hint" | "answer" | "explanation" | "visual-layer";
  learnerContent: string[];
}

export interface VisualNode {
  id: string;
  label: string;
  secondaryLabel?: string;
  emphasis?: "primary" | "secondary" | "output" | "warning";
}

export interface VisualConnection {
  from: string;
  to: string;
  label?: string;
}

export interface ClassroomVisualData {
  kind: VisualBlockType;
  title?: string;
  nodes: VisualNode[];
  connections?: VisualConnection[];
  columns?: string[];
  rows?: string[][];
  caption?: string;
}

export interface BaseInstructionalBlock {
  id: string;
  type: InstructionalBlockType;
  title: string;
  purpose: string;
  durationMinutes: number;
  teacherCue: string;
  learnerContent: string[];
  resourceAlternative: string;
  differentiation: BlockDifferentiation;
  language: LessonLanguage;
  gradeTarget: GradeTarget;
  accessibilitySupport: string[];
  revealStages: RevealStage[];
  sourceIds: string[];
}

export interface PromptInstructionalBlock extends BaseInstructionalBlock {
  type: "hook" | "question" | "discussion" | "transition";
  prompt: string;
  expectedResponse?: string;
}

export interface TeachingInstructionalBlock extends BaseInstructionalBlock {
  type:
    | "explanation"
    | "board-work"
    | "demonstration"
    | "example"
    | "guided-practice"
    | "independent-practice"
    | "recap"
    | "shared-multigrade"
    | "grade-specific";
  teacherExplanation: string;
  boardPrompt?: string;
  expectedReasoning?: string;
}

export interface VisualInstructionalBlock extends BaseInstructionalBlock {
  type: "visual";
  visualData: ClassroomVisualData;
}

export interface MisconceptionInstructionalBlock extends BaseInstructionalBlock {
  type: "misconception";
  misconception: string;
  evidenceToListenFor: string;
  diagnosticQuestion: string;
  teacherResponse: string;
  correctiveExplanation: string;
}

export interface CheckResponseGuidance {
  key?: string;
  maximumCorrectPercent?: number;
  message: string;
}

export interface CheckInstructionalBlock extends BaseInstructionalBlock {
  type: "quick-check" | "exit-ticket";
  checkMode: "mcq" | "true-false" | "confidence" | "understanding";
  question: string;
  options: Array<{ key: string; label: string }>;
  correctKey?: string;
  answer: string;
  explanation: string;
  misconceptionKey?: string;
  responseGuidance: CheckResponseGuidance[];
}

export type InstructionalBlock =
  | PromptInstructionalBlock
  | TeachingInstructionalBlock
  | VisualInstructionalBlock
  | MisconceptionInstructionalBlock
  | CheckInstructionalBlock;

export interface GroundingSummary {
  status: "grounded" | "partially-grounded" | "ungrounded";
  verifiedSourceIds: string[];
  note: string;
}

export interface AssessmentItem {
  id: string;
  prompt: string;
  type: "oral" | "written" | "observation" | "exit-ticket";
  answerGuide: string;
  checksObjectiveIds: string[];
}

export interface LessonPlan {
  id: string;
  ownerId: string;
  title: string;
  subject: Subject;
  grade: GradeLevel;
  additionalGrade?: GradeLevel;
  customSubject?: string;
  board: Board;
  customBoard?: string;
  language: LessonLanguage;
  topic: string;
  durationMinutes: number;
  classSize: number;
  availableMaterials: string[];
  constraints: string[];
  objectives: LearningObjective[];
  activities: LessonActivity[];
  classroomBlocks: InstructionalBlock[];
  assessments: AssessmentItem[];
  homework: string;
  teacherNotes: string;
  status: PlanStatus;
  qualityScore: number;
  estimatedPrepMinutes: number;
  sources: CurriculumSource[];
  grounding: GroundingSummary;
  generationMode: "ai" | "prepared-demo" | "manual" | "community-clone";
  aiDisclosure: string;
  createdAt: string;
  updatedAt: string;
  taughtAt?: string;
  parentPlanId?: string;
  isPublic: boolean;
  publicSlug?: string;
  version: number;
}

export interface PlanGenerationInput {
  grade: GradeLevel;
  additionalGrade?: GradeLevel;
  subject: Subject;
  customSubject?: string;
  topic: string;
  durationMinutes: number;
  language: LessonPlan["language"];
  board: LessonPlan["board"];
  customBoard?: string;
  classSize: number;
  availableMaterials: string[];
  constraints: string[];
  learningLevel: "support-needed" | "mixed" | "on-level" | "advanced";
}

export interface QuickBriefExtraction extends PlanGenerationInput {
  brief: string;
  confidence: "high" | "medium" | "low";
  assumptions: string[];
  extractionMethod: "gemini" | "rule-based";
}

export type PlanVersionReason =
  | "generated"
  | "manual-checkpoint"
  | "before-regeneration"
  | "accepted-regeneration"
  | "restored"
  | "published"
  | "shared";

export interface PlanVersion {
  id: string;
  planId: string;
  ownerId: string;
  versionNumber: number;
  reason: PlanVersionReason;
  label?: string;
  snapshot: LessonPlan;
  createdAt: string;
}

export interface ShareSnapshot {
  id: string;
  tokenHash: string;
  rawToken?: string;
  planId: string;
  planVersionId: string;
  ownerId: string;
  snapshot: LessonPlan;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface ClassroomProfile {
  id: string;
  ownerId: string;
  name: string;
  grade: GradeLevel;
  additionalGrade?: GradeLevel;
  learnerCount: number;
  board: Board;
  customBoard?: string;
  language: LessonLanguage;
  internetAvailability: "reliable" | "intermittent" | "none";
  projectorAvailable: boolean;
  chalkboardAvailable: boolean;
  commonMaterials: string[];
  mixedAbility: boolean;
  readingSupportNeeds: string[];
  accessibilityConsiderations: string[];
  typicalDurationMinutes: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const assessmentQuestionTypes = [
  "mcq",
  "true-false",
  "short-answer",
  "long-answer",
  "fill-blank"
] as const;
export const assessmentPurposes = [
  "diagnostic",
  "formative",
  "exit-ticket",
  "application",
  "hots"
] as const;
export const questionProvenance = [
  "curriculum-source",
  "licensed-oer",
  "chalkbox-authored",
  "teacher-authored",
  "ai-derived"
] as const;
export const reviewStates = ["unreviewed", "teacher-reviewed", "curator-approved"] as const;

export type AssessmentQuestionType = (typeof assessmentQuestionTypes)[number];
export type AssessmentPurpose = (typeof assessmentPurposes)[number];
export type QuestionProvenance = (typeof questionProvenance)[number];
export type ReviewState = (typeof reviewStates)[number];

export interface AssessmentQuestion {
  id: string;
  ownerId?: string;
  board: Board;
  grade: GradeLevel;
  subject: Subject;
  customSubject?: string;
  bookOrUnit: string;
  chapter: string;
  topic: string;
  prompt: string;
  type: AssessmentQuestionType;
  purpose: AssessmentPurpose;
  difficulty: "foundation" | "core" | "challenge";
  language: LessonLanguage;
  marks: number;
  options?: string[];
  answer: string;
  explanation?: string;
  misconceptionTarget?: string;
  provenance: QuestionProvenance;
  reviewState: ReviewState;
  source?: CurriculumSource;
  attribution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorksheetItem {
  id: string;
  questionId: string;
  questionSnapshot: AssessmentQuestion;
  order: number;
  marks: number;
}

export interface Worksheet {
  id: string;
  ownerId: string;
  title: string;
  instructions: string;
  grade: GradeLevel;
  subject: Subject;
  customSubject?: string;
  chapter: string;
  language: LessonLanguage;
  includeAnswers: boolean;
  items: WorksheetItem[];
  status: "draft" | "ready";
  createdAt: string;
  updatedAt: string;
}

export type PublicationStatus =
  "draft" | "submitted" | "approved" | "rejected" | "withdrawn" | "unpublished";

export interface CommunityPublication {
  id: string;
  ownerId: string;
  planId: string;
  planVersionId: string;
  snapshot: LessonPlan;
  authorName: string;
  authorSchool: string;
  status: PublicationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  saves: number;
  adaptations: number;
  reports: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationReport {
  id: string;
  publicationId: string;
  reporterId: string;
  reason: "inaccurate" | "unsafe" | "copyright" | "spam" | "other";
  note: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

export interface QuickCheckResult {
  id: string;
  planId: string;
  sessionId: string;
  ownerId: string;
  activityId?: string;
  blockId?: string;
  prompt: string;
  mode: "mcq" | "true-false" | "confidence" | "understanding";
  counts: Record<string, number>;
  correctKey?: string;
  note?: string;
  misconceptionSignal?: string;
  suggestedAction?: string;
  createdAt: string;
}

export type OfflineEntityType = "lesson-plan" | "reflection" | "teaching-session";
export type OfflineMutationType = "create" | "update" | "delete";
export type OfflineMutationStatus = "pending" | "syncing" | "conflict" | "failed" | "synced";

export interface OfflineMutation {
  id: string;
  entityId: string;
  entityType: OfflineEntityType;
  mutationType: OfflineMutationType;
  payload: unknown;
  baseVersion: number;
  timestamp: string;
  retryCount: number;
  status: OfflineMutationStatus;
  errorCode?: string;
}

export interface SyncConflict {
  id: string;
  mutationId: string;
  entityId: string;
  entityType: OfflineEntityType;
  localPayload: unknown;
  cloudPayload: unknown;
  localVersion: number;
  cloudVersion: number;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: "keep-local" | "keep-cloud" | "duplicate-both";
}

export interface PlanGenerationResult {
  plan: LessonPlan;
  requestId: string;
  provider: "gemini" | "prepared-demo";
  model: string;
  retrievalCount: number;
  groundingStatus: GroundingSummary["status"];
  latencyMs: number;
  warnings: string[];
}

export interface TeachingSession {
  id: string;
  planId: string;
  ownerId: string;
  startedAt: string;
  completedAt?: string;
  currentActivityIndex: number;
  currentBlockIndex: number;
  revealState: Record<string, string[]>;
  skippedBlockIds: string[];
  activeGrade?: GradeLevel;
  elapsedSeconds: number;
  paused: boolean;
  attendanceCount?: number;
  quickNotes: string[];
  version: number;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  planId: string;
  sessionId?: string;
  ownerId: string;
  understanding: 1 | 2 | 3 | 4 | 5;
  engagement: 1 | 2 | 3 | 4 | 5;
  pace: "too-slow" | "right" | "too-fast";
  evidence: string;
  createdAt: string;
}

export interface Reflection {
  id: string;
  planId: string;
  ownerId: string;
  wentWell: string;
  improveNextTime: string;
  studentOutcome: "not-yet" | "partly" | "mostly" | "fully";
  rating: 1 | 2 | 3 | 4 | 5;
  nextStep: string;
  createdAt: string;
  version: number;
  updatedAt: string;
}

export interface CommunityPlanSummary {
  id: string;
  sourcePlanId: string;
  authorName: string;
  authorSchool: string;
  title: string;
  subject: Subject;
  grade: GradeLevel;
  topic: string;
  durationMinutes: number;
  qualityScore: number;
  saves: number;
  adaptations: number;
  tags: string[];
  publishedAt: string;
}

export interface Expert {
  id: string;
  name: string;
  title: string;
  specialties: Subject[];
  languages: string[];
  availability: string;
  avatarColor: string;
}

export interface Appointment {
  id: string;
  teacherId: string;
  expertId: string;
  planId?: string;
  startsAt: string;
  durationMinutes: number;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  agenda: string;
}

export interface GuidancePlan {
  id: string;
  teacherId: string;
  expertId?: string;
  title: string;
  goal: string;
  actions: ActionTask[];
  status: "active" | "complete" | "paused";
  createdAt: string;
}

export interface ActionTask {
  id: string;
  title: string;
  dueAt?: string;
  completed: boolean;
  planId?: string;
}

export interface Invitation {
  id: string;
  inviterId: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
}

export interface Permission {
  resource: "plan" | "community" | "analytics" | "admin";
  action: "read" | "create" | "update" | "delete" | "publish";
  roles: UserRole[];
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "plan-ready"
    | "offline-synced"
    | "sync-conflict"
    | "community"
    | "publication"
    | "worksheet"
    | "appointment"
    | "system";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface AnalyticsSnapshot {
  ownerId: string;
  periodLabel: string;
  plansCreated: number;
  plansTaught: number;
  hoursSaved: number;
  averageQuality: number;
  averageOutcome: number;
  subjectBreakdown: Array<{ subject: Subject; plans: number }>;
  weeklyActivity: Array<{ week: string; created: number; taught: number }>;
  topTopics: Array<{ topic: string; uses: number }>;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
  highContrast: boolean;
  defaultGrade: GradeLevel;
  defaultSubject: Subject;
  defaultDurationMinutes: number;
  saveOffline: boolean;
  emailNotifications: boolean;
  analyticsConsent: boolean;
  defaultClassroomProfileId?: string;
}

export interface PlatformStats {
  teachers: number;
  plans: number;
  taughtSessions: number;
  generationsToday: number;
  estimatedCostInr: number;
  flaggedPlans: number;
}

export const planGenerationInputSchema = z
  .object({
    grade: z.enum(gradeLevels),
    additionalGrade: z.enum(gradeLevels).optional(),
    subject: z.enum(subjects),
    customSubject: z.string().trim().min(2).max(80).optional(),
    topic: z.string().trim().min(3, "Enter a specific topic").max(120),
    durationMinutes: z.number().int().min(20).max(90),
    language: z.enum(lessonLanguages),
    board: z.enum(boards),
    customBoard: z.string().trim().min(2).max(100).optional(),
    classSize: z.number().int().min(1).max(100),
    availableMaterials: z.array(z.string()).max(12),
    constraints: z.array(z.string()).max(12),
    learningLevel: z.enum(["support-needed", "mixed", "on-level", "advanced"])
  })
  .superRefine((value, context) => {
    if (value.additionalGrade === value.grade) {
      context.addIssue({
        code: "custom",
        path: ["additionalGrade"],
        message: "Choose a different second grade"
      });
    }
    if (value.subject === "Custom" && !value.customSubject) {
      context.addIssue({
        code: "custom",
        path: ["customSubject"],
        message: "Enter the custom subject"
      });
    }
    if (value.board === "Custom" && !value.customBoard) {
      context.addIssue({
        code: "custom",
        path: ["customBoard"],
        message: "Enter the curriculum or board"
      });
    }
  });

export const reflectionSchema = z.object({
  wentWell: z.string().trim().min(10).max(1000),
  improveNextTime: z.string().trim().min(10).max(1000),
  studentOutcome: z.enum(["not-yet", "partly", "mostly", "fully"]),
  rating: z.number().int().min(1).max(5),
  nextStep: z.string().trim().min(3).max(500)
});

const gradeTargetSchema: z.ZodType<GradeTarget> = z
  .object({
    grades: z.array(z.enum(gradeLevels)).min(1).max(2),
    teacherAttentionGrade: z.enum(gradeLevels).optional(),
    independentGrade: z.enum(gradeLevels).optional(),
    label: z.string().min(1).max(80)
  })
  .superRefine((value, context) => {
    if (
      value.teacherAttentionGrade &&
      value.independentGrade &&
      value.teacherAttentionGrade === value.independentGrade
    ) {
      context.addIssue({
        code: "custom",
        path: ["independentGrade"],
        message: "The independently working grade must differ from the teacher-attention grade"
      });
    }
    for (const grade of [value.teacherAttentionGrade, value.independentGrade]) {
      if (grade && !value.grades.includes(grade)) {
        context.addIssue({
          code: "custom",
          path: ["grades"],
          message: "Every active group must be included in the block grade targets"
        });
      }
    }
  });

const revealStageSchema: z.ZodType<RevealStage> = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  kind: z.enum(["hint", "answer", "explanation", "visual-layer"]),
  learnerContent: z.array(z.string().min(1).max(500)).min(1).max(8)
});

const commonInstructionalBlockShape = {
  id: z.string().min(1),
  title: z.string().min(2).max(140),
  purpose: z.string().min(3).max(300),
  durationMinutes: z.number().int().min(1).max(90),
  teacherCue: z.string().min(1).max(700),
  learnerContent: z.array(z.string().min(1).max(700)).min(1).max(10),
  resourceAlternative: z.string().min(1).max(500),
  differentiation: z.object({
    support: z.string().min(1).max(500),
    extension: z.string().min(1).max(500)
  }),
  language: z.enum(lessonLanguages),
  gradeTarget: gradeTargetSchema,
  accessibilitySupport: z.array(z.string().min(1).max(300)).max(8),
  revealStages: z.array(revealStageSchema).max(8),
  sourceIds: z.array(z.string().min(1)).max(8)
};

const promptInstructionalBlockSchema: z.ZodType<PromptInstructionalBlock> = z.object({
  ...commonInstructionalBlockShape,
  type: z.enum(["hook", "question", "discussion", "transition"]),
  prompt: z.string().min(2).max(700),
  expectedResponse: z.string().min(1).max(700).optional()
});

const teachingInstructionalBlockSchema: z.ZodType<TeachingInstructionalBlock> = z.object({
  ...commonInstructionalBlockShape,
  type: z.enum([
    "explanation",
    "board-work",
    "demonstration",
    "example",
    "guided-practice",
    "independent-practice",
    "recap",
    "shared-multigrade",
    "grade-specific"
  ]),
  teacherExplanation: z.string().min(1).max(1200),
  boardPrompt: z.string().min(1).max(700).optional(),
  expectedReasoning: z.string().min(1).max(700).optional()
});

const visualInstructionalBlockSchema: z.ZodType<VisualInstructionalBlock> = z.object({
  ...commonInstructionalBlockShape,
  type: z.literal("visual"),
  visualData: z.object({
    kind: z.enum(visualBlockTypes),
    title: z.string().min(1).max(140).optional(),
    nodes: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1).max(160),
          secondaryLabel: z.string().min(1).max(160).optional(),
          emphasis: z.enum(["primary", "secondary", "output", "warning"]).optional()
        })
      )
      .min(1)
      .max(16),
    connections: z
      .array(
        z.object({
          from: z.string().min(1),
          to: z.string().min(1),
          label: z.string().min(1).max(100).optional()
        })
      )
      .max(24)
      .optional(),
    columns: z.array(z.string().min(1).max(120)).max(6).optional(),
    rows: z
      .array(z.array(z.string().min(1).max(240)).max(6))
      .max(12)
      .optional(),
    caption: z.string().min(1).max(400).optional()
  })
});

const misconceptionInstructionalBlockSchema: z.ZodType<MisconceptionInstructionalBlock> = z.object({
  ...commonInstructionalBlockShape,
  type: z.literal("misconception"),
  misconception: z.string().min(2).max(500),
  evidenceToListenFor: z.string().min(2).max(500),
  diagnosticQuestion: z.string().min(2).max(500),
  teacherResponse: z.string().min(2).max(700),
  correctiveExplanation: z.string().min(2).max(700)
});

const checkInstructionalBlockSchema: z.ZodType<CheckInstructionalBlock> = z.object({
  ...commonInstructionalBlockShape,
  type: z.enum(["quick-check", "exit-ticket"]),
  checkMode: z.enum(["mcq", "true-false", "confidence", "understanding"]),
  question: z.string().min(2).max(700),
  options: z
    .array(z.object({ key: z.string().min(1).max(8), label: z.string().min(1).max(300) }))
    .max(6),
  correctKey: z.string().min(1).max(8).optional(),
  answer: z.string().min(1).max(700),
  explanation: z.string().min(1).max(1000),
  misconceptionKey: z.string().min(1).max(8).optional(),
  responseGuidance: z
    .array(
      z.object({
        key: z.string().min(1).max(8).optional(),
        maximumCorrectPercent: z.number().min(0).max(100).optional(),
        message: z.string().min(2).max(700)
      })
    )
    .max(8)
});

export const instructionalBlockSchema: z.ZodType<InstructionalBlock> = z.union([
  promptInstructionalBlockSchema,
  teachingInstructionalBlockSchema,
  visualInstructionalBlockSchema,
  misconceptionInstructionalBlockSchema,
  checkInstructionalBlockSchema
]);

export const lessonPlanSchema: z.ZodType<LessonPlan> = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string().min(3),
  subject: z.enum(subjects),
  grade: z.enum(gradeLevels),
  additionalGrade: z.enum(gradeLevels).optional(),
  customSubject: z.string().optional(),
  board: z.enum(boards),
  customBoard: z.string().optional(),
  language: z.enum(lessonLanguages),
  topic: z.string().min(3),
  durationMinutes: z.number().int().positive(),
  classSize: z.number().int().positive(),
  availableMaterials: z.array(z.string()),
  constraints: z.array(z.string()),
  objectives: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      bloomLevel: z.enum(["remember", "understand", "apply", "analyse", "evaluate", "create"])
    })
  ),
  activities: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(["hook", "explain", "activity", "practice", "assessment", "closure"]),
      durationMinutes: z.number().int().positive(),
      teacherSteps: z.array(z.string()),
      studentSteps: z.array(z.string()),
      materials: z.array(z.string()),
      differentiation: z.string().optional(),
      offlineAlternative: z.string().optional()
    })
  ),
  classroomBlocks: z.array(instructionalBlockSchema).min(1).max(24),
  assessments: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      type: z.enum(["oral", "written", "observation", "exit-ticket"]),
      answerGuide: z.string(),
      checksObjectiveIds: z.array(z.string())
    })
  ),
  homework: z.string(),
  teacherNotes: z.string(),
  status: z.enum(planStatuses),
  qualityScore: z.number().min(0).max(100),
  estimatedPrepMinutes: z.number().nonnegative(),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      publisher: z.string(),
      url: z.string(),
      license: z.string(),
      attribution: z.string(),
      grade: z.enum(gradeLevels),
      subject: z.enum(subjects),
      chapter: z.string().optional()
    })
  ),
  grounding: z.object({
    status: z.enum(["grounded", "partially-grounded", "ungrounded"]),
    verifiedSourceIds: z.array(z.string().min(1)),
    note: z.string().min(1).max(700)
  }),
  generationMode: z.enum(["ai", "prepared-demo", "manual", "community-clone"]),
  aiDisclosure: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  taughtAt: z.string().optional(),
  parentPlanId: z.string().optional(),
  isPublic: z.boolean(),
  publicSlug: z.string().optional(),
  version: z.number().int().positive()
});

export const assessmentQuestionSchema: z.ZodType<AssessmentQuestion> = z.object({
  id: z.string().min(1),
  ownerId: z.string().optional(),
  board: z.enum(boards),
  grade: z.enum(gradeLevels),
  subject: z.enum(subjects),
  customSubject: z.string().optional(),
  bookOrUnit: z.string(),
  chapter: z.string(),
  topic: z.string(),
  prompt: z.string().min(3),
  type: z.enum(assessmentQuestionTypes),
  purpose: z.enum(assessmentPurposes),
  difficulty: z.enum(["foundation", "core", "challenge"]),
  language: z.enum(lessonLanguages),
  marks: z.number().int().min(1).max(20),
  options: z.array(z.string()).min(2).max(6).optional(),
  answer: z.string().min(1),
  explanation: z.string().optional(),
  misconceptionTarget: z.string().optional(),
  provenance: z.enum(questionProvenance),
  reviewState: z.enum(reviewStates),
  source: z
    .object({
      id: z.string(),
      title: z.string(),
      publisher: z.string(),
      url: z.string(),
      license: z.string(),
      attribution: z.string(),
      grade: z.enum(gradeLevels),
      subject: z.enum(subjects),
      chapter: z.string().optional()
    })
    .optional(),
  attribution: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const worksheetSchema: z.ZodType<Worksheet> = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string().min(3).max(160),
  instructions: z.string().max(1000),
  grade: z.enum(gradeLevels),
  subject: z.enum(subjects),
  customSubject: z.string().optional(),
  chapter: z.string(),
  language: z.enum(lessonLanguages),
  includeAnswers: z.boolean(),
  items: z.array(
    z.object({
      id: z.string(),
      questionId: z.string(),
      questionSnapshot: assessmentQuestionSchema,
      order: z.number().int().nonnegative(),
      marks: z.number().int().min(1).max(20)
    })
  ),
  status: z.enum(["draft", "ready"]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CONTRACT_VERSION = "3.0.0";
