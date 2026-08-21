import type { CommunityPublication, Subject } from "@chalkbox/contracts";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Copy,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

export function CommunityPage() {
  const profile = useAppStore((state) => state.profile);
  const { publications, plans, submitPublication, withdrawPublication } = useDomain();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [publishOpen, setPublishOpen] = useState(false);

  const approved = useMemo(
    () =>
      publications
        .filter((publication) => {
          const plan = publication.snapshot;
          return (
            publication.status === "approved" &&
            `${plan.title} ${plan.topic} ${plan.subject} ${publication.authorName}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()) &&
            (subject === "all" || plan.subject === subject)
          );
        })
        .sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt)),
    [publications, query, subject]
  );
  const mine = publications.filter((item) => item.ownerId === profile?.id);
  const activePlanIds = new Set(
    mine
      .filter((item) => !["withdrawn", "rejected", "unpublished"].includes(item.status))
      .map((item) => item.planId)
  );

  return (
    <div>
      <PageHeader
        eyebrow="Moderated teacher commons"
        title="Community lessons"
        description="Discover approved classroom plans, inspect their full sequence, and adapt an attributed private copy."
        actions={
          <Button onClick={() => setPublishOpen(true)}>
            <Send className="size-4" /> Submit a plan
          </Button>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="bg-moss-900 grid gap-5 p-5 text-white sm:p-6 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-emerald-200 uppercase">
              <ShieldCheck className="size-4" /> Human moderation before discovery
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.03em]">
              Borrow the idea. Keep your classroom judgment.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Published plans are immutable snapshots. “Adapt” always creates a private copy with
              source attribution, so nobody overwrites the original.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              [approved.length, "approved"],
              [approved.reduce((sum, item) => sum + item.saves, 0), "saves"],
              [approved.reduce((sum, item) => sum + item.adaptations, 0), "adaptations"]
            ].map(([value, label]) => (
              <div key={String(label)} className="rounded-2xl bg-white/8 p-3 text-center">
                <p className="text-sun-500 text-2xl font-black">{value}</p>
                <p className="mt-1 text-[10px] font-black tracking-wider text-white/60 uppercase">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_15rem_auto]">
          <label className="relative">
            <span className="sr-only">Search community lessons</span>
            <Search className="text-ink-500 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topic, title, teacher or subject…"
              className="surface focus:border-moss-500 h-11 w-full rounded-xl border pr-3 pl-9 text-sm outline-none"
            />
          </label>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value as Subject | "all")}
            className="surface h-11 rounded-xl border px-3 text-sm font-bold"
            aria-label="Filter community by subject"
          >
            <option value="all">All subjects</option>
            {[...new Set(publications.map((item) => item.snapshot.subject))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setSubject("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      {mine.length > 0 && (
        <section className="mb-7">
          <div className="mb-3">
            <h2 className="text-lg font-black">Your submissions</h2>
            <p className="text-muted text-xs">
              Track moderation without making an unpublished draft discoverable.
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {mine.map((publication) => (
              <Card key={publication.id} className="min-w-[18rem] p-4">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={publication.status} />
                  {publication.status === "submitted" && (
                    <button
                      onClick={async () => {
                        await withdrawPublication(publication.id);
                        toast.success("Submission withdrawn");
                      }}
                      className="text-xs font-black text-red-700"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
                <p className="mt-3 truncate text-sm font-black">{publication.snapshot.title}</p>
                <p className="text-muted mt-1 text-xs">
                  Submitted{" "}
                  {publication.submittedAt
                    ? new Date(publication.submittedAt).toLocaleDateString("en-IN", {
                        dateStyle: "medium"
                      })
                    : "as draft"}
                </p>
                {publication.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
                    {publication.rejectionReason}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black">Approved for discovery</h2>
          <p className="text-muted mt-1 text-xs">
            Original lesson language, classroom context and attribution stay visible.
          </p>
        </div>
        <p className="text-moss-700 text-xs font-bold">{approved.length} lessons</p>
      </div>
      {approved.length ? (
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {approved.map((publication) => (
            <CommunityCard key={publication.id} publication={publication} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="No approved lessons match"
          description="Clear a filter or submit one of your plans for moderation."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setSubject("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-950">
        <ShieldCheck className="mr-1 inline size-4" /> <strong>Community boundary:</strong> no
        learner identities, private teacher notes, editable owner records or unpublished submissions
        appear in discovery.
      </div>

      {publishOpen && (
        <div
          className="bg-ink-950/50 fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Submit lesson for moderation"
        >
          <Card className="my-4 w-full max-w-2xl overflow-hidden">
            <div className="bg-moss-900 flex items-start justify-between gap-4 p-6 text-white">
              <div>
                <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
                  Community submission
                </p>
                <h2 className="mt-1 text-2xl font-black">Choose an immutable snapshot</h2>
                <p className="mt-2 text-xs leading-5 text-white/65">
                  A version is created now. Later edits to your private plan will not change what
                  moderators review.
                </p>
              </div>
              <button
                onClick={() => setPublishOpen(false)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-xl hover:bg-white/10"
              >
                <X />
              </button>
            </div>
            <div className="space-y-2 p-6">
              {plans.map((plan) => {
                const active = activePlanIds.has(plan.id);
                return (
                  <button
                    key={plan.id}
                    disabled={active}
                    onClick={async () => {
                      await submitPublication(plan.id);
                      setPublishOpen(false);
                      toast.success("Plan submitted for moderation", {
                        description:
                          "It is not public until an admin approves the immutable snapshot."
                      });
                    }}
                    className="surface hover:border-moss-500 flex w-full items-center gap-3 rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="bg-moss-100 text-moss-800 grid size-10 place-items-center rounded-xl">
                      <Sparkles className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{plan.title}</span>
                      <span className="text-muted mt-0.5 block text-xs">
                        Class {plan.grade} · {plan.subject} · quality {plan.qualityScore}/100
                      </span>
                    </span>
                    {active ? (
                      <span className="text-xs font-black text-amber-700">Already submitted</span>
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CommunityPublication["status"] }) {
  const tone =
    status === "approved"
      ? "green"
      : status === "rejected" || status === "unpublished"
        ? "red"
        : status === "submitted"
          ? "amber"
          : "neutral";
  return <Badge tone={tone}>{status.replaceAll("-", " ")}</Badge>;
}

function CommunityCard({ publication }: { publication: CommunityPublication }) {
  const plan = publication.snapshot;
  return (
    <Card className="group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="to-moss-50 bg-gradient-to-br from-white p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="green">
            <CheckCircle2 className="size-3" /> Moderator approved
          </Badge>
          <span className="text-moss-700 text-xs font-black">{plan.qualityScore}/100</span>
        </div>
        <p className="text-moss-700 mt-5 text-xs font-black tracking-wider uppercase">
          Class {plan.grade}
          {plan.additionalGrade ? ` + ${plan.additionalGrade}` : ""} · {plan.subject}
        </p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">{plan.title}</h3>
        <p className="text-muted mt-2 line-clamp-2 text-sm leading-6">
          {plan.objectives[0]?.text ?? plan.topic}
        </p>
        <div className="text-ink-500 mt-4 flex flex-wrap gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1">
            <Clock3 className="size-3.5" /> {plan.durationMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <BookOpenCheck className="size-3.5" /> {plan.activities.length} steps
          </span>
          <span className="flex items-center gap-1">
            <Copy className="size-3.5" /> {publication.adaptations} adaptations
          </span>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 border-t border-black/5 p-5">
        <span className="bg-sun-100 grid size-10 place-items-center rounded-full text-xs font-black text-amber-900">
          {publication.authorName
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black">{publication.authorName}</span>
          <span className="text-muted block truncate text-[10px]">{publication.authorSchool}</span>
        </span>
        <Link to={`/community/${publication.id}`}>
          <Button variant="secondary" size="sm">
            Inspect <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
