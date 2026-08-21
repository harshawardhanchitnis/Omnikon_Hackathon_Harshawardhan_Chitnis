import type { LessonActivity } from "@chalkbox/contracts";
import { Check, ChevronDown, Clock3, PackageOpen, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LessonTimelineProps {
  activities: LessonActivity[];
  activeIndex?: number;
  completedThrough?: number;
  compact?: boolean;
}

export function LessonTimeline({
  activities,
  activeIndex,
  completedThrough = -1,
  compact = false
}: LessonTimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(activities[0]?.id ?? null);
  return (
    <ol className="space-y-3">
      {activities.map((activity, index) => {
        const isActive = index === activeIndex;
        const isComplete = index <= completedThrough;
        const isExpanded = !compact || expanded === activity.id || isActive;
        return (
          <li
            key={activity.id}
            className={cn(
              "surface overflow-hidden rounded-2xl border transition",
              isActive && "border-moss-500 ring-moss-100 ring-4"
            )}
          >
            <button
              className="flex w-full items-center gap-3 p-4 text-left"
              onClick={() => setExpanded(isExpanded ? null : activity.id)}
              aria-expanded={isExpanded}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black",
                  isComplete
                    ? "bg-moss-700 text-white"
                    : isActive
                      ? "bg-sun-500 text-ink-950"
                      : "surface-subtle text-ink-500"
                )}
              >
                {isComplete ? <Check className="size-4" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-moss-700 block text-xs font-black tracking-wider uppercase">
                  {activity.type}
                </span>
                <span className="mt-0.5 block truncate text-sm font-black sm:text-base">
                  {activity.title}
                </span>
              </span>
              <span className="text-muted inline-flex items-center gap-1 text-xs font-bold">
                <Clock3 className="size-3.5" />
                {activity.durationMinutes}m
              </span>
              <ChevronDown
                className={cn("text-ink-500 size-4 transition", isExpanded && "rotate-180")}
              />
            </button>
            {isExpanded && (
              <div className="border-t border-black/5 px-4 py-4 sm:px-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <h4 className="text-ink-500 mb-2 flex items-center gap-2 text-xs font-black tracking-wider uppercase">
                      Teacher moves
                    </h4>
                    <ol className="space-y-2">
                      {activity.teacherSteps.map((step, stepIndex) => (
                        <li
                          key={`${activity.id}-t-${stepIndex}`}
                          className="flex gap-2 text-sm leading-6"
                        >
                          <span className="text-moss-700 font-black">{stepIndex + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-ink-500 mb-2 flex items-center gap-2 text-xs font-black tracking-wider uppercase">
                      <Users className="size-3.5" />
                      Learner actions
                    </h4>
                    <ul className="space-y-2">
                      {activity.studentSteps.map((step, stepIndex) => (
                        <li
                          key={`${activity.id}-s-${stepIndex}`}
                          className="flex gap-2 text-sm leading-6"
                        >
                          <span className="bg-sun-500 mt-2 size-1.5 shrink-0 rounded-full" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-moss-50 mt-4 grid gap-3 rounded-xl p-3 text-xs leading-5 sm:grid-cols-2">
                  <p>
                    <span className="text-moss-900 mr-1 inline-flex items-center gap-1 font-black">
                      <PackageOpen className="size-3.5" />
                      Materials:
                    </span>
                    {activity.materials.join(", ") || "None"}
                  </p>
                  <p>
                    <span className="text-moss-900 font-black">Offline option: </span>
                    {activity.offlineAlternative ?? "This step does not require a device."}
                  </p>
                </div>
                {activity.differentiation && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    <span className="font-black">Inclusive support: </span>
                    {activity.differentiation}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
