import type { Board, GradeLevel, Subject } from "@chalkbox/contracts";
import { boards, gradeLevels, subjects } from "@chalkbox/contracts";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileQuestion,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDomain } from "@/state/domain-context";

interface CurriculumUnit {
  id: string;
  board: Board;
  grade: GradeLevel;
  subject: Subject;
  unit: string;
  topics: string[];
  outcome: string;
  sourceLabel: string;
  sourceUrl: string;
  alignmentNote: string;
}

const units: CurriculumUnit[] = [
  {
    id: "curriculum_water_6",
    board: "CBSE/NCERT",
    grade: "6",
    subject: "Science",
    unit: "Water and changes of state",
    topics: ["Evaporation", "Condensation", "Water cycle", "Water conservation"],
    outcome:
      "Learners connect observable changes of state with weather, local water use and a labelled cycle.",
    sourceLabel: "CBSE academic learning-outcome taxonomy",
    sourceUrl: "https://cbseacademic.nic.in/",
    alignmentNote:
      "The unit map is original ChalkBox metadata aligned to public curriculum expectations; textbook prose is not reproduced."
  },
  {
    id: "curriculum_fraction_5",
    board: "CBSE/NCERT",
    grade: "5",
    subject: "Mathematics",
    unit: "Fractions in everyday contexts",
    topics: ["Equal parts", "Equivalent fractions", "Comparing fractions", "Number line"],
    outcome:
      "Learners represent, compare and justify fractions using concrete models and number relationships.",
    sourceLabel: "CBSE mathematics grade taxonomy",
    sourceUrl: "https://cbseacademic.nic.in/",
    alignmentNote: "Original ChalkBox progression aligned to public grade-level taxonomy."
  },
  {
    id: "curriculum_pov_7",
    board: "CBSE/NCERT",
    grade: "7",
    subject: "English",
    unit: "Narrative voice and point of view",
    topics: ["First person", "Third person", "Narrator clues", "Perspective rewrite"],
    outcome:
      "Learners identify narrative perspective and sustain a changed viewpoint in a short original text.",
    sourceLabel: "CBSE language-learning outcomes",
    sourceUrl: "https://cbseacademic.nic.in/",
    alignmentNote: "Original ChalkBox examples aligned to public language-learning outcomes."
  },
  {
    id: "curriculum_local_governance_6",
    board: "State Board",
    grade: "6",
    subject: "Social Science",
    unit: "Local government and civic participation",
    topics: ["Gram Sabha", "Local services", "Citizen voice", "Public decisions"],
    outcome:
      "Learners connect local institutions with familiar community services and responsible participation.",
    sourceLabel: "State-board alignment placeholder",
    sourceUrl: "https://diksha.gov.in/",
    alignmentNote:
      "Teacher must select the exact state curriculum before generation; no state-specific claim is implied."
  },
  {
    id: "curriculum_environment_4",
    board: "CBSE/NCERT",
    grade: "4",
    subject: "Environmental Studies",
    unit: "Plants around our school",
    topics: ["Plant parts", "Local uses", "Growth needs", "Observation records"],
    outcome:
      "Learners observe and classify familiar plants using sketches, spoken evidence and local examples.",
    sourceLabel: "Public EVS grade taxonomy",
    sourceUrl: "https://cbseacademic.nic.in/",
    alignmentNote: "Original activity metadata; no textbook passage is stored."
  }
];

