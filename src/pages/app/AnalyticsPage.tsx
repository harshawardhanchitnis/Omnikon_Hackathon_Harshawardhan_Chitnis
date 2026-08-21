import {
  BarChart3,
  BookOpenCheck,
  Clock3,
  Download,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateAnalytics } from "@/lib/analytics";
import { downloadJson } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function AnalyticsPage() {
  const profile = useAppStore((state) => state.profile);
  const plans = useAppStore((state) => state.plans);
  const reflections = useAppStore((state) => state.reflections);
  const checkIns = useAppStore((state) => state.checkIns);
  const analytics = calculateAnalytics(profile?.id ?? "", plans, reflections);
  const stats = [
    {
      label: "Plans created",
      value: analytics.plansCreated,
      detail: analytics.periodLabel,
      icon: Sparkles,
      tone: "bg-violet-100 text-violet-700"
    },
    {
      label: "Lessons taught",
      value: analytics.plansTaught,
      detail: "Reflection completed",
      icon: BookOpenCheck,
      tone: "bg-moss-100 text-moss-700"
    },
    {
      label: "Planning time saved",
      value: `${analytics.hoursSaved}h`,
      detail: "Estimated",
      icon: Clock3,
      tone: "bg-amber-100 text-amber-800"
    },
    {
      label: "Outcome signal",
      value: `${analytics.averageOutcome}%`,
      detail: "Teacher-reported",
      icon: Target,
      tone: "bg-blue-100 text-blue-700"
    }
  ];
  const latestReflection = reflections[0];
  const latestPlan = plans.find((plan) => plan.id === latestReflection?.planId);
  return (
    <div>
      <PageHeader
        eyebrow="Private teacher insights"
        title="What your planning is changing"
        description="Patterns from your plans and reflections. ChalkBox does not profile individual students."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              downloadJson("chalkbox-insights.json", {
                generatedAt: new Date().toISOString(),
                analytics,
                checkIns,
                reflections
              })
            }
          >
            <Download className="size-4" />
            Export data
          </Button>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-5" />
            </span>
            <p className="mt-5 text-3xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-sm font-black">{label}</p>
            <p className="text-muted mt-1 text-xs">{detail}</p>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black">Plan and teaching rhythm</h2>
              <p className="text-muted mt-1 text-xs">
                Created versus taught across the last four weeks.
              </p>
            </div>
            <BarChart3 className="text-moss-700 size-5" />
          </div>
          <div className="mt-5 h-72" aria-label="Weekly plans created and taught chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.weeklyActivity}
                margin={{ top: 8, right: 0, left: -26, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e9e4" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} fontSize={11} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip
                  cursor={{ fill: "#eff8f5" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid #dfe5df", fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="created" name="Created" fill="#1f6b5c" radius={[6, 6, 0, 0]} />
                <Bar dataKey="taught" name="Taught" fill="#f4b740" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-black">Subject mix</h2>
          <p className="text-muted mt-1 text-xs">Where your planning time is going.</p>
          <div className="mt-6 space-y-5">
            {analytics.subjectBreakdown.map((item) => {
              const percent = Math.round((item.plans / Math.max(1, analytics.plansCreated)) * 100);
              return (
                <div key={item.subject}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-black">{item.subject}</span>
                    <span className="text-muted text-xs font-bold">
                      {item.plans} plans · {percent}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-moss-700 h-full rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="bg-moss-100 text-moss-700 grid size-10 place-items-center rounded-xl">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <h2 className="font-black">Evidence loop</h2>
              <p className="text-muted text-xs">Plan → teach → observe → adapt</p>
            </div>
          </div>
          {latestReflection && latestPlan ? (
            <div className="mt-5">
              <p className="text-moss-700 text-xs font-black tracking-wider uppercase">
                Latest: {latestPlan.title}
              </p>
              <blockquote className="bg-paper mt-3 rounded-2xl p-4 text-sm leading-6">
                “{latestReflection.wentWell}”
              </blockquote>
              <p className="text-muted mt-3 text-xs leading-5">
                <span className="text-ink-700 font-black">Next action: </span>
                {latestReflection.nextStep}
              </p>
            </div>
          ) : (
            <p className="text-muted mt-5 text-sm">
              Complete a lesson reflection to start your evidence loop.
            </p>
          )}
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-black">How these numbers are calculated</h2>
          <ul className="text-muted mt-4 space-y-3 text-xs leading-5">
            <li>
              <strong className="text-ink-700">Time saved:</strong> a transparent estimate against a
              45-minute manual-planning baseline, never a claim of measured labour.
            </li>
            <li>
              <strong className="text-ink-700">Outcome signal:</strong> the teacher’s own four-level
              reflection converted to a percentage for trend viewing.
            </li>
            <li>
              <strong className="text-ink-700">Quality:</strong> deterministic checks for
              objectives, timing, offline alternatives, assessment alignment and attribution.
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
