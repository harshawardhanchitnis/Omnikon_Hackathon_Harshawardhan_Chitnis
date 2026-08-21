import type { CommunityPlanSummary } from "@chalkbox/contracts";
import { ArrowRight, CalendarClock, HeartHandshake, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { communityPlans, demoAppointments, demoExperts, demoGuidance } from "@/data/demo-fixtures";
import { formatDateTime } from "@/lib/utils";

export function CommunityPage() {
  const [tab, setTab] = useState<"plans" | "support">("plans");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      communityPlans.filter((plan) =>
        `${plan.title} ${plan.topic} ${plan.subject} ${plan.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query]
  );
  const appointment = demoAppointments[0];
  const expert = demoExperts.find((item) => item.id === appointment?.expertId);
  return (
    <div>
      <PageHeader
        eyebrow="Teacher network"
        title="Community & support"
        description="Adapt field-tested lesson ideas and connect them to your own classroom context."
      />
      <div className="mb-5 flex w-fit rounded-xl border border-black/6 bg-white p-1">
        <button
          onClick={() => setTab("plans")}
          className={`rounded-lg px-4 py-2 text-sm font-black ${tab === "plans" ? "bg-moss-700 text-white" : "text-ink-500"}`}
        >
          Plan commons
        </button>
        <button
          onClick={() => setTab("support")}
          className={`rounded-lg px-4 py-2 text-sm font-black ${tab === "support" ? "bg-moss-700 text-white" : "text-ink-500"}`}
        >
          Mentor support
        </button>
      </div>
      {tab === "plans" ? (
        <>
          <Card className="mb-5 p-4">
            <label className="relative block">
              <span className="sr-only">Search community plans</span>
              <Search className="text-ink-500 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search topic, subject or classroom approach…"
                className="bg-paper focus:border-moss-500 h-11 w-full rounded-xl border border-black/10 pr-3 pl-9 text-sm outline-none"
              />
            </label>
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            {filtered.map((plan) => (
              <CommunityCard key={plan.id} plan={plan} />
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
            <strong>Community safety:</strong> published plans contain no student data. Every
            adaptation creates a private copy and retains source attribution.
          </div>
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            {appointment && expert && (
              <Card className="overflow-hidden">
                <div className="bg-moss-900 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <Badge tone="green">Confirmed</Badge>
                    <CalendarClock className="text-sun-500 size-5" />
                  </div>
                  <p className="mt-6 text-xs font-black tracking-wider text-emerald-200 uppercase">
                    Next mentor review
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{expert.name}</h2>
                  <p className="mt-1 text-sm text-white/60">{expert.title}</p>
                </div>
                <div className="p-5">
                  <p className="text-sm font-black">
                    {formatDateTime(appointment.startsAt)} · {appointment.durationMinutes} minutes
                  </p>
                  <p className="text-muted mt-2 text-sm leading-6">{appointment.agenda}</p>
                  <Button variant="secondary" className="mt-5">
                    Add to calendar
                  </Button>
                </div>
              </Card>
            )}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="bg-moss-100 text-moss-700 grid size-10 place-items-center rounded-xl">
                  <HeartHandshake className="size-5" />
                </span>
                <div>
                  <h2 className="font-black">Available mentors</h2>
                  <p className="text-muted text-xs">Demo availability windows</p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-black/5">
                {demoExperts.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-4">
                    <span className="bg-sun-100 grid size-10 place-items-center rounded-full font-black text-amber-900">
                      {item.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(-2)
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">{item.name}</p>
                      <p className="text-muted truncate text-xs">
                        {item.specialties.join(", ")} · {item.availability}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Request
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div>
            {demoGuidance.map((guidance) => (
              <Card key={guidance.id} className="p-5">
                <p className="text-moss-700 text-xs font-black tracking-wider uppercase">
                  Active guidance plan
                </p>
                <h2 className="mt-2 text-xl font-black">{guidance.title}</h2>
                <p className="text-muted mt-2 text-sm leading-6">{guidance.goal}</p>
                <div className="mt-5 space-y-3">
                  {guidance.actions.map((action) => (
                    <div key={action.id} className="bg-paper flex gap-3 rounded-xl p-3">
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${action.completed ? "border-moss-700 bg-moss-700 text-white" : "border-black/15 bg-white"}`}
                      >
                        {action.completed && <Sparkles className="size-3" />}
                      </span>
                      <p
                        className={`text-sm leading-5 font-bold ${action.completed ? "text-ink-500 line-through" : ""}`}
                      >
                        {action.title}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommunityCard({ plan }: { plan: CommunityPlanSummary }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <Badge tone="green">{plan.qualityScore}/100</Badge>
        <span className="text-muted text-xs font-bold">{plan.saves} saves</span>
      </div>
      <p className="text-moss-700 mt-5 text-xs font-black tracking-wider uppercase">
        Grade {plan.grade} · {plan.subject}
      </p>
      <h2 className="mt-2 text-xl font-black tracking-tight">{plan.title}</h2>
      <p className="text-muted mt-2 flex-1 text-sm leading-6">{plan.topic}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {plan.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
        <span className="bg-moss-100 text-moss-700 grid size-9 place-items-center rounded-full text-xs font-black">
          {plan.authorName
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black">{plan.authorName}</p>
          <p className="text-muted truncate text-[10px]">{plan.authorSchool}</p>
        </div>
        <Link to={`/community/${plan.id}`}>
          <Button size="sm" variant="secondary">
            View <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
