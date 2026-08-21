import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-moss-700 mb-1 text-xs font-black tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-ink-950 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
