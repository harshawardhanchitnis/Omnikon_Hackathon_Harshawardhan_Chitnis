import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  linkTo?: string;
}

export function Logo({ compact = false, inverse = false, className, linkTo = "/" }: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border-2 font-black",
          inverse
            ? "text-moss-900 border-white/30 bg-white"
            : "border-moss-900 bg-sun-500 text-moss-900"
        )}
      >
        C<span className="bg-coral-500 absolute -right-1 -bottom-1 size-3 rounded-full" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span
            className={cn("block text-lg font-black tracking-[-0.04em]", inverse && "text-white")}
          >
            ChalkBox
          </span>
          <span
            className={cn(
              "mt-1 block text-[9px] font-bold tracking-[0.13em] uppercase",
              inverse ? "text-white/60" : "text-moss-700"
            )}
          >
            by HarshLabs
          </span>
        </span>
      )}
    </span>
  );
  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}
