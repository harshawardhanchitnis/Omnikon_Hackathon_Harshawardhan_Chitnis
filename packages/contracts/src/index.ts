import { z } from "zod";

export const gradeLevels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export const subjects = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "Environmental Studies",
  "Computer Science"
] as const;
export const planStatuses = ["draft", "ready", "taught", "archived"] as const;
export const userRoles = ["teacher", "admin"] as const;
export const appModes = ["guest", "demo-teacher", "teacher", "demo-admin", "admin"] as const;

export type GradeLevel = (typeof gradeLevels)[number];
export type Subject = (typeof subjects)[number];
export type PlanStatus = (typeof planStatuses)[number];
export type UserRole = (typeof userRoles)[number];
export type AppMode = (typeof appModes)[number];

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
  board: "CBSE" | "State Board" | "Other";
  language: "English" | "Hindi" | "Marathi" | "Bilingual";
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
}

export interface PlanGenerationInput {
  grade: GradeLevel;
  subject: Subject;
  topic: string;
  durationMinutes: number;
  language: LessonPlan["language"];
  board: LessonPlan["board"];
  classSize: number;
  availableMaterials: string[];
  constraints: string[];
  learningLevel: "support-needed" | "mixed" | "on-level" | "advanced";
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
  type: "plan-ready" | "offline-synced" | "community" | "appointment" | "system";
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
}

export interface PlatformStats {
  teachers: number;
  plans: number;
  taughtSessions: number;
  generationsToday: number;
  estimatedCostInr: number;
  flaggedPlans: number;
}

export const planGenerationInputSchema = z.object({
  grade: z.enum(gradeLevels),
  subject: z.enum(subjects),
  topic: z.string().trim().min(3, "Enter a specific topic").max(120),
  durationMinutes: z.number().int().min(20).max(120),
  language: z.enum(["English", "Hindi", "Marathi", "Bilingual"]),
  board: z.enum(["CBSE", "State Board", "Other"]),
  classSize: z.number().int().min(1).max(120),
  availableMaterials: z.array(z.string()).max(12),
  constraints: z.array(z.string()).max(12),
  learningLevel: z.enum(["support-needed", "mixed", "on-level", "advanced"])
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
  board: z.enum(["CBSE", "State Board", "Other"]),
  language: z.enum(["English", "Hindi", "Marathi", "Bilingual"]),
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
  publicSlug: z.string().optional()
});

export const CONTRACT_VERSION = "1.0.0";
