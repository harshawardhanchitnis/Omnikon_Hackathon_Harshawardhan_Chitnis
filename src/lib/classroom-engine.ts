import type {
  CheckInstructionalBlock,
  GradeLevel,
  InstructionalBlock,
  LessonPlan,
  QuickCheckResult,
  RevealStage
} from "@chalkbox/contracts";

export interface LearnerClassroomBlock {
  id: string;
  type: InstructionalBlock["type"];
  title: string;
  purpose: string;
  durationMinutes: number;
  learnerContent: string[];
  gradeLabel: string;
  prompt?: string;
  question?: string;
  options?: Array<{ key: string; label: string }>;
  visualData?: Extract<InstructionalBlock, { type: "visual" }>["visualData"];
  revealedContent: string[];
}

export interface QuickCheckAnalysis {
  totalResponses: number;
  correctResponses?: number;
  correctPercent?: number;
  misconceptionSignal?: string;
  suggestedAction: string;
}

export interface PresentationBroadcastState {
  planId: string;
  blockIndex: number;
  block: LearnerClassroomBlock;
  updatedAt: string;
}

export interface MultigradeScheduleIssue {
  blockId: string;
  message: string;
}

export function totalBlockMinutes(blocks: InstructionalBlock[]) {
  return blocks.reduce((total, block) => total + block.durationMinutes, 0);
}

export function rebalanceBlockDurations(
  blocks: InstructionalBlock[],
  targetMinutes: number
): InstructionalBlock[] {
  if (!Number.isInteger(targetMinutes) || targetMinutes < blocks.length) {
    throw new Error("The target duration must leave at least one minute for every teaching block.");
  }
  const next = structuredClone(blocks);
  let delta = targetMinutes - totalBlockMinutes(next);
  if (delta > 0) {
    const flexible = next
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.type !== "transition")
      .sort((a, b) => b.block.durationMinutes - a.block.durationMinutes);
    const recipients = flexible.length ? flexible : next.map((block, index) => ({ block, index }));
    let pointer = 0;
    while (delta > 0) {
      const recipient = recipients[pointer % recipients.length];
      if (!recipient) throw new Error("No teaching block is available for timing repair.");
      next[recipient.index] = {
        ...next[recipient.index]!,
        durationMinutes: next[recipient.index]!.durationMinutes + 1
      } as InstructionalBlock;
      delta -= 1;
      pointer += 1;
    }
  }
  if (delta < 0) {
    const donors = next
      .map((block, index) => ({ block, index }))
      .sort((a, b) => b.block.durationMinutes - a.block.durationMinutes);
    while (delta < 0) {
      const donor = donors.find(({ index }) => next[index]!.durationMinutes > 1);
      if (!donor)
        throw new Error("The teaching sequence cannot be shortened without removing a block.");
      next[donor.index] = {
        ...next[donor.index]!,
        durationMinutes: next[donor.index]!.durationMinutes - 1
      } as InstructionalBlock;
      delta += 1;
      donors.sort((a, b) => next[b.index]!.durationMinutes - next[a.index]!.durationMinutes);
    }
  }
  return next;
}

export function validateMultigradeSchedule(
  blocks: InstructionalBlock[],
  grades: GradeLevel[]
): MultigradeScheduleIssue[] {
  if (grades.length < 2) return [];
  const issues: MultigradeScheduleIssue[] = [];
  for (const block of blocks) {
    const target = block.gradeTarget;
    if (target.teacherAttentionGrade && !target.grades.includes(target.teacherAttentionGrade)) {
      issues.push({ blockId: block.id, message: "Teacher-attention grade is outside this block." });
    }
    if (target.independentGrade && !target.grades.includes(target.independentGrade)) {
      issues.push({ blockId: block.id, message: "Independent grade is outside this block." });
    }
    if (
      target.teacherAttentionGrade &&
      target.independentGrade &&
      target.teacherAttentionGrade === target.independentGrade
    ) {
      issues.push({
        blockId: block.id,
        message: "One grade cannot receive direct instruction and independent work simultaneously."
      });
    }
    if (
      block.type === "grade-specific" &&
      (!target.teacherAttentionGrade || !target.independentGrade)
    ) {
      issues.push({
        blockId: block.id,
        message: "A grade-specific block must name one teacher group and one independent group."
      });
    }
  }
  return issues;
}

