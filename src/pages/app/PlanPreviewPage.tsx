import { PDFDownloadLink } from "@react-pdf/renderer";
import { ArrowLeft, CheckCircle2, Download, Edit3, Play, Printer, Share2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LessonPlanDocument } from "@/components/plans/LessonPlanDocument";
import { LessonTimeline } from "@/components/plans/LessonTimeline";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { SourceDisclosure } from "@/components/plans/SourceDisclosure";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function PlanPreviewPage() {
  const { planId } = useParams();
  const plan = useAppStore((state) => state.plans.find((item) => item.id === planId));
  const updatePlan = useAppStore((state) => state.updatePlan);
  if (!plan)
    return (
      <EmptyState
        icon={Edit3}
        title="Plan not found"
        description="Return to your library and choose an available plan."
        action={
          <Link to="/library">
            <Button>Open library</Button>
          </Link>
        }
      />
    );
  const share = async () => {
    const slug = plan.publicSlug ?? `${plan.id}-shared`;
    await updatePlan(plan.id, { isPublic: true, publicSlug: slug });
    const url = `${window.location.origin}/share/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", {
        description: "Anyone with the link can view a read-only plan."
      });
    } catch {
      toast.info("Share link ready", { description: url });
    }
  };
  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Link
          to={`/plans/${plan.id}/edit`}
          className="text-ink-500 hover:text-moss-700 mr-auto inline-flex items-center gap-2 text-sm font-bold"
        >
          <ArrowLeft className="size-4" />
          Back to editor
        </Link>
        <Button variant="secondary" size="sm" onClick={share}>
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
        <PDFDownloadLink
          document={<LessonPlanDocument plan={plan} />}
          fileName={`ChalkBox-${plan.title.replace(/[^a-z0-9]/gi, "-")}.pdf`}
        >
          {({ loading }) => (
            <Button variant="secondary" size="sm" loading={loading}>
              <Download className="size-4" />
              PDF
            </Button>
          )}
        </PDFDownloadLink>
        <Link to={`/plans/${plan.id}/teach`}>
          <Button size="sm">
            <Play className="size-4" />
            Teach Mode
          </Button>
        </Link>
      </div>
      <article className="print-sheet surface shadow-card overflow-hidden rounded-3xl border">
        <header className="bg-moss-900 relative overflow-hidden p-7 text-white sm:p-10">
          <div className="bg-moss-500/25 absolute -top-24 -right-16 size-72 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black tracking-[0.17em] text-emerald-200 uppercase">
                ChalkBox classroom plan
              </p>
              <PlanStatusBadge status={plan.status} />
            </div>
            <h1 className="mt-7 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              {plan.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{plan.topic}</p>
            <dl className="mt-7 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/45 uppercase">
                  Grade
                </dt>
                <dd className="mt-1 font-black">{plan.grade}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/45 uppercase">
                  Subject
                </dt>
                <dd className="mt-1 font-black">{plan.subject}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/45 uppercase">
                  Duration
                </dt>
                <dd className="mt-1 font-black">{plan.durationMinutes} min</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/45 uppercase">
                  Class
                </dt>
                <dd className="mt-1 font-black">{plan.classSize} learners</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/45 uppercase">
                  Updated
                </dt>
                <dd className="mt-1 font-black">{formatDate(plan.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </header>
        <div className="space-y-8 p-6 sm:p-10">
          {plan.generationMode === "prepared-demo" && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-900">
              <strong>Prepared demo:</strong> this is a curated example, not a live AI response. It
              demonstrates the exact edit, teach, assess, reflect and export workflow.
            </div>
          )}
          <section>
            <p className="text-moss-700 text-xs font-black tracking-[0.16em] uppercase">
              Learning destination
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">By the end, learners can…</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-2">
              {plan.objectives.map((objective, index) => (
                <li key={objective.id} className="bg-paper flex gap-3 rounded-2xl p-4">
                  <span className="bg-moss-100 text-moss-700 grid size-8 shrink-0 place-items-center rounded-xl text-xs font-black">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm leading-6 font-bold">{objective.text}</p>
                    <p className="text-ink-500 mt-1 text-[10px] font-black tracking-wider uppercase">
                      {objective.bloomLevel}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-moss-700 text-xs font-black tracking-[0.16em] uppercase">
                  Lesson sequence
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {plan.activities.length} practical steps
                </h2>
              </div>
              <p className="text-moss-700 text-sm font-black">
                {plan.activities.reduce((sum, item) => sum + item.durationMinutes, 0)} min allocated
              </p>
            </div>
            <LessonTimeline activities={plan.activities} />
          </section>
          <section>
            <p className="text-moss-700 text-xs font-black tracking-[0.16em] uppercase">
              Assessment
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Evidence to look for</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {plan.assessments.map((assessment) => (
                <Card key={assessment.id} className="p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="text-moss-700 mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="text-sm leading-6 font-black">{assessment.prompt}</p>
                      <p className="text-muted mt-2 text-xs leading-5">
                        <span className="text-ink-700 font-black">Evidence guide: </span>
                        {assessment.answerGuide}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-amber-50 p-5">
              <h2 className="font-black text-amber-950">Homework / extension</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">{plan.homework}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-5">
              <h2 className="font-black text-blue-950">Teacher note</h2>
              <p className="mt-2 text-sm leading-6 text-blue-900">{plan.teacherNotes}</p>
            </div>
          </section>
          <SourceDisclosure plan={plan} />
        </div>
      </article>
    </div>
  );
}
