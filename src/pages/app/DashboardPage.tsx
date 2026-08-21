import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Clock3,
  Flame,
  Plus,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PlanCard } from "@/components/plans/PlanCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateAnalytics } from "@/lib/analytics";
import { formatDateTime } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { demoAppointments, demoExperts } from "@/data/demo-fixtures";

export function DashboardPage() {
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const plans = useAppStore((state) => state.plans);
  const reflections = useAppStore((state) => state.reflections);
  const clonePlan = useAppStore((state) => state.clonePlan);
  const analytics = calculateAnalytics(profile?.id ?? "", plans, reflections);
  const recentPlans = [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const upcoming = plans.find((plan) => plan.status === "ready") ?? recentPlans[0];
  const appointment = demoAppointments[0];
  const expert = demoExperts.find((item) => item.id === appointment?.expertId);
  const firstName = profile?.fullName.split(" ")[0] ?? "Teacher";
  const onClone = async (plan: (typeof plans)[number]) => {
    const clone = await clonePlan(plan);
    toast.success("Plan duplicated", { description: "A new editable draft is in your library." });
    navigate(`/plans/${clone.id}/edit`);
  };
  return (
    <div>
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="green" className="mb-3 gap-1.5">
            <Flame className="size-3.5" />
            4-day planning streak
          </Badge>
          <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Good morning, {firstName}.
          </h1>
          <p className="text-muted mt-2 text-sm leading-6">
            Your next classroom-ready plan is waiting. You have already saved about{" "}
            {analytics.hoursSaved} planning hours.
          </p>
        </div>
        <Link to="/plans/new">
          <Button size="lg">
            <Plus className="size-4" />
            Create lesson plan
          </Button>
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        {upcoming && (
          <Card className="bg-moss-900 relative overflow-hidden text-white">
            <div className="bg-moss-500/25 absolute -top-24 -right-16 size-72 rounded-full blur-2xl" />
            <div className="relative p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black tracking-[0.15em] text-emerald-200 uppercase">
                  Up next · Ready to teach
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  Grade {upcoming.grade} · {upcoming.subject}
                </span>
              </div>
              <h2 className="mt-7 max-w-2xl text-3xl font-black tracking-[-0.04em]">
                {upcoming.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                {upcoming.objectives[0]?.text}
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-white/70">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="text-sun-500 size-4" />
                  {upcoming.durationMinutes} minutes
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpenCheck className="text-sun-500 size-4" />
                  {upcoming.activities.length} teaching steps
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="text-sun-500 size-4" />
                  Quality {upcoming.qualityScore}/100
                </span>
              </div>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Link to={`/plans/${upcoming.id}/teach`}>
                  <Button variant="sun" className="w-full sm:w-auto">
                    Start Teach Mode <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to={`/plans/${upcoming.id}/edit`}>
                  <Button className="w-full border-white/20 bg-white/8 text-white hover:bg-white/15 sm:w-auto">
                    Review plan
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <span className="bg-moss-100 text-moss-700 grid size-10 place-items-center rounded-xl">
                <TrendingUp className="size-5" />
              </span>
              <span className="text-moss-700 text-3xl font-black">{analytics.averageOutcome}%</span>
            </div>
            <h3 className="mt-4 font-black">Learning outcome signal</h3>
            <p className="text-muted mt-1 text-xs leading-5">
              Based on your private post-lesson reflections—not student profiles.
            </p>
            <Link
              to="/analytics"
              className="text-moss-700 mt-4 inline-flex items-center gap-1 text-xs font-black"
            >
              Open insights <ArrowRight className="size-3" />
            </Link>
          </Card>
          {appointment && expert && (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <CalendarClock className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-black tracking-wider text-amber-800 uppercase">
                    Mentor review
                  </p>
                  <h3 className="mt-1 font-black">{expert.name}</h3>
                </div>
              </div>
              <p className="text-muted mt-3 text-xs leading-5">
                {formatDateTime(appointment.startsAt)} · {appointment.durationMinutes} min
              </p>
              <Link
                to="/community"
                className="text-moss-700 mt-4 inline-flex items-center gap-1 text-xs font-black"
              >
                View support hub <ArrowRight className="size-3" />
              </Link>
            </Card>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">Recent lesson plans</h2>
            <p className="text-muted mt-1 text-xs">
              Continue editing, teach again, or adapt a copy.
            </p>
          </div>
          <Link to="/library" className="text-moss-700 text-sm font-black hover:underline">
            View library
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onClone={onClone} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Plans created", value: analytics.plansCreated, detail: "Across your library" },
          {
            label: "Lessons taught",
            value: analytics.plansTaught,
            detail: "With reflection saved"
          },
          {
            label: "Average quality",
            value: `${analytics.averageQuality}%`,
            detail: "Objective + timing checks"
          },
          {
            label: "Prep hours saved",
            value: analytics.hoursSaved,
            detail: "Estimated vs 45-min baseline"
          }
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-ink-500 text-xs font-black tracking-wider uppercase">{item.label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight">{item.value}</p>
            <p className="text-muted mt-1 text-xs">{item.detail}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
