import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Gauge,
  KeyRound,
  RotateCw,
  ShieldCheck
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const requests = [
  {
    id: "req_8fb2",
    mode: "Teacher",
    topic: "Water cycle",
    latency: "4.2s",
    score: 100,
    status: "passed"
  },
  {
    id: "req_8fb1",
    mode: "Demo",
    topic: "Fractions",
    latency: "3.8s",
    score: 100,
    status: "passed"
  },
  {
    id: "req_8faf",
    mode: "Teacher",
    topic: "Narrative voice",
    latency: "5.1s",
    score: 80,
    status: "repaired"
  },
  {
    id: "req_8fa9",
    mode: "Anonymous",
    topic: "Soil types",
    latency: "—",
    score: 0,
    status: "limited"
  }
];

export function AdminOperationsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="AI control plane"
        title="Generation operations"
        description="Quota, validation and safety telemetry—without exposing prompts or private lesson content."
        actions={<Badge tone="purple">Simulated data</Badge>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Success rate", value: "97.9%", icon: CheckCircle2 },
          { label: "P50 latency", value: "4.1s", icon: Clock3 },
          { label: "Schema repairs", value: "3.2%", icon: RotateCw },
          { label: "Quota blocks", value: "11", icon: Gauge }
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon className="text-moss-700 size-5" />
            <p className="mt-4 text-2xl font-black">{value}</p>
            <p className="text-muted text-xs font-bold">{label}</p>
          </Card>
        ))}
      </section>
      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/5 p-5">
          <div>
            <h2 className="font-black">Recent validated requests</h2>
            <p className="text-muted mt-1 text-xs">Sanitised identifiers and topic labels only.</p>
          </div>
          <Button variant="secondary" size="sm">
            <RotateCw className="size-4" />
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-paper text-ink-500 text-[10px] font-black tracking-wider uppercase">
              <tr>
                <th className="px-5 py-3">Request</th>
                <th className="px-5 py-3">Access</th>
                <th className="px-5 py-3">Topic</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Quality</th>
                <th className="px-5 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-5 py-4 font-mono text-xs">{request.id}</td>
                  <td className="px-5 py-4">{request.mode}</td>
                  <td className="px-5 py-4 font-bold">{request.topic}</td>
                  <td className="px-5 py-4">{request.latency}</td>
                  <td className="px-5 py-4 font-black">{request.score || "—"}</td>
                  <td className="px-5 py-4">
                    <Badge
                      tone={
                        request.status === "passed"
                          ? "green"
                          : request.status === "repaired"
                            ? "amber"
                            : "red"
                      }
                    >
                      {request.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <KeyRound className="text-moss-700 size-5" />
          <h2 className="mt-4 font-black">Secret boundary</h2>
          <p className="text-muted mt-2 text-xs leading-5">
            Gemini API keys exist only in Edge Function secrets; publishable browser keys remain
            RLS-scoped.
          </p>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="text-moss-700 size-5" />
          <h2 className="mt-4 font-black">Input controls</h2>
          <p className="text-muted mt-2 text-xs leading-5">
            Zod validation, length limits, prompt-injection boundaries and rate limits run before
            model access.
          </p>
        </Card>
        <Card className="p-5">
          <Bot className="text-moss-700 size-5" />
          <h2 className="mt-4 font-black">Output controls</h2>
          <p className="text-muted mt-2 text-xs leading-5">
            JSON schema validation, one repair attempt and deterministic quality checks prevent
            malformed plans.
          </p>
        </Card>
      </section>
      <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <AlertTriangle className="size-4 shrink-0" />
        <p>
          <strong>Fail visibly:</strong> if Gemini or retrieval is unavailable, production mode
          shows an actionable error. It never silently labels prepared content as an AI response.
        </p>
      </div>
    </div>
  );
}
