import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <span className="bg-moss-100 text-moss-700 mb-4 grid size-12 place-items-center rounded-2xl">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <p className="text-muted mt-2 max-w-md text-sm leading-6">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
