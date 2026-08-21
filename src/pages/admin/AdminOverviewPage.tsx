import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  IndianRupee,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const activity = [
  { day: "15 Aug", generations: 31 },
  { day: "16 Aug", generations: 46 },
  { day: "17 Aug", generations: 58 },
  { day: "18 Aug", generations: 84 },
  { day: "19 Aug", generations: 105 },
  { day: "20 Aug", generations: 128 },
  { day: "21 Aug", generations: 147 }
];

export function AdminOverviewPage() {
  const stats = [
    {
      label: "Active teachers",
      value: "486",
      detail: "+18 this week",
      icon: Users,
      tone: "bg-blue-100 text-blue-700"
    },
    {
      label: "Lesson plans",
      value: "1,284",
      detail: "892 taught",
      icon: BookOpenCheck,
      tone: "bg-moss-100 text-moss-700"
    },
    {
      label: "Generations today",
      value: "147",
      detail: "2.1% retried",
      icon: Sparkles,
      tone: "bg-violet-100 text-violet-700"
    },
    {
      label: "Estimated AI cost",
      value: "₹0",
      detail: "Free-tier demo",
      icon: IndianRupee,
      tone: "bg-amber-100 text-amber-800"
    }
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Operations console"
        title="ChalkBox health"
        description="Seeded admin demonstration data. Production metrics will come from aggregated, privacy-safe events."
        actions={<Badge tone="purple">Simulated admin data</Badge>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="size-5" />
            </span>
            <p className="mt-5 text-3xl font-black">{value}</p>
            <p className="mt-1 text-sm font-black">{label}</p>
            <p className="text-muted mt-1 text-xs">{detail}</p>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">AI requests</h2>
              <p className="text-muted mt-1 text-xs">Validated lesson generations per day.</p>
            </div>
            <Activity className="text-moss-700 size-5" />
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="generationFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f6b5c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1f6b5c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e5e9e4" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #dfe5df", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="generations"
                  stroke="#1f6b5c"
                  strokeWidth={3}
                  fill="url(#generationFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black">System status</h2>
              <Badge tone="green">Healthy</Badge>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { label: "Web application", status: "Operational" },
                { label: "Supabase database", status: "Operational" },
                { label: "AI generation function", status: "Prepared" },
                { label: "Offline cache", status: "Operational" }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="font-bold">{item.label}</span>
                  <span className="text-moss-700 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="font-black text-amber-950">2 plans flagged</h2>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Demo moderation queue: source attribution review only. No safety incident.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "RLS boundary",
            text: "Teacher records are owner-scoped; admin access is explicitly role-gated."
          },
          {
            icon: ServerCog,
            title: "Server-side secrets",
            text: "Gemini credentials and quota enforcement stay inside Edge Functions."
          },
          {
            icon: BookOpenCheck,
            title: "Content provenance",
            text: "Every retrieval chunk retains licence and attribution metadata."
          }
        ].map(({ icon: Icon, title, text }) => (
          <Card key={title} className="p-5">
            <Icon className="text-moss-700 size-5" />
            <h3 className="mt-4 font-black">{title}</h3>
            <p className="text-muted mt-2 text-xs leading-5">{text}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