function revealedStages(block: InstructionalBlock, revealedStageIds: string[]): RevealStage[] {
  const revealed = new Set(revealedStageIds);
  return block.revealStages.filter((stage) => revealed.has(stage.id));
}

export function toLearnerClassroomBlock(
  block: InstructionalBlock,
  revealedStageIds: string[] = []
): LearnerClassroomBlock {
  const learner: LearnerClassroomBlock = {
    id: block.id,
    type: block.type,
    title: block.title,
    purpose: block.purpose,
    durationMinutes: block.durationMinutes,
    learnerContent: block.learnerContent,
    gradeLabel: block.gradeTarget.label,
    revealedContent: revealedStages(block, revealedStageIds).flatMap(
      (stage) => stage.learnerContent
    )
  };
  if ("prompt" in block) learner.prompt = block.prompt;
  if (block.type === "quick-check" || block.type === "exit-ticket") {
    learner.question = block.question;
    learner.options = block.options;
  }
  if (block.type === "visual") learner.visualData = block.visualData;
  return learner;
}

export function analyseQuickCheck(
  counts: Record<string, number>,
  block?: CheckInstructionalBlock
): QuickCheckAnalysis {
  const cleanCounts = Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, Math.max(0, Math.trunc(value || 0))])
  );
  const totalResponses = Object.values(cleanCounts).reduce((total, value) => total + value, 0);
  if (totalResponses === 0) {
    return {
      totalResponses: 0,
      suggestedAction:
        "Collect at least one anonymous response before interpreting the class signal."
    };
  }
  const correctResponses = block?.correctKey ? (cleanCounts[block.correctKey] ?? 0) : undefined;
  const correctPercent =
    correctResponses === undefined
      ? undefined
      : Math.round((correctResponses / totalResponses) * 100);
  const misconceptionCount = block?.misconceptionKey
    ? (cleanCounts[block.misconceptionKey] ?? 0)
    : 0;
  const misconceptionSignal =
    block?.misconceptionKey && misconceptionCount > 0
      ? `${Math.round((misconceptionCount / totalResponses) * 100)}% selected ${block.misconceptionKey}.`
      : undefined;
  const matchedGuidance = block?.responseGuidance.find((guidance) => {
    const keyMatches = guidance.key ? (cleanCounts[guidance.key] ?? 0) > 0 : true;
    const thresholdMatches =
      guidance.maximumCorrectPercent === undefined ||
      (correctPercent !== undefined && correctPercent <= guidance.maximumCorrectPercent);
    return keyMatches && thresholdMatches;
  });
  return {
    totalResponses,
    ...(correctResponses === undefined ? {} : { correctResponses }),
    ...(correctPercent === undefined ? {} : { correctPercent }),
    ...(misconceptionSignal ? { misconceptionSignal } : {}),
    suggestedAction:
      matchedGuidance?.message ??
      (correctPercent !== undefined && correctPercent < 70
        ? "Pause and model the reasoning once more before moving on."
        : "Invite one learner to explain the reasoning, then continue.")
  };
}

export function resultAnalysis(result: QuickCheckResult, block?: CheckInstructionalBlock) {
  return analyseQuickCheck(result.counts, block);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function generateSecureShareToken() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random token generation is unavailable in this browser.");
  }
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashShareToken(rawToken: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure token hashing is unavailable in this browser.");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawToken)
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export function presentationStorageKey(planId: string) {
  return `chalkbox:presentation:${planId}`;
}

export function activeClassroomBlocks(plan: LessonPlan) {
  return plan.classroomBlocks;
}
