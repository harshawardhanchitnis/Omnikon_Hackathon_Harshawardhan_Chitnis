import type { QuickCheckResult } from "@chalkbox/contracts";
import { Check, Minus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface QuickCheckModalProps {
  defaultPrompt: string;
  classSize: number;
  onClose: () => void;
  onSave: (
    input: Pick<QuickCheckResult, "prompt" | "mode" | "counts" | "correctKey" | "note">
  ) => Promise<void>;
}

const keysByMode = {
  mcq: ["A", "B", "C", "D"],
  "true-false": ["True", "False"],
  confidence: ["Confident", "Unsure", "Need help"],
  understanding: ["Secure", "Developing", "Revisit"]
} as const;

export function QuickCheckModal({
  defaultPrompt,
  classSize,
  onClose,
  onSave
}: QuickCheckModalProps) {
  const [mode, setMode] = useState<QuickCheckResult["mode"]>("understanding");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [counts, setCounts] = useState<Record<string, number>>({
    Secure: 0,
    Developing: 0,
    Revisit: 0
  });
  const [correctKey, setCorrectKey] = useState("A");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const keys = keysByMode[mode];
  const total = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + value, 0),
    [counts]
  );
  const changeMode = (next: QuickCheckResult["mode"]) => {
    setMode(next);
    setCounts(Object.fromEntries(keysByMode[next].map((key) => [key, 0])));
  };
  const adjust = (key: string, amount: number) =>
    setCounts((current) => ({
      ...current,
      [key]: Math.max(0, Math.min(classSize, (current[key] ?? 0) + amount))
    }));

  return (
    <div
      className="bg-ink-950/55 fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Aggregate quick check"
    >
      <Card className="my-4 w-full max-w-2xl overflow-hidden">
        <div className="bg-moss-900 flex items-start justify-between gap-4 p-6 text-white">
          <div>
            <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
              Anonymous classroom pulse
            </p>
            <h2 className="mt-1 text-2xl font-black">Quick Check</h2>
            <p className="mt-2 text-xs leading-5 text-white/70">
              Count raised cards or scan response patterns. Never enter learner names.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl hover:bg-white/10"
            aria-label="Close quick check"
          >
            <X />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 sm:grid-cols-4">
            <button
              onClick={() => changeMode("mcq")}
              className={`rounded-lg px-3 py-2 text-xs font-black ${mode === "mcq" ? "text-moss-800 bg-white shadow-sm" : "text-ink-500"}`}
            >
              A–D cards
            </button>
            <button
              onClick={() => changeMode("true-false")}
              className={`rounded-lg px-3 py-2 text-xs font-black ${mode === "true-false" ? "text-moss-800 bg-white shadow-sm" : "text-ink-500"}`}
            >
              True / false
            </button>
            <button
              onClick={() => changeMode("understanding")}
              className={`rounded-lg px-3 py-2 text-xs font-black ${mode === "understanding" ? "text-moss-800 bg-white shadow-sm" : "text-ink-500"}`}
            >
              Understanding bands
            </button>
            <button
              onClick={() => changeMode("confidence")}
              className={`rounded-lg px-3 py-2 text-xs font-black ${mode === "confidence" ? "text-moss-800 bg-white shadow-sm" : "text-ink-500"}`}
            >
              Confidence
            </button>
          </div>
          <label className="mt-5 block text-sm font-black">
            Prompt
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={2}
              className="surface mt-2 w-full rounded-xl border p-3 text-sm leading-6 font-medium"
            />
          </label>
          {(mode === "mcq" || mode === "true-false") && (
            <label className="text-ink-500 mt-4 block text-xs font-black">
              Correct response{" "}
              <select
                value={correctKey}
                onChange={(event) => setCorrectKey(event.target.value)}
                className="surface text-ink-950 ml-2 h-9 rounded-lg border px-3"
              >
                <option>A</option>
                <option>B</option>
                <option>C</option>
                <option>D</option>
                <option>True</option>
                <option>False</option>
              </select>
            </label>
          )}
          <div
            className={`mt-5 grid gap-3 ${keys.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-3"}`}
          >
            {keys.map((key) => (
              <div key={key} className="surface-subtle rounded-2xl p-3 text-center">
                <p className="text-ink-500 text-xs font-black">{key}</p>
                <p className="text-moss-800 mt-2 text-3xl font-black">{counts[key] ?? 0}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => adjust(key, -1)}
                    className="grid size-9 place-items-center rounded-xl bg-white shadow-sm"
                    aria-label={`Decrease ${key}`}
                  >
                    <Minus className="size-4" />
                  </button>
                  <button
                    onClick={() => adjust(key, 1)}
                    className="bg-moss-700 grid size-9 place-items-center rounded-xl text-white shadow-sm"
                    aria-label={`Increase ${key}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-950">
            <span>{total} aggregate responses</span>
            <span>Approx. class size: {classSize}</span>
          </div>
          <label className="mt-4 block text-sm font-black">
            Teaching note (optional)
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What should change next?"
              className="surface mt-2 h-11 w-full rounded-xl border px-3 text-sm font-medium"
            />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!prompt.trim() || total === 0}
              loading={saving}
              onClick={async () => {
                setSaving(true);
                await onSave({
                  prompt: prompt.trim(),
                  mode,
                  counts,
                  ...(mode === "mcq" || mode === "true-false" ? { correctKey } : {}),
                  ...(note.trim() ? { note: note.trim() } : {})
                });
                setSaving(false);
                onClose();
              }}
            >
              <Check className="size-4" /> Save aggregate check
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
