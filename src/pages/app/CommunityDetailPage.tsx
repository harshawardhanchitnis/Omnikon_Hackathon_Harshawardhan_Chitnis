import { ArrowLeft, Copy, Flag, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LessonTimeline } from "@/components/plans/LessonTimeline";
import { SourceDisclosure } from "@/components/plans/SourceDisclosure";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useDomain } from "@/state/domain-context";

export function CommunityDetailPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { publications, clonePlan, reportPublication } = useDomain();
  const [reportOpen, setReportOpen] = useState(false);
  const publication = publications.find(
    (item) => item.id === communityId && item.status === "approved"
  );
  if (!publication)
    return (
      <div>
        <Link to="/community">Community plan not found or no longer published.</Link>
      </div>
    );
  const source = publication.snapshot;
  const adapt = async () => {
    const clone = await clonePlan(source, `${source.title} — my classroom`);
    toast.success("Attributed private copy created", {
      description: "Review the classroom constraints before teaching."
    });
    navigate(`/plans/${clone.id}/edit`);
  };
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/community"
        className="text-ink-500 hover:text-moss-700 mb-5 inline-flex items-center gap-2 text-sm font-bold"
      >
        <ArrowLeft className="size-4" /> Back to community
      </Link>
      <Card className="overflow-hidden">
        <div className="bg-moss-900 p-7 text-white sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="green">
              <ShieldCheck className="size-3" /> Moderator approved
            </Badge>
            <span className="text-xs font-bold text-white/70">
              {publication.saves} saves · {publication.adaptations} adaptations
            </span>
          </div>
          <p className="mt-7 text-xs font-black tracking-wider text-emerald-200 uppercase">
            Class {source.grade}
            {source.additionalGrade ? ` + ${source.additionalGrade}` : ""} · {source.subject} ·{" "}
            {source.board}
          </p>
          <h1 className="mt-2 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            {source.title}
          </h1>
          <p className="mt-3 text-sm text-white/75">
            Shared by {publication.authorName} · {publication.authorSchool}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button variant="sun" onClick={adapt}>
              <Copy className="size-4" /> Adapt for my class
            </Button>
            <Button
              onClick={() => setReportOpen(true)}
              className="border-white/20 bg-white/10 text-white hover:bg-white/15"
            >
              <Flag className="size-4" /> Report concern
            </Button>
          </div>
        </div>
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="mb-7 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              <ShieldCheck className="mr-2 inline size-4" />
              <strong>Immutable and safe:</strong> this is the exact approved version, with private
              teacher notes removed. Adapting creates a new owner-only draft.
            </div>
            <h2 className="mb-5 text-2xl font-black">Lesson sequence preview</h2>
            <LessonTimeline activities={source.activities} compact />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <p className="text-ink-500 text-xs font-black tracking-wider uppercase">
                Plan context
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-muted text-xs">Topic</dt>
                  <dd className="font-bold">{source.topic}</dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">Classroom</dt>
                  <dd className="font-bold">
                    {source.classSize} learners · {source.durationMinutes} min
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">Language</dt>
                  <dd className="font-bold">{source.language}</dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">Quality</dt>
                  <dd className="text-moss-700 font-bold">{source.qualityScore}/100</dd>
                </div>
              </dl>
            </Card>
            <SourceDisclosure plan={source} />
          </aside>
        </div>
      </Card>
      {reportOpen && (
        <div
          className="bg-ink-950/50 fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report community lesson"
        >
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-black">Report a concern</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              The public demo records an aggregate moderation report, never learner data.
            </p>
            <div className="mt-5 grid gap-2">
              {(["inaccurate", "unsafe", "copyright", "spam", "other"] as const).map((reason) => (
                <button
                  key={reason}
                  onClick={async () => {
                    await reportPublication(publication.id, reason, `Demo report: ${reason}`);
                    setReportOpen(false);
                    toast.success("Report sent to moderation");
                  }}
                  className="surface hover:border-moss-500 rounded-xl border p-3 text-left text-sm font-black capitalize"
                >
                  {reason}
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
