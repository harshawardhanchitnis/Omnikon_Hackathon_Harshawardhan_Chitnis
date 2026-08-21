import { ArrowLeft, Copy, Heart, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LessonTimeline } from "@/components/plans/LessonTimeline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { communityPlans, demoPlans } from "@/data/demo-fixtures";
import { uid } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function CommunityDetailPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const summary = communityPlans.find((item) => item.id === communityId);
  const clonePlan = useAppStore((state) => state.clonePlan);
  if (!summary)
    return (
      <div>
        <Link to="/community">Community plan not found</Link>
      </div>
    );
  const template = demoPlans[0]!;
  const source = {
    ...structuredClone(template),
    id: summary.sourcePlanId,
    title: summary.title,
    topic: summary.topic,
    grade: summary.grade,
    subject: summary.subject,
    durationMinutes: summary.durationMinutes,
    qualityScore: summary.qualityScore,
    generationMode: "manual" as const,
    sources: [
      {
        ...template.sources[0]!,
        id: uid("source"),
        grade: summary.grade,
        subject: summary.subject,
        title: "Community-contributed original ChalkBox lesson",
        attribution: `Shared by ${summary.authorName}. Original activity wording retained with attribution.`
      }
    ]
  };
  const adapt = async () => {
    const clone = await clonePlan(source, `${summary.title} — my classroom`);
    toast.success("Community plan added to your library", {
      description: "Your private copy keeps the original attribution."
    });
    navigate(`/plans/${clone.id}/edit`);
  };
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/community"
        className="text-ink-500 hover:text-moss-700 mb-5 inline-flex items-center gap-2 text-sm font-bold"
      >
        <ArrowLeft className="size-4" />
        Back to community
      </Link>
      <Card className="overflow-hidden">
        <div className="bg-moss-900 p-7 text-white sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge tone="green">Community quality {summary.qualityScore}</Badge>
            <span className="text-xs font-bold text-white/60">
              {summary.saves} saves · {summary.adaptations} adaptations
            </span>
          </div>
          <p className="mt-7 text-xs font-black tracking-wider text-emerald-200 uppercase">
            Grade {summary.grade} · {summary.subject}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">{summary.title}</h1>
          <p className="mt-3 text-sm text-white/65">
            Shared by {summary.authorName} · {summary.authorSchool}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button variant="sun" onClick={adapt}>
              <Copy className="size-4" />
              Adapt for my class
            </Button>
            <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Heart className="size-4" />
              Save
            </Button>
          </div>
        </div>
        <div className="p-6 sm:p-9">
          <div className="mb-7 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            <ShieldCheck className="mr-2 inline size-4" />
            <strong>Safe adaptation:</strong> ChalkBox creates a private copy. The shared original
            cannot be overwritten, and attribution remains attached.
          </div>
          <h2 className="mb-5 text-2xl font-black">Lesson sequence preview</h2>
          <LessonTimeline activities={source.activities} compact />
        </div>
      </Card>
    </div>
  );
}
