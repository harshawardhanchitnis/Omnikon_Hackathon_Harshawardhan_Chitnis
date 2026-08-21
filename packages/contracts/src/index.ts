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
  assessments: AssessmentItem[];
  homework: string;
  teacherNotes: string;
  status: PlanStatus;
  qualityScore: number;
  estimatedPrepMinutes: number;
  sources: CurriculumSource[];
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
  "generated" | "manual-checkpoint" | "before-regeneration" | "restored" | "published" | "shared";

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
  token: string;
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
  prompt: string;
  mode: "abcd" | "understanding";
  counts: Record<string, number>;
  correctKey?: string;
  note?: string;
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

export const CONTRACT_VERSION = "2.0.0";
