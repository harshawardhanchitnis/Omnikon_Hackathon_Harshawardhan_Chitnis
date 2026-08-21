import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = "md",
  label
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizes = { sm: "size-10 text-xs", md: "size-14 text-sm", lg: "size-20 text-lg" };
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div
      className={cn(
        "text-moss-900 relative grid shrink-0 place-items-center font-black",
        sizes[size]
      )}
      aria-label={label ?? `${value}%`}
    >
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{value}</span>
    </div>
  );
}
