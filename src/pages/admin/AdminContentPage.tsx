import {
  BookMarked,
  CheckCircle2,
  Database,
  Eye,
  FileSearch,
  RefreshCw,
  ShieldAlert,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LessonTimeline } from "@/components/plans/LessonTimeline";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDomain } from "@/state/domain-context";

const sources = [
  {
    title: "CBSE public curriculum taxonomy",
    publisher: "CBSE",
    chunks: 168,
    licence: "Public metadata / alignment only",
    updated: "20 Aug 2026",
    status: "ready"
  },
  {
    title: "ChalkBox original activity bank",
    publisher: "Team HarshLabs",
    chunks: 94,
    licence: "Original project content",
    updated: "21 Aug 2026",
    status: "ready"
  },
  {
    title: "DIKSHA OER sample catalogue",
    publisher: "DIKSHA contributors",
    chunks: 36,
    licence: "Per-resource attribution retained",
    updated: "19 Aug 2026",
    status: "review"
  }
];

export function AdminContentPage() {
  const { publications, publicationReports, moderatePublication } = useDomain();
  const [tab, setTab] = useState<"moderation" | "sources">("moderation");
  const pending = publications.filter((item) => item.status === "submitted");
  return (
    <div>
      <PageHeader
        eyebrow="Trust and provenance"
        title="Content operations"
        description="Moderate immutable community submissions and audit every curriculum source before it reaches teachers."
        actions={<Badge tone="purple">Demo operations</Badge>}
      />
      <div className="mb-5 flex w-fit rounded-xl border border-black/6 bg-white p-1">
        <button
          onClick={() => setTab("moderation")}
          className={`rounded-lg px-4 py-2 text-sm font-black ${tab === "moderation" ? "bg-moss-700 text-white" : "text-ink-500"}`}
        >
          Moderation · {pending.length}
        </button>
        <button
          onClick={() => setTab("sources")}
          className={`rounded-lg px-4 py-2 text-sm font-black ${tab === "sources" ? "bg-moss-700 text-white" : "text-ink-500"}`}
        >
          Curriculum sources
        </button>
      </div>

      {tab === "moderation" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-ink-500 text-xs font-black uppercase">Awaiting review</p>
              <p className="mt-2 text-3xl font-black">{pending.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-ink-500 text-xs font-black uppercase">Approved live</p>
              <p className="text-moss-700 mt-2 text-3xl font-black">
                {publications.filter((item) => item.status === "approved").length}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-ink-500 text-xs font-black uppercase">Open reports</p>
              <p className="mt-2 text-3xl font-black text-amber-700">
                {publicationReports.filter((item) => item.status === "open").length}
              </p>
            </Card>
          </div>
          {pending.length ? (
            pending.map((publication) => (
              <Card key={publication.id} className="overflow-hidden">
                <div className="bg-moss-900 flex flex-col justify-between gap-4 p-5 text-white sm:flex-row sm:items-start sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="amber">Submitted</Badge>
                      <span className="text-xs font-bold text-white/60">
                        Immutable v{publication.snapshot.version}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-black">{publication.snapshot.title}</h2>
                    <p className="mt-2 text-sm text-white/70">
                      {publication.authorName} · {publication.authorSchool}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="sun"
                      onClick={async () => {
                        await moderatePublication(publication.id, "approved");
                        toast.success("Submission approved for discovery");
                      }}
                    >
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                    <Button
                      className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                      onClick={async () => {
                        await moderatePublication(
                          publication.id,
                          "rejected",
                          "Revise curriculum alignment or classroom-safety details, then resubmit."
                        );
                        toast.success("Submission returned with a review note");
                      }}
                    >
                      <XCircle className="size-4" /> Return
                    </Button>
                  </div>
                </div>
                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_20rem]">
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-black">
                      <Eye className="text-moss-700 size-4" /> Exact snapshot under review
                    </h3>
                    <LessonTimeline activities={publication.snapshot.activities} compact />
                  </div>
                  <aside className="space-y-3">
                    <div className="surface-subtle rounded-xl p-4 text-xs leading-5">
                      <strong>Class context:</strong>
                      <br />
                      Class {publication.snapshot.grade} · {publication.snapshot.subject}
                      <br />
                      {publication.snapshot.classSize} learners ·{" "}
                      {publication.snapshot.durationMinutes} min
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-950">
                      <ShieldAlert className="mr-1 inline size-4" /> Check safety, private-data
                      removal, attribution, feasibility and objective–assessment alignment.
                    </div>
                  </aside>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Moderation queue is clear"
              description="New teacher submissions will appear here as immutable snapshots."
            />
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
            <Card className="overflow-hidden">
              <div className="border-b border-black/5 p-5">
                <h2 className="font-black">Indexed sources</h2>
                <p className="text-muted mt-1 text-xs">
                  Hybrid lexical + vector retrieval · source-level licence metadata
                </p>
              </div>
              <div className="divide-y divide-black/5">
                {sources.map((source) => (
                  <div key={source.title} className="p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex gap-3">
                        <span className="bg-moss-100 text-moss-700 grid size-10 shrink-0 place-items-center rounded-xl">
                          <BookMarked className="size-5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-black">{source.title}</h3>
                          <p className="text-muted mt-1 text-xs">
                            {source.publisher} · {source.licence}
                          </p>
                          <p className="text-ink-500 mt-2 text-[11px] font-bold">
                            {source.chunks} chunks · refreshed {source.updated}
                          </p>
                        </div>
                      </div>
                      <Badge tone={source.status === "ready" ? "green" : "amber"}>
                        {source.status === "ready" ? "Indexed" : "Needs review"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <aside className="space-y-4">
              <Card className="p-5">
                <Database className="text-moss-700 size-5" />
                <p className="mt-4 text-2xl font-black">298</p>
                <p className="text-muted text-xs font-bold">Approved retrieval chunks</p>
              </Card>
              <Card className="p-5">
                <FileSearch className="text-moss-700 size-5" />
                <p className="mt-4 text-2xl font-black">100%</p>
                <p className="text-muted text-xs font-bold">Attribution metadata complete</p>
              </Card>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => toast.success("Provenance check complete")}
              >
                <RefreshCw className="size-4" /> Validate sources
              </Button>
            </aside>
          </div>
          <Card className="mt-5 border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-blue-700" />
              <p className="text-sm leading-6 text-blue-950">
                <strong>Copyright boundary:</strong> curriculum names may be used for taxonomy and
                alignment, but substantial textbook prose is not stored or reproduced. Imported OER
                content must retain its exact licence and attribution.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
