import type { ClassroomVisualData } from "@chalkbox/contracts";
import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassroomVisualProps {
  visual: ClassroomVisualData;
  large?: boolean;
}

const emphasisClasses = {
  primary: "border-emerald-300 bg-emerald-50 text-emerald-950",
  secondary: "border-sky-300 bg-sky-50 text-sky-950",
  output: "border-amber-300 bg-amber-50 text-amber-950",
  warning: "border-rose-300 bg-rose-50 text-rose-950"
} as const;

function NodeCard({
  node,
  large = false
}: {
  node: ClassroomVisualData["nodes"][number];
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-white text-center shadow-sm",
        large ? "min-w-44 p-6" : "min-w-32 p-4",
        node.emphasis ? emphasisClasses[node.emphasis] : "border-black/10"
      )}
    >
      <p className={cn("font-black", large ? "text-2xl" : "text-base")}>{node.label}</p>
      {node.secondaryLabel && (
        <p className={cn("mt-1 font-bold opacity-70", large ? "text-lg" : "text-xs")}>
          / {node.secondaryLabel}
        </p>
      )}
    </div>
  );
}

export function ClassroomVisual({ visual, large = false }: ClassroomVisualProps) {
  const outputIds = new Set(
    visual.nodes.filter((node) => node.emphasis === "output").map((node) => node.id)
  );
  const outputs = visual.nodes.filter((node) => outputIds.has(node.id));
  const inputs = visual.nodes.filter((node) => !outputIds.has(node.id));

  if (visual.kind === "table" && visual.columns?.length && visual.rows?.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-left">
          <thead className="bg-emerald-950 text-white">
            <tr>
              {visual.columns.map((column) => (
                <th key={column} className="p-3 text-sm font-black">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, index) => (
              <tr key={index} className="border-t border-black/5">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-3 font-bold">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <figure
      className={cn("rounded-3xl border border-emerald-900/10 bg-[#f6fbf7]", large ? "p-8" : "p-5")}
    >
      {visual.title && (
        <h3
          className={cn("text-center font-black text-emerald-950", large ? "text-3xl" : "text-lg")}
        >
          {visual.title}
        </h3>
      )}
      {outputs.length ? (
        <div className="mt-6 grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-wrap justify-center gap-3">
            {inputs.map((node) => (
              <NodeCard key={node.id} node={node} large={large} />
            ))}
          </div>
          <ArrowRight className="mx-auto hidden size-9 text-emerald-600 lg:block" />
          <ArrowDown className="mx-auto size-9 text-emerald-600 lg:hidden" />
          <div className="flex flex-wrap justify-center gap-3">
            {outputs.map((node) => (
              <NodeCard key={node.id} node={node} large={large} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {visual.nodes.map((node, index) => (
            <div key={node.id} className="flex items-center gap-3">
              {index > 0 && <ArrowRight className="size-5 text-emerald-600" />}
              <NodeCard node={node} large={large} />
            </div>
          ))}
        </div>
      )}
      {visual.caption && (
        <figcaption
          className={cn(
            "mx-auto mt-5 max-w-3xl text-center font-bold text-emerald-950/70",
            large ? "text-xl" : "text-sm"
          )}
        >
          {visual.caption}
        </figcaption>
      )}
    </figure>
  );
}
