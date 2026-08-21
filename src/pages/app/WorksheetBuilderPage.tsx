import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Download,
  GripVertical,
  KeyRound,
  Printer,
  Save,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { WorksheetDocument } from "@/components/assessment/WorksheetDocument";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDomain } from "@/state/domain-context";

export function WorksheetBuilderPage() {
  const { worksheetId } = useParams();
  const { worksheets, saveWorksheet } = useDomain();
  const stored = worksheets.find((item) => item.id === worksheetId);
  const [draft, setDraft] = useState(stored ? structuredClone(stored) : null);
  const totalMarks = useMemo(
    () => draft?.items.reduce((sum, item) => sum + item.marks, 0) ?? 0,
    [draft?.items]
  );
  if (!draft) {
    return (
      <EmptyState
        icon={Printer}
        title="Worksheet not found"
        description="Start from the Assessment Bank and add at least one question."
        action={
          <Link to="/assessments">
            <Button>Open Assessment Bank</Button>
          </Link>
        }
      />
    );
  }

  const save = async () => {
    const updated = { ...draft, updatedAt: new Date().toISOString() };
    await saveWorksheet(updated);
    setDraft(updated);
    toast.success("Worksheet saved on this device");
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    const [item] = items.splice(index, 1);
    if (!item) return;
    items.splice(target, 0, item);
    setDraft({ ...draft, items: items.map((entry, order) => ({ ...entry, order })) });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="sr-only">Worksheet Builder</h1>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          to="/assessments"
          className="text-ink-500 hover:text-moss-700 mr-auto inline-flex items-center gap-2 text-sm font-bold"
        >
          <ArrowLeft className="size-4" /> Assessment Bank
        </Link>
        <Button variant="secondary" onClick={save}>
          <Save className="size-4" /> Save
        </Button>
        <PDFDownloadLink
          document={<WorksheetDocument worksheet={draft} />}
          fileName={`ChalkBox-${draft.title.replace(/[^a-z0-9]/gi, "-")}.pdf`}
        >
          {({ loading }) => (
            <Button variant="secondary" loading={loading}>
              <Download className="size-4" /> Learner PDF
            </Button>
          )}
        </PDFDownloadLink>
        <PDFDownloadLink
          document={<WorksheetDocument worksheet={draft} answers />}
          fileName={`ChalkBox-${draft.title.replace(/[^a-z0-9]/gi, "-")}-Answer-Key.pdf`}
        >
          {({ loading }) => (
            <Button variant="sun" loading={loading}>
              <KeyRound className="size-4" /> Answer key
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-moss-900 p-6 text-white sm:p-7">
              <p className="text-xs font-black tracking-[0.15em] text-emerald-200 uppercase">
                Printable classroom tool
              </p>
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                aria-label="Worksheet title"
                className="mt-3 w-full border-0 bg-transparent text-3xl font-black tracking-[-0.04em] text-white outline-none placeholder:text-white/40"
              />
              <p className="mt-2 text-sm text-white/70">
                Class {draft.grade} · {draft.subject} · {draft.chapter || "Custom set"}
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <label className="text-sm font-black sm:col-span-2">
                Instructions
                <textarea
                  value={draft.instructions}
                  onChange={(event) => setDraft({ ...draft, instructions: event.target.value })}
                  rows={3}
                  className="surface mt-2 w-full rounded-xl border p-3 text-sm font-medium"
                />
              </label>
              <label className="text-sm font-black">
                Language
                <select
                  value={draft.language}
                  onChange={(event) =>
                    setDraft({ ...draft, language: event.target.value as typeof draft.language })
                  }
                  className="surface mt-2 h-11 w-full rounded-xl border px-3 text-sm"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Bilingual English–Hindi</option>
                </select>
              </label>
              <label className="flex items-end gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={draft.includeAnswers}
                  onChange={(event) => setDraft({ ...draft, includeAnswers: event.target.checked })}
                  className="accent-moss-700 size-5"
                />{" "}
                Include answers in teacher copy
              </label>
            </div>
          </Card>

          {draft.items.map((item, index) => (
            <Card key={item.id} className="p-5">
              <div className="flex gap-3">
                <GripVertical className="text-ink-500 mt-1 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{index + 1}</Badge>
                    <Badge tone="blue">{item.questionSnapshot.type.replace("-", " ")}</Badge>
                    <Badge
                      tone={item.questionSnapshot.difficulty === "challenge" ? "amber" : "green"}
                    >
                      {item.questionSnapshot.difficulty}
                    </Badge>
                  </div>
                  <textarea
                    value={item.questionSnapshot.prompt}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        items: draft.items.map((entry) =>
                          entry.id === item.id
                            ? {
                                ...entry,
                                questionSnapshot: {
                                  ...entry.questionSnapshot,
                                  prompt: event.target.value
                                }
                              }
                            : entry
                        )
                      })
                    }
                    rows={3}
                    aria-label={`Question ${index + 1}`}
                    className="mt-3 w-full resize-y border-0 bg-transparent p-0 text-base leading-7 font-black outline-none"
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className="text-muted text-xs font-bold">
                      Marks{" "}
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={item.marks}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            items: draft.items.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, marks: Number(event.target.value) }
                                : entry
                            )
                          })
                        }
                        className="surface text-ink-950 ml-2 h-9 w-16 rounded-lg border px-2"
                      />
                    </label>
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="hover:bg-moss-50 grid size-9 place-items-center rounded-lg disabled:opacity-30"
                        aria-label="Move question up"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === draft.items.length - 1}
                        className="hover:bg-moss-50 grid size-9 place-items-center rounded-lg disabled:opacity-30"
                        aria-label="Move question down"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: draft.items
                              .filter((entry) => entry.id !== item.id)
                              .map((entry, order) => ({ ...entry, order }))
                          })
                        }
                        className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                        aria-label="Remove question"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="text-ink-500 text-xs font-black tracking-wider uppercase">
              Worksheet balance
            </p>
            <p className="text-moss-700 mt-2 text-4xl font-black">{totalMarks}</p>
            <p className="text-muted text-xs">total marks · {draft.items.length} questions</p>
            <div className="mt-5 space-y-3">
              {["foundation", "core", "challenge"].map((difficulty) => {
                const count = draft.items.filter(
                  (item) => item.questionSnapshot.difficulty === difficulty
                ).length;
                return (
                  <div key={difficulty}>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="capitalize">{difficulty}</span>
                      <span>{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="bg-moss-500 h-full rounded-full"
                        style={{
                          width: `${draft.items.length ? (count / draft.items.length) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
            <Printer className="mr-1 inline size-4" /> Learners receive paper only. No sign-in,
            named record, or individual grading profile is created.
          </Card>
          <Button className="w-full" size="lg" onClick={save}>
            <Save className="size-4" /> Save worksheet
          </Button>
        </aside>
      </div>
    </div>
  );
}
