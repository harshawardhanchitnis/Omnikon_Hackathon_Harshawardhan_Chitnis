import type { LessonPlan, PlanStatus, Subject } from "@chalkbox/contracts";
import { Filter, Library, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PlanCard } from "@/components/plans/PlanCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDomain } from "@/state/domain-context";

export function LibraryPage() {
  const navigate = useNavigate();
  const { plans, clonePlan, deletePlan } = useDomain();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [deleteCandidate, setDeleteCandidate] = useState<LessonPlan | null>(null);
  const visible = useMemo(
    () =>
      plans
        .filter((plan) => {
          const matchesQuery = `${plan.title} ${plan.topic} ${plan.subject}`
            .toLowerCase()
            .includes(query.toLowerCase());
          return (
            matchesQuery &&
            (status === "all" || plan.status === status) &&
            (subject === "all" || plan.subject === subject)
          );
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [plans, query, status, subject]
  );
  const onClone = async (plan: LessonPlan) => {
    const clone = await clonePlan(plan);
    toast.success("Editable copy created");
    navigate(`/plans/${clone.id}/edit`);
  };
  const onDelete = async () => {
    if (!deleteCandidate) return;
    await deletePlan(deleteCandidate.id);
    toast.success("Draft removed from this device");
    setDeleteCandidate(null);
  };
  return (
    <div>
      <PageHeader
        eyebrow="Your workspace"
        title="Lesson library"
        description="Search, adapt and reuse every plan you have created or taught."
        actions={
          <Link to="/plans/new">
            <Button>
              <Plus className="size-4" />
              New plan
            </Button>
          </Link>
        }
      />
      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_11rem_13rem_auto]">
          <label className="relative">
            <span className="sr-only">Search plans</span>
            <Search className="text-ink-500 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, topic or subject…"
              className="surface focus:border-moss-500 h-11 w-full rounded-xl border pr-9 pl-9 text-sm outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as PlanStatus | "all")}
            aria-label="Filter by status"
            className="surface h-11 rounded-xl border px-3 text-sm font-bold"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="taught">Taught</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value as Subject | "all")}
            aria-label="Filter by subject"
            className="surface h-11 rounded-xl border px-3 text-sm font-bold"
          >
            <option value="all">All subjects</option>
            {[...new Set(plans.map((plan) => plan.subject))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setSubject("all");
            }}
          >
            <Filter className="size-4" />
            Reset
          </Button>
        </div>
      </Card>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted text-xs font-bold">
          Showing {visible.length} of {plans.length} plans
        </p>
        <p className="text-moss-700 text-xs font-bold">Saved offline</p>
      </div>
      {visible.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((plan) => (
            <div key={plan.id} className="group relative">
              <PlanCard plan={plan} onClone={onClone} />
              {plan.status === "draft" && (
                <button
                  onClick={() => setDeleteCandidate(plan)}
                  className="absolute top-4 right-16 grid size-8 place-items-center rounded-lg bg-white/90 text-red-700 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-red-50"
                  aria-label={`Delete ${plan.title}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Library}
          title="No plans match those filters"
          description="Clear a filter or start a new lesson plan."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setSubject("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
      {deleteCandidate && (
        <div
          className="bg-ink-950/45 fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <Card className="w-full max-w-md p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-700">
              <Trash2 className="size-5" />
            </span>
            <h2 id="delete-title" className="mt-5 text-xl font-black">
              Remove this draft?
            </h2>
            <p className="text-muted mt-2 text-sm leading-6">
              “{deleteCandidate.title}” will be removed from this browser. Export it first if you
              need a backup.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteCandidate(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onDelete}>
                Remove draft
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
