import type { AssessmentQuestion, Subject } from "@chalkbox/contracts";
import {
  BookOpenCheck,
  ChevronRight,
  Filter,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { QuestionCard } from "@/components/assessment/QuestionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { safeMessage } from "@/lib/utils";
import { generateAssessmentVariant, type QuestionVariant } from "@/services/ai-actions";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

export function AssessmentBankPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = useAppStore((state) => state.profile);
  const { assessmentQuestions, plans, addQuestionToPlan, saveAssessmentQuestion, createWorksheet } =
    useDomain();
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState(searchParams.get("grade") ?? "all");
  const [subject, setSubject] = useState<Subject | "all">(
    (searchParams.get("subject") as Subject | null) ?? "all"
  );
  const [type, setType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [tray, setTray] = useState<string[]>([]);
  const [provenance, setProvenance] = useState<AssessmentQuestion | null>(null);
  const [lessonQuestion, setLessonQuestion] = useState<AssessmentQuestion | null>(null);
  const [variantSource, setVariantSource] = useState<AssessmentQuestion | null>(null);
  const [variantType, setVariantType] = useState<QuestionVariant>("similar");
  const [variantDraft, setVariantDraft] = useState<AssessmentQuestion | null>(null);
  const [variantProvider, setVariantProvider] = useState<"gemini" | "prepared-demo">(
    "prepared-demo"
  );
  const [variantModel, setVariantModel] = useState("Prepared ChalkBox variant");
  const [variantLoading, setVariantLoading] = useState(false);

  const visible = useMemo(
    () =>
      assessmentQuestions.filter((question) => {
        const haystack =
          `${question.prompt} ${question.topic} ${question.chapter} ${question.subject}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (grade === "all" || question.grade === grade) &&
          (subject === "all" || question.subject === subject) &&
          (type === "all" || question.type === type) &&
          (difficulty === "all" || question.difficulty === difficulty) &&
          (purpose === "all" || question.purpose === purpose)
        );
      }),
    [assessmentQuestions, difficulty, grade, purpose, query, subject, type]
  );

  const toggleTray = (question: AssessmentQuestion) =>
    setTray((current) =>
      current.includes(question.id)
        ? current.filter((item) => item !== question.id)
        : [...current, question.id]
    );

  const buildWorksheet = async () => {
    const worksheet = await createWorksheet(tray);
    toast.success("Worksheet tray converted to an editable draft");
    navigate(`/worksheets/${worksheet.id}`);
  };
  const prepareVariant = async (question: AssessmentQuestion, variant: QuestionVariant) => {
    setVariantSource(question);
    setVariantType(variant);
    setVariantLoading(true);
    try {
      const generated = await generateAssessmentVariant(question, variant);
      setVariantDraft(generated.result);
      setVariantProvider(generated.provider);
      setVariantModel(generated.model);
    } catch (caught) {
      toast.error("Question variant could not be generated", { description: safeMessage(caught) });
    } finally {
      setVariantLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Curriculum-aligned assessment"
        title="Assessment Bank"
        description="Find transparent, reusable questions without creating student accounts or collecting learner identities."
        actions={
          <Button onClick={buildWorksheet} disabled={!tray.length}>
            <Layers3 className="size-4" /> Worksheet tray · {tray.length}
          </Button>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-moss-900 grid gap-3 p-4 text-white md:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
          <label className="relative">
            <span className="sr-only">Search questions</span>
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topic, chapter or question…"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/10 pr-3 pl-9 text-sm font-bold text-white placeholder:text-white/45"
            />
          </label>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold"
          >
            <option value="" disabled className="text-ink-950">
              Class
            </option>
            <option value="all" className="text-ink-950">
              All classes
            </option>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((item) => (
              <option key={item} value={item} className="text-ink-950">
                Class {item}
              </option>
            ))}
          </select>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value as Subject | "all")}
            className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold"
          >
            <option value="all" className="text-ink-950">
              All subjects
            </option>
            {[...new Set(assessmentQuestions.map((item) => item.subject))].map((item) => (
              <option key={item} value={item} className="text-ink-950">
                {item}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold"
          >
            <option value="all" className="text-ink-950">
              All formats
            </option>
            <option value="mcq" className="text-ink-950">
              MCQ
            </option>
            <option value="true-false" className="text-ink-950">
              True / false
            </option>
            <option value="short-answer" className="text-ink-950">
              Short answer
            </option>
            <option value="long-answer" className="text-ink-950">
              Long answer
            </option>
          </select>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setGrade("all");
              setSubject("all");
              setType("all");
              setDifficulty("all");
              setPurpose("all");
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 text-sm font-black hover:bg-white/15"
          >
            <Filter className="size-4" /> Reset
          </button>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          {(
            [
              ["all", "All difficulty"],
              ["foundation", "Foundation"],
              ["core", "Core"],
              ["challenge", "Challenge"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDifficulty(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${difficulty === value ? "bg-moss-700 text-white" : "surface-subtle text-ink-700"}`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-7 w-px bg-black/8" />
          {(
            [
              ["all", "Any purpose"],
              ["diagnostic", "Diagnostic"],
              ["formative", "Formative"],
              ["exit-ticket", "Exit ticket"],
              ["application", "Application"],
              ["hots", "HOTS"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPurpose(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${purpose === value ? "bg-sun-500 text-ink-950" : "surface-subtle text-ink-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted text-xs font-bold">
          {visible.length} reviewed and teacher-visible questions
        </p>
        <p className="text-moss-700 flex items-center gap-1.5 text-xs font-bold">
          <ShieldCheck className="size-3.5" /> Every item shows provenance
        </p>
      </div>
      {visible.length ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              selected={tray.includes(question.id)}
              onToggleWorksheet={toggleTray}
              onAddToLesson={setLessonQuestion}
              onGenerateSimilar={(item) => {
                void prepareVariant(item, "similar");
              }}
              onViewProvenance={setProvenance}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="No questions match"
          description="Clear one filter or search for another chapter."
        />
      )}

      {tray.length > 0 && (
        <div className="safe-bottom border-moss-700/20 bg-moss-900 fixed right-4 bottom-4 z-30 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border p-4 text-white shadow-2xl lg:right-8">
          <div className="flex items-center gap-3">
            <span className="bg-sun-500 text-ink-950 grid size-10 place-items-center rounded-xl font-black">
              {tray.length}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black">Worksheet tray</p>
              <p className="truncate text-xs text-white/65">Reorder, edit marks and export next</p>
            </div>
            <Button variant="sun" size="sm" onClick={buildWorksheet}>
              Build <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {provenance && (
        <div
          className="bg-ink-950/40 fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Question provenance"
        >
          <button
            className="flex-1"
            aria-label="Close provenance"
            onClick={() => setProvenance(null)}
          />
          <aside className="surface h-full w-full max-w-md overflow-y-auto border-l p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Question provenance</h2>
              <button onClick={() => setProvenance(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="bg-moss-50 mt-6 rounded-2xl p-5">
              <Badge tone={provenance.reviewState === "curator-approved" ? "green" : "amber"}>
                {provenance.reviewState.replaceAll("-", " ")}
              </Badge>
              <p className="mt-4 text-sm leading-7 font-bold">{provenance.prompt}</p>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-muted text-xs font-black uppercase">Origin</dt>
                <dd className="mt-1 font-bold">{provenance.provenance.replaceAll("-", " ")}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-black uppercase">Attribution</dt>
                <dd className="mt-1 leading-6">
                  {provenance.attribution ?? "No external source attribution required."}
                </dd>
              </div>
              {provenance.source && (
                <div>
                  <dt className="text-muted text-xs font-black uppercase">Grounding source</dt>
                  <dd className="mt-1 font-bold">{provenance.source.title}</dd>
                  <dd className="text-muted mt-1 text-xs">{provenance.source.license}</dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      )}

      {lessonQuestion && (
        <div
          className="bg-ink-950/45 fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add question to lesson"
        >
          <Card className="w-full max-w-lg p-6">
            <h2 className="text-xl font-black">Add to which lesson?</h2>
            <p className="text-muted mt-2 text-sm">
              The question becomes an editable objective-linked assessment item.
            </p>
            <div className="mt-5 space-y-2">
              {plans.slice(0, 5).map((plan) => (
                <button
                  key={plan.id}
                  onClick={async () => {
                    await addQuestionToPlan(lessonQuestion.id, plan.id);
                    setLessonQuestion(null);
                    toast.success("Question added to lesson");
                  }}
                  className="hover:border-moss-500 surface flex w-full items-center justify-between rounded-xl border p-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-black">{plan.title}</span>
                    <span className="text-muted text-xs">
                      Class {plan.grade} · {plan.subject}
                    </span>
                  </span>
                  <ChevronRight className="size-4" />
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setLessonQuestion(null)}>
              Cancel
            </Button>
          </Card>
        </div>
      )}

      {variantSource && (
        <div
          className="bg-ink-950/45 fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Generate similar question"
        >
          <Card className="w-full max-w-2xl overflow-hidden">
            <div className="bg-moss-900 p-6 text-white">
              <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
                AI-assisted variant
              </p>
              <h2 className="mt-2 text-2xl font-black">Teacher review required</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "easier",
                    "similar",
                    "harder",
                    "application",
                    "misconception",
                    "hindi",
                    "bilingual"
                  ] as QuestionVariant[]
                ).map((variant) => (
                  <button
                    key={variant}
                    disabled={variantLoading}
                    onClick={() => void prepareVariant(variantSource, variant)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black disabled:opacity-40 ${variantType === variant ? "bg-moss-700 text-white" : "surface-subtle"}`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
              {variantLoading ? (
                <div className="bg-moss-50 mt-5 rounded-2xl p-8 text-center">
                  <Sparkles className="text-moss-700 mx-auto size-6 animate-pulse" />
                  <p className="mt-3 text-sm font-black">Building a curriculum-grounded variant…</p>
                </div>
              ) : variantDraft ? (
                <>
                  <label className="mt-5 block text-sm font-black">
                    Editable question
                    <textarea
                      value={variantDraft.prompt}
                      onChange={(event) =>
                        setVariantDraft({
                          ...variantDraft,
                          prompt: event.target.value,
                          updatedAt: new Date().toISOString()
                        })
                      }
                      rows={4}
                      className="surface mt-2 w-full rounded-xl border p-3 text-sm leading-6"
                    />
                  </label>
                  <div
                    className={`mt-5 rounded-xl border p-3 text-xs font-bold ${variantProvider === "gemini" ? "border-violet-200 bg-violet-50 text-violet-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                  >
                    <Sparkles className="mr-1 inline size-3.5" />{" "}
                    {variantProvider === "gemini"
                      ? `AI-derived with ${variantModel}`
                      : "Prepared demonstration variant—not a live AI response"}{" "}
                    · teacher review required.
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setVariantSource(null);
                        setVariantDraft(null);
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={async () => {
                        await saveAssessmentQuestion({
                          ...variantDraft,
                          ...(profile?.id ? { ownerId: profile.id } : {}),
                          reviewState: "teacher-reviewed"
                        });
                        setVariantSource(null);
                        setVariantDraft(null);
                        toast.success("Reviewed variant added to your bank");
                      }}
                    >
                      <ShieldCheck className="size-4" /> Accept reviewed
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  No variant is available. Choose another option or close this dialog.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
