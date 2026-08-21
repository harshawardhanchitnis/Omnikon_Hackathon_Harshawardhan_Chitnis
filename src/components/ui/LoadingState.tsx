import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading ChalkBox…" }: { label?: string }) {
  return (
    <div className="grid min-h-64 place-items-center" role="status">
      <div className="text-muted flex flex-col items-center gap-3 text-sm font-bold">
        <LoaderCircle className="text-moss-700 size-7 animate-spin" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}
