import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "purple";

const tones: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  purple: "border-violet-200 bg-violet-50 text-violet-800"
};

export function Badge({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tone = props.tone ?? "neutral";
  const { tone: _tone, ...rest } = props;
  void _tone;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        tones[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