export function CurriculumExplorerPage() {
  const { assessmentQuestions } = useDomain();
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<GradeLevel | "all">("all");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [board, setBoard] = useState<Board | "all">("all");

  const visible = useMemo(
    () =>
      units.filter((unit) => {
        const haystack = `${unit.unit} ${unit.subject} ${unit.topics.join(" ")} ${unit.outcome}`;
        return (
          haystack.toLowerCase().includes(query.trim().toLowerCase()) &&
          (grade === "all" || unit.grade === grade) &&
          (subject === "all" || unit.subject === subject) &&
          (board === "all" || unit.board === board)
        );
      }),
    [board, grade, query, subject]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Plan from the curriculum, not a blank box"
        title="Curriculum Explorer"
        description="Move from board and grade to a focused learning outcome, reviewed questions and a prefilled lesson brief."
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-moss-900 p-5 text-white sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
            <label className="relative">
              <span className="sr-only">Search curriculum units</span>
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a chapter, concept or outcome…"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/10 pr-3 pl-9 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-emerald-300"
              />
            </label>
            <select
              value={board}
              onChange={(event) => setBoard(event.target.value as Board | "all")}
              className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold"
              aria-label="Board filter"
            >
              <option value="all" className="text-ink-950">
                All boards
              </option>
              {boards.map((item) => (
                <option key={item} value={item} className="text-ink-950">
                  {item}
                </option>
              ))}
            </select>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value as GradeLevel | "all")}
              className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold"
              aria-label="Grade filter"
            >
              <option value="all" className="text-ink-950">
                All classes
              </option>
              {gradeLevels.map((item) => (
                <option key={item} value={item} className="text-ink-950">
                  Class {item}
                </option>
              ))}
            </select>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as Subject | "all")}
              className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold"
              aria-label="Subject filter"
            >
              <option value="all" className="text-ink-950">
                All subjects
              </option>
              {subjects
                .filter((item) => item !== "Custom")
                .map((item) => (
                  <option key={item} value={item} className="text-ink-950">
                    {item}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          {(
            [
              [ShieldCheck, "Source-aware", "Attribution stays visible"],
              [BookOpenCheck, "Outcome-first", "No generic topic drift"],
              [FileQuestion, "Assessment-linked", "Reviewed questions nearby"]
            ] as const
          ).map(([Icon, title, detail]) => (
            <div
              key={String(title)}
              className="surface-subtle flex items-center gap-3 rounded-xl p-3"
            >
              <span className="text-moss-700 grid size-9 place-items-center rounded-lg bg-white">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-black">{title}</span>
                <span className="text-muted text-[10px]">{detail}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {visible.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((unit) => {
            const questionCount = assessmentQuestions.filter(
              (question) =>
                question.grade === unit.grade &&
                question.subject === unit.subject &&
                unit.topics.some((topic) =>
                  `${question.topic} ${question.chapter}`
                    .toLowerCase()
                    .includes(topic.toLowerCase())
                )
            ).length;
            const params = new URLSearchParams({
              grade: unit.grade,
              subject: unit.subject,
              board: unit.board,
              topic: unit.topics[0] ?? unit.unit
            });
            return (
              <Card
                key={unit.id}
                className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="to-moss-50 border-b border-black/5 bg-gradient-to-br from-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <Badge tone="green">Class {unit.grade}</Badge>
                      <Badge tone="blue">{unit.subject}</Badge>
                    </div>
                    <span className="text-muted text-[11px] font-black">{unit.board}</span>
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.03em]">{unit.unit}</h2>
                  <p className="text-muted mt-2 text-sm leading-6">{unit.outcome}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {unit.topics.map((topic) => (
                      <span
                        key={topic}
                        className="border-moss-700/10 text-moss-800 rounded-full border bg-white px-2.5 py-1 text-[11px] font-bold"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-700" />
                    <span>
                      <strong>{unit.sourceLabel}.</strong> {unit.alignmentNote}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-ink-500 text-xs font-bold">
                      {questionCount
                        ? `${questionCount} reviewed question${questionCount === 1 ? "" : "s"} available`
                        : "Build assessments after planning"}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        to={`/assessments?grade=${unit.grade}&subject=${encodeURIComponent(unit.subject)}`}
                      >
                        <Button variant="secondary" size="sm">
                          <FileQuestion className="size-4" /> Questions
                        </Button>
                      </Link>
                      <Link to={`/plans/new?${params.toString()}`}>
                        <Button size="sm">
                          <Sparkles className="size-4" /> Plan this unit{" "}
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="No curriculum units match"
          description="Try another class or clear one of the filters. Custom curricula can still be entered in Quick Brief."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setGrade("all");
                setSubject("all");
                setBoard("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
