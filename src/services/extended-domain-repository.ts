import type {
  AssessmentQuestion,
  ClassroomProfile,
  CommunityPublication,
  PlanVersion,
  PublicationReport,
  QuickCheckResult,
  ShareSnapshot,
  Worksheet
} from "@chalkbox/contracts";
import { supabase } from "@/lib/supabase";

export interface ExtendedDomainRemote {
  planVersions: PlanVersion[];
  shares: ShareSnapshot[];
  classroomProfiles: ClassroomProfile[];
  assessmentQuestions: AssessmentQuestion[];
  worksheets: Worksheet[];
  publications: CommunityPublication[];
  publicationReports: PublicationReport[];
  quickChecks: QuickCheckResult[];
}

const empty: ExtendedDomainRemote = {
  planVersions: [],
  shares: [],
  classroomProfiles: [],
  assessmentQuestions: [],
  worksheets: [],
  publications: [],
  publicationReports: [],
  quickChecks: []
};

export async function loadExtendedDomainRemote(): Promise<ExtendedDomainRemote> {
  if (!supabase) return empty;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return empty;
  const [versions, shares, classrooms, questions, worksheets, publications, reports, quickChecks] =
    await Promise.all([
      supabase.from("plan_versions").select("*").order("created_at", { ascending: false }),
      supabase
        .from("share_snapshots")
        .select("*")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: false }),
      supabase.from("classroom_profiles").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("assessment_questions")
        .select("*, source:curriculum_sources(*)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("worksheets")
        .select("*, worksheet_items(*)")
        .order("updated_at", { ascending: false }),
      supabase.from("community_publications").select("*").order("updated_at", { ascending: false }),
      supabase.from("publication_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("quick_checks").select("*").order("created_at", { ascending: false })
    ]);
  const error =
    versions.error ??
    shares.error ??
    classrooms.error ??
    questions.error ??
    worksheets.error ??
    publications.error ??
    reports.error ??
    quickChecks.error;
  if (error) throw new Error(error.message);
  return {
    planVersions: (versions.data ?? []).map((row) => ({
      id: row.id,
      planId: row.plan_id,
      ownerId: row.owner_id,
      versionNumber: row.version_number,
      reason: row.reason as PlanVersion["reason"],
      ...(row.label ? { label: row.label } : {}),
      snapshot: row.snapshot as PlanVersion["snapshot"],
      createdAt: row.created_at
    })),
    shares: (shares.data ?? []).map((row) => ({
      id: row.id,
      token: row.token,
      planId: row.plan_id,
      planVersionId: row.plan_version_id,
      ownerId: row.owner_id,
      snapshot: row.snapshot as ShareSnapshot["snapshot"],
      createdAt: row.created_at,
      ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
      ...(row.revoked_at ? { revokedAt: row.revoked_at } : {})
    })),
    classroomProfiles: (classrooms.data ?? []).map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      grade: row.grade as ClassroomProfile["grade"],
      ...(row.additional_grade
        ? { additionalGrade: row.additional_grade as ClassroomProfile["grade"] }
        : {}),
      learnerCount: row.learner_count,
      board: row.board as ClassroomProfile["board"],
      ...(row.custom_board ? { customBoard: row.custom_board } : {}),
      language: row.language as ClassroomProfile["language"],
      internetAvailability: row.internet_availability as ClassroomProfile["internetAvailability"],
      projectorAvailable: row.projector_available,
      chalkboardAvailable: row.chalkboard_available,
      commonMaterials: row.common_materials as string[],
      mixedAbility: row.mixed_ability,
      readingSupportNeeds: row.reading_support_needs as string[],
      accessibilityConsiderations: row.accessibility_considerations as string[],
      typicalDurationMinutes: row.typical_duration_minutes,
      archived: row.archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    assessmentQuestions: (questions.data ?? []).map((row) => ({
      id: row.id,
      ...(row.owner_id ? { ownerId: row.owner_id } : {}),
      board: row.board as AssessmentQuestion["board"],
      grade: row.grade as AssessmentQuestion["grade"],
      subject: row.subject as AssessmentQuestion["subject"],
      ...(row.custom_subject ? { customSubject: row.custom_subject } : {}),
      bookOrUnit: row.book_or_unit,
      chapter: row.chapter,
      topic: row.topic,
      prompt: row.prompt,
      type: row.type as AssessmentQuestion["type"],
      purpose: row.purpose as AssessmentQuestion["purpose"],
      difficulty: row.difficulty as AssessmentQuestion["difficulty"],
      language: row.language as AssessmentQuestion["language"],
      marks: row.marks,
      ...(row.options ? { options: row.options as string[] } : {}),
      answer: row.answer,
      ...(row.explanation ? { explanation: row.explanation } : {}),
      ...(row.misconception_target ? { misconceptionTarget: row.misconception_target } : {}),
      provenance: row.provenance as AssessmentQuestion["provenance"],
      reviewState: row.review_state as AssessmentQuestion["reviewState"],
      ...(row.source
        ? {
            source: {
              id: row.source.id,
              title: row.source.title,
              publisher: row.source.publisher,
              url: row.source.source_url,
              license: row.source.licence,
              attribution: row.source.attribution,
              grade: (row.source.grade ?? row.grade) as AssessmentQuestion["grade"],
              subject: (row.source.subject ?? row.subject) as AssessmentQuestion["subject"]
            }
          }
        : {}),
      ...(row.attribution ? { attribution: row.attribution } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    worksheets: (worksheets.data ?? []).map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      instructions: row.instructions,
      grade: row.grade as Worksheet["grade"],
      subject: row.subject as Worksheet["subject"],
      ...(row.custom_subject ? { customSubject: row.custom_subject } : {}),
      chapter: row.chapter,
      language: row.language as Worksheet["language"],
      includeAnswers: row.include_answers,
      items: (row.worksheet_items ?? [])
        .map(
          (item: {
            id: string;
            question_id: string;
            question_snapshot: AssessmentQuestion;
            item_order: number;
            marks: number;
          }) => ({
            id: item.id,
            questionId: item.question_id,
            questionSnapshot: item.question_snapshot,
            order: item.item_order,
            marks: item.marks
          })
        )
        .sort((a: Worksheet["items"][number], b: Worksheet["items"][number]) => a.order - b.order),
      status: row.status as Worksheet["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    publications: (publications.data ?? []).map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      planId: row.plan_id,
      planVersionId: row.plan_version_id,
      snapshot: row.snapshot as CommunityPublication["snapshot"],
      authorName: row.author_name,
      authorSchool: row.author_school,
      status: row.status as CommunityPublication["status"],
      ...(row.submitted_at ? { submittedAt: row.submitted_at } : {}),
      ...(row.reviewed_at ? { reviewedAt: row.reviewed_at } : {}),
      ...(row.reviewed_by ? { reviewedBy: row.reviewed_by } : {}),
      ...(row.rejection_reason ? { rejectionReason: row.rejection_reason } : {}),
      saves: row.saves,
      adaptations: row.adaptations,
      reports: row.reports,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    publicationReports: (reports.data ?? []).map((row) => ({
      id: row.id,
      publicationId: row.publication_id,
      reporterId: row.reporter_id,
      reason: row.reason as PublicationReport["reason"],
      note: row.note,
      status: row.status as PublicationReport["status"],
      createdAt: row.created_at
    })),
    quickChecks: (quickChecks.data ?? []).map((row) => ({
      id: row.id,
      planId: row.plan_id,
      sessionId: row.session_id,
      ownerId: row.owner_id,
      ...(row.activity_id ? { activityId: row.activity_id } : {}),
      prompt: row.prompt,
      mode: row.mode as QuickCheckResult["mode"],
      counts: row.counts as Record<string, number>,
      ...(row.correct_key ? { correctKey: row.correct_key } : {}),
      ...(row.note ? { note: row.note } : {}),
      createdAt: row.created_at
    }))
  };
}

export async function savePlanVersionRemote(version: PlanVersion) {
  if (!supabase) return;
  const { error } = await supabase.from("plan_versions").upsert({
    id: version.id,
    plan_id: version.planId,
    owner_id: version.ownerId,
    version_number: version.versionNumber,
    reason: version.reason,
    label: version.label ?? null,
    snapshot: version.snapshot,
    created_at: version.createdAt
  });
  if (error) throw new Error(error.message);
}

export async function saveShareRemote(share: ShareSnapshot) {
  if (!supabase) return;
  const { error } = await supabase.from("share_snapshots").upsert({
    id: share.id,
    token: share.token,
    plan_id: share.planId,
    plan_version_id: share.planVersionId,
    owner_id: share.ownerId,
    snapshot: share.snapshot,
    created_at: share.createdAt,
    expires_at: share.expiresAt ?? null,
    revoked_at: share.revokedAt ?? null
  });
  if (error) throw new Error(error.message);
}

export async function revokeShareRemote(id: string, revokedAt: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("share_snapshots")
    .update({ revoked_at: revokedAt })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveClassroomRemote(classroom: ClassroomProfile) {
  if (!supabase) return;
  const { error } = await supabase.from("classroom_profiles").upsert({
    id: classroom.id,
    owner_id: classroom.ownerId,
    name: classroom.name,
    grade: classroom.grade,
    additional_grade: classroom.additionalGrade ?? null,
    learner_count: classroom.learnerCount,
    board: classroom.board,
    custom_board: classroom.customBoard ?? null,
    language: classroom.language,
    internet_availability: classroom.internetAvailability,
    projector_available: classroom.projectorAvailable,
    chalkboard_available: classroom.chalkboardAvailable,
    common_materials: classroom.commonMaterials,
    mixed_ability: classroom.mixedAbility,
    reading_support_needs: classroom.readingSupportNeeds,
    accessibility_considerations: classroom.accessibilityConsiderations,
    typical_duration_minutes: classroom.typicalDurationMinutes,
    archived: classroom.archived,
    created_at: classroom.createdAt,
    updated_at: classroom.updatedAt
  });
  if (error) throw new Error(error.message);
}

export async function saveAssessmentQuestionRemote(question: AssessmentQuestion) {
  if (!supabase) return;
  const remoteSourceId =
    question.source?.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      question.source.id
    )
      ? question.source.id
      : null;
  const { error } = await supabase.from("assessment_questions").upsert({
    id: question.id,
    owner_id: question.ownerId ?? null,
    board: question.board,
    grade: question.grade,
    subject: question.subject,
    custom_subject: question.customSubject ?? null,
    book_or_unit: question.bookOrUnit,
    chapter: question.chapter,
    topic: question.topic,
    prompt: question.prompt,
    type: question.type,
    purpose: question.purpose,
    difficulty: question.difficulty,
    language: question.language,
    marks: question.marks,
    options: question.options ?? null,
    answer: question.answer,
    explanation: question.explanation ?? null,
    misconception_target: question.misconceptionTarget ?? null,
    provenance: question.provenance,
    review_state: question.reviewState,
    // Local curriculum fixtures use readable identifiers; only database UUIDs satisfy the FK.
    source_id: remoteSourceId,
    attribution: question.attribution ?? null,
    created_at: question.createdAt,
    updated_at: question.updatedAt
  });
  if (error) throw new Error(error.message);
}

export async function saveWorksheetRemote(worksheet: Worksheet) {
  if (!supabase) return;
  const { error } = await supabase.from("worksheets").upsert({
    id: worksheet.id,
    owner_id: worksheet.ownerId,
    title: worksheet.title,
    instructions: worksheet.instructions,
    grade: worksheet.grade,
    subject: worksheet.subject,
    custom_subject: worksheet.customSubject ?? null,
    chapter: worksheet.chapter,
    language: worksheet.language,
    include_answers: worksheet.includeAnswers,
    status: worksheet.status,
    created_at: worksheet.createdAt,
    updated_at: worksheet.updatedAt
  });
  if (error) throw new Error(error.message);
  const { error: deleteError } = await supabase
    .from("worksheet_items")
    .delete()
    .eq("worksheet_id", worksheet.id);
  if (deleteError) throw new Error(deleteError.message);
  if (!worksheet.items.length) return;
  const { error: itemError } = await supabase.from("worksheet_items").insert(
    worksheet.items.map((item) => ({
      id: item.id,
      worksheet_id: worksheet.id,
      question_id: item.questionId,
      question_snapshot: item.questionSnapshot,
      item_order: item.order,
      marks: item.marks
    }))
  );
  if (itemError) throw new Error(itemError.message);
}

export async function savePublicationRemote(publication: CommunityPublication) {
  if (!supabase) return;
  const { error } = await supabase.from("community_publications").upsert({
    id: publication.id,
    owner_id: publication.ownerId,
    plan_id: publication.planId,
    plan_version_id: publication.planVersionId,
    snapshot: publication.snapshot,
    author_name: publication.authorName,
    author_school: publication.authorSchool,
    status: publication.status,
    submitted_at: publication.submittedAt ?? null,
    reviewed_at: publication.reviewedAt ?? null,
    reviewed_by: publication.reviewedBy ?? null,
    rejection_reason: publication.rejectionReason ?? null,
    saves: publication.saves,
    adaptations: publication.adaptations,
    reports: publication.reports,
    created_at: publication.createdAt,
    updated_at: publication.updatedAt
  });
  if (error) throw new Error(error.message);
}

export async function savePublicationReportRemote(report: PublicationReport) {
  if (!supabase) return;
  const { error } = await supabase.from("publication_reports").upsert({
    id: report.id,
    publication_id: report.publicationId,
    reporter_id: report.reporterId,
    reason: report.reason,
    note: report.note,
    status: report.status,
    created_at: report.createdAt
  });
  if (error) throw new Error(error.message);
}

export async function saveQuickCheckRemote(check: QuickCheckResult) {
  if (!supabase) return;
  const { error } = await supabase.from("quick_checks").upsert({
    id: check.id,
    plan_id: check.planId,
    session_id: check.sessionId,
    owner_id: check.ownerId,
    activity_id: check.activityId ?? null,
    prompt: check.prompt,
    mode: check.mode,
    counts: check.counts,
    correct_key: check.correctKey ?? null,
    note: check.note ?? null,
    created_at: check.createdAt
  });
  if (error) throw new Error(error.message);
}
