import type { PlanStatus } from "@chalkbox/contracts";
import { Badge } from "@/components/ui/Badge";

const labels: Record<PlanStatus, string> = {
  draft: "Draft",
  ready: "Ready to teach",
  taught: "Taught",
  archived: "Archived"
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const tone =
    status === "ready"
      ? "green"
      : status === "taught"
        ? "blue"
        : status === "archived"
          ? "neutral"
          : "amber";
  return <Badge tone={tone}>{labels[status]}</Badge>;
}
