import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Link2,
  Play,
  Printer,
  Share2,
  ShieldCheck,
  X
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LessonPlanDocument } from "@/components/plans/LessonPlanDocument";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { SourceDisclosure } from "@/components/plans/SourceDisclosure";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";

export function PlanPreviewPage() {
  const { planId } = useParams();
  const { plans, shares, createShare, revokeShare } = useDomain();
  const [shareOpen, setShareOpen] = useState(false);
  const [expiry, setExpiry] = useState<"never" | "7" | "30">("30");
  const [createdUrl, setCreatedUrl] = useState("");
  const [renderNow] = useState(() => Date.now());
  const plan = plans.find((item) => item.id === planId);
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
    const expiresAt =
      expiry === "never"
        ? undefined
        : new Date(Date.now() + Number(expiry) * 24 * 60 * 60 * 1000).toISOString();
    const snapshot = await createShare(plan.id, expiresAt);
    if (!snapshot.rawToken) throw new Error("Secure share token was not created");
    const url = `${window.location.origin}/share/${snapshot.rawToken}`;
    setCreatedUrl(url);
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
        <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
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
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">{plan.topic}</p>
            <dl className="mt-7 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/75 uppercase">
                  Grade
                </dt>
                <dd className="mt-1 font-black">{plan.grade}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/75 uppercase">
                  Subject
                </dt>
                <dd className="mt-1 font-black">{plan.subject}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/75 uppercase">
                  Duration
                </dt>
                <dd className="mt-1 font-black">{plan.durationMinutes} min</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/75 uppercase">
                  Class
                </dt>
                <dd className="mt-1 font-black">{plan.classSize} learners</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black tracking-wider text-white/75 uppercase">
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
                  Classroom Teaching Engine
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {plan.classroomBlocks.length} structured blocks
                </h2>
              </div>
              <p className="text-moss-700 text-sm font-black">
                {plan.classroomBlocks.reduce((sum, item) => sum + item.durationMinutes, 0)} /{" "}
                {plan.durationMinutes} min
              </p>
            </div>
            <ol className="grid gap-3">
              {plan.classroomBlocks.map((block, index) => (
                <li key={block.id} className="rounded-2xl border border-black/6 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-moss-700 grid size-8 place-items-center rounded-xl text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black tracking-wider text-emerald-700 uppercase">
                        {block.type.replaceAll("-", " ")} · {block.gradeTarget.label}
                      </p>
                      <h3 className="mt-1 font-black">{block.title}</h3>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950">
                      {block.durationMinutes} min
                    </span>
                  </div>
                  <p className="text-muted mt-3 text-sm leading-6">{block.purpose}</p>
                </li>
              ))}
            </ol>
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
      {shareOpen && (
        <div
          className="bg-ink-950/50 fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Manage read-only shares"
        >
          <Card className="my-4 w-full max-w-2xl overflow-hidden">
            <div className="bg-moss-900 flex items-start justify-between gap-4 p-6 text-white">
              <div>
                <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
                  Immutable sharing
                </p>
                <h2 className="mt-1 text-2xl font-black">Share this exact version</h2>
                <p className="mt-2 text-xs leading-5 text-white/65">
                  Private notes and ownership metadata are removed. Future edits never alter an
                  existing link.
                </p>
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="grid size-9 place-items-center rounded-xl hover:bg-white/10"
                aria-label="Close sharing"
              >
                <X />
              </button>
            </div>
            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="text-sm font-black">
                  Link expiry
                  <select
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value as typeof expiry)}
                    className="surface mt-2 h-11 w-full rounded-xl border px-3 text-sm font-bold"
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="never">No expiry</option>
                  </select>
                </label>
                <Button onClick={share}>
                  <Link2 className="size-4" /> Create snapshot link
                </Button>
              </div>
              {createdUrl && (
                <div className="border-moss-200 bg-moss-50 mt-4 rounded-xl border p-3">
                  <p className="text-moss-800 text-xs font-black">Link ready</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={createdUrl}
                      readOnly
                      className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(createdUrl);
                        toast.success("Link copied");
                      }}
                      className="text-moss-800 grid size-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm"
                      aria-label="Copy link"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-6 border-t border-black/5 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black">Active snapshots</h3>
                  <span className="text-ink-500 text-xs font-bold">
                    {shares.filter((item) => item.planId === plan.id && !item.revokedAt).length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {shares
                    .filter((item) => item.planId === plan.id)
                    .map((item) => {
                      const expired = Boolean(
                        item.expiresAt && new Date(item.expiresAt).getTime() <= renderNow
                      );
                      const inactive = Boolean(item.revokedAt || expired);
                      return (
                        <div
                          key={item.id}
                          className="surface-subtle flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center"
                        >
                          <ShieldCheck
                            className={`size-4 shrink-0 ${inactive ? "text-slate-400" : "text-moss-700"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black">
                              {item.rawToken
                                ? `…/${item.rawToken.slice(-18)}`
                                : `Secure snapshot ${item.tokenHash.slice(0, 10)}…`}
                            </p>
                            <p className="text-muted mt-0.5 text-[10px]">
                              Created {new Date(item.createdAt).toLocaleDateString("en-IN")} ·{" "}
                              {item.revokedAt
                                ? "Revoked"
                                : expired
                                  ? "Expired"
                                  : item.expiresAt
                                    ? `Expires ${new Date(item.expiresAt).toLocaleDateString("en-IN")}`
                                    : "No expiry"}
                            </p>
                          </div>
                          {!inactive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await revokeShare(item.id);
                                toast.success("Share link revoked");
                              }}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  {!shares.some((item) => item.planId === plan.id) && (
                    <p className="text-muted rounded-xl border border-dashed border-black/10 p-4 text-center text-xs">
                      No share links yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
