import type { LessonActivity, LessonPlan } from "@chalkbox/contracts";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Eye,
  FileText,
  History,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { QualityPanel } from "@/components/plans/QualityPanel";
import { SourceDisclosure } from "@/components/plans/SourceDisclosure";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { evaluatePlan } from "@/lib/lesson-quality";
import { cn, uid } from "@/lib/utils";
import { regeneratePlanSection, type RegenerableSection } from "@/services/ai-actions";
import { useDomain } from "@/state/domain-context";

type EditorTab = "overview" | "sequence" | "assessment" | "versions";

export function PlanEditorPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const {
    plans,
    planVersions,
    updatePlan,
    createPlanVersion,
    restorePlanVersion,
    duplicatePlanVersion
  } = useDomain();
  const storedPlan = plans.find((plan) => plan.id === planId);
  const [draft, setDraft] = useState<LessonPlan | null>(() =>
    storedPlan ? structuredClone(storedPlan) : null
  );
  const [tab, setTab] = useState<EditorTab>("overview");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSection, setAiSection] = useState<RegenerableSection>("activities");
  const [aiInstruction, setAiInstruction] = useState(
    "Make this more practical for a mixed-ability, low-resource classroom."
  );
  const [aiWorking, setAiWorking] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (!draft || !planId) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const quality = evaluatePlan(draft).score;
      await updatePlan(planId, { ...draft, qualityScore: quality });
      setSaveState("saved");
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, planId, updatePlan]);

  if (!draft)
    return (
      <EmptyState
        icon={FileText}
        title="Plan not found"
        description="This plan may have been removed or belongs to another workspace."
        action={
          <Link to="/library">
            <Button>Return to library</Button>
          </Link>
        }
      />
    );

  const updateDraft = (patch: Partial<LessonPlan>) =>
    setDraft((current) =>
      current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current
    );
  const updateActivity = (id: string, patch: Partial<LessonActivity>) =>
    updateDraft({
      activities: draft.activities.map((activity) =>
        activity.id === id ? { ...activity, ...patch } : activity
      )
    });
  const saveNow = async () => {
    const qualityScore = evaluatePlan(draft).score;
    await updatePlan(draft.id, { ...draft, qualityScore });
    setDraft({ ...draft, qualityScore });
    setSaveState("saved");
    toast.success("Plan saved offline");
  };
  const addObjective = () =>
    updateDraft({
      objectives: [
        ...draft.objectives,
        { id: uid("objective"), text: "Learners will be able to…", bloomLevel: "apply" }
      ]
    });
  const addActivity = () =>
    updateDraft({
      activities: [
        ...draft.activities,
        {
          id: uid("activity"),
          title: "New learning activity",
          type: "activity",
          durationMinutes: 5,
          teacherSteps: ["Describe what the teacher will do."],
          studentSteps: ["Describe what learners will do."],
          materials: ["Blackboard"],
          differentiation: "Offer a simpler prompt and an extension challenge.",
          offlineAlternative: "Use board work and peer discussion."
        }
      ]
    });
  const moveActivity = (index: number, direction: -1 | 1) => {
    const next = [...draft.activities];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const other = next[target];
    if (!current || !other) return;
    next[index] = other;
    next[target] = current;
    updateDraft({ activities: next });
  };
  const markReady = async () => {
    const score = evaluatePlan(draft).score;
    const status = score >= 80 ? "ready" : "draft";
    updateDraft({ status, qualityScore: score });
    await updatePlan(draft.id, { status, qualityScore: score });
    if (status === "ready") toast.success("Plan marked ready to teach");
    else toast.error("Resolve the quality checks before marking this plan ready.");
  };
  const versions = planVersions
    .filter((version) => version.planId === draft.id)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  const checkpoint = async () => {
    await saveNow();
    const version = await createPlanVersion(draft.id, "manual-checkpoint", "Teacher checkpoint");
    toast.success(`Version ${version.versionNumber} saved`, {
      description: "You can restore or duplicate this immutable checkpoint later."
    });
  };
  const runAiAdjustment = async () => {
    if (!aiInstruction.trim()) return;
    setAiWorking(true);
    try {
      await saveNow();
      await createPlanVersion(draft.id, "before-regeneration", `Before ${aiSection} adjustment`);
      const generated = await regeneratePlanSection(draft, aiSection, aiInstruction.trim());
      let patch: Partial<LessonPlan>;
      if (aiSection === "objectives") {
        patch = { objectives: generated.result as LessonPlan["objectives"] };
      } else if (aiSection === "activities") {
        patch = { activities: generated.result as LessonPlan["activities"] };
      } else if (aiSection === "assessments") {
        patch = { assessments: generated.result as LessonPlan["assessments"] };
      } else if (aiSection === "homework") {
        patch = { homework: String(generated.result) };
      } else {
        patch = { teacherNotes: String(generated.result) };
      }
      updateDraft(patch);
      await updatePlan(draft.id, patch);
      setAiOpen(false);
      toast.success(
        generated.provider === "gemini"
          ? `${aiSection.replaceAll("-", " ")} regenerated with ${generated.model}`
          : "Prepared demo adjustment applied",
        {
          description:
            generated.provider === "gemini"
              ? "Review the changed section before marking the plan ready."
              : "This was not a live AI response. The original state is preserved in version history."
        }
      );
    } catch (caught) {
      toast.error("The section could not be adjusted", {
        description: caught instanceof Error ? caught.message : "Please retry."
      });
    } finally {
      setAiWorking(false);
    }
  };

  const tabs: Array<{ id: EditorTab; label: string; count?: number }> = [
    { id: "overview", label: "Plan basics", count: draft.objectives.length },
    { id: "sequence", label: "Lesson sequence", count: draft.activities.length },
    { id: "assessment", label: "Assessment", count: draft.assessments.length },
    { id: "versions", label: "Version history", count: versions.length }
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          to="/library"
          className="text-ink-500 hover:text-moss-700 inline-flex items-center gap-2 text-sm font-bold"
        >
          <ArrowLeft className="size-4" />
          Library
        </Link>
        <span className="h-4 w-px bg-black/10" />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold",
            saveState === "saved" ? "text-moss-700" : "text-amber-700"
          )}
        >
          {saveState === "saved" ? (
            <Check className="size-3.5" />
          ) : (
            <span className="size-2 animate-pulse rounded-full bg-amber-500" />
          )}
          {saveState === "saved" ? "Saved on this device" : "Saving…"}
        </span>
        {draft.generationMode === "prepared-demo" && (
          <Badge tone="purple">Prepared demo content</Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={saveNow}>
            <Save className="size-4" />
            Save
          </Button>
          <Button variant="secondary" size="sm" onClick={checkpoint}>
            <History className="size-4" />
            Checkpoint
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="size-4" />
            AI assist
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await saveNow();
              navigate(`/plans/${draft.id}/preview`);
            }}
          >
            <Eye className="size-4" />
            Preview
          </Button>
          <Button size="sm" onClick={markReady}>
            <Sparkles className="size-4" />
            Mark ready
          </Button>
        </div>
      </div>

      <Card className="mb-5 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <Input
            label="Lesson plan title"
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
            className="text-lg font-black"
          />
          <div className="flex flex-wrap gap-2 pb-0.5">
            <Badge tone="green">Grade {draft.grade}</Badge>
            <Badge tone="blue">{draft.subject}</Badge>
            <Badge>{draft.durationMinutes} min</Badge>
            <Badge>{draft.language}</Badge>
          </div>
        </div>
        <p className="text-muted mt-4 text-xs leading-5">
          <span className="text-ink-700 font-black">Topic: </span>
          {draft.topic} · <span className="text-ink-700 font-black">Class context: </span>
          {draft.classSize} learners, {draft.constraints.join(", ").toLowerCase()}.
        </p>
      </Card>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-black/6 bg-white p-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition",
              tab === item.id ? "bg-moss-700 text-white" : "text-ink-500 hover:bg-moss-50"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  tab === item.id ? "bg-white/15" : "bg-slate-100"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div>
          {tab === "overview" && (
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black">Learning objectives</h2>
                    <p className="text-muted mt-1 text-xs">
                      Use observable verbs that can be checked during the lesson.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={addObjective}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                <div className="mt-5 space-y-3">
                  {draft.objectives.map((objective, index) => (
                    <div
                      key={objective.id}
                      className="bg-paper grid gap-2 rounded-xl p-3 sm:grid-cols-[2rem_1fr_8rem_auto] sm:items-center"
                    >
                      <span className="bg-moss-100 text-moss-700 grid size-8 place-items-center rounded-lg text-xs font-black">
                        {index + 1}
                      </span>
                      <input
                        aria-label={`Objective ${index + 1}`}
                        value={objective.text}
                        onChange={(event) =>
                          updateDraft({
                            objectives: draft.objectives.map((item) =>
                              item.id === objective.id
                                ? { ...item, text: event.target.value }
                                : item
                            )
                          })
                        }
                        className="surface min-h-10 rounded-lg border px-3 text-sm"
                      />
                      <select
                        aria-label={`Bloom level for objective ${index + 1}`}
                        value={objective.bloomLevel}
                        onChange={(event) =>
                          updateDraft({
                            objectives: draft.objectives.map((item) =>
                              item.id === objective.id
                                ? {
                                    ...item,
                                    bloomLevel: event.target.value as typeof objective.bloomLevel
                                  }
                                : item
                            )
                          })
                        }
                        className="surface h-10 rounded-lg border px-2 text-xs font-bold"
                      >
                        <option>remember</option>
                        <option>understand</option>
                        <option>apply</option>
                        <option>analyse</option>
                        <option>evaluate</option>
                        <option>create</option>
                      </select>
                      <button
                        aria-label={`Remove objective ${index + 1}`}
                        disabled={draft.objectives.length <= 1}
                        onClick={() =>
                          updateDraft({
                            objectives: draft.objectives.filter((item) => item.id !== objective.id)
                          })
                        }
                        className="grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-30"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5 sm:p-6">
                <h2 className="text-lg font-black">Classroom context</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Class size"
                    type="number"
                    value={draft.classSize}
                    onChange={(event) => updateDraft({ classSize: Number(event.target.value) })}
                  />
                  <Input
                    label="Duration"
                    type="number"
                    value={draft.durationMinutes}
                    onChange={(event) =>
                      updateDraft({ durationMinutes: Number(event.target.value) })
                    }
                  />
                  <Input
                    label="Available materials"
                    value={draft.availableMaterials.join(", ")}
                    onChange={(event) =>
                      updateDraft({
                        availableMaterials: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      })
                    }
                    hint="Comma-separated"
                  />
                  <Input
                    label="Constraints"
                    value={draft.constraints.join(", ")}
                    onChange={(event) =>
                      updateDraft({
                        constraints: event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      })
                    }
                    hint="Comma-separated"
                  />
                </div>
              </Card>
            </div>
          )}

          {tab === "sequence" && (
            <div className="space-y-4">
              {draft.activities.map((activity, index) => (
                <Card key={activity.id} className="overflow-hidden">
                  <div className="bg-paper flex items-center gap-3 border-b border-black/5 px-4 py-3">
                    <span className="bg-moss-700 grid size-8 place-items-center rounded-lg text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-moss-700 min-w-0 flex-1 truncate text-xs font-black tracking-wider uppercase">
                      {activity.type}
                    </p>
                    <button
                      onClick={() => moveActivity(index, -1)}
                      disabled={index === 0}
                      aria-label="Move activity up"
                      className="grid size-8 place-items-center rounded-lg hover:bg-white disabled:opacity-25"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() => moveActivity(index, 1)}
                      disabled={index === draft.activities.length - 1}
                      aria-label="Move activity down"
                      className="grid size-8 place-items-center rounded-lg hover:bg-white disabled:opacity-25"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      onClick={() =>
                        updateDraft({
                          activities: draft.activities.filter((item) => item.id !== activity.id)
                        })
                      }
                      disabled={draft.activities.length <= 1}
                      aria-label="Remove activity"
                      className="grid size-8 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-25"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-[1fr_9rem]">
                    <Input
                      label="Activity title"
                      value={activity.title}
                      onChange={(event) =>
                        updateActivity(activity.id, { title: event.target.value })
                      }
                    />
                    <Input
                      label="Minutes"
                      type="number"
                      min={1}
                      value={activity.durationMinutes}
                      onChange={(event) =>
                        updateActivity(activity.id, { durationMinutes: Number(event.target.value) })
                      }
                    />
                    <Select
                      label="Activity type"
                      value={activity.type}
                      onChange={(event) =>
                        updateActivity(activity.id, {
                          type: event.target.value as LessonActivity["type"]
                        })
                      }
                    >
                      <option value="hook">Hook</option>
                      <option value="explain">Explain</option>
                      <option value="activity">Activity</option>
                      <option value="practice">Practice</option>
                      <option value="assessment">Assessment</option>
                      <option value="closure">Closure</option>
                    </Select>
                    <Input
                      label="Materials"
                      value={activity.materials.join(", ")}
                      onChange={(event) =>
                        updateActivity(activity.id, {
                          materials: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean)
                        })
                      }
                    />
                    <div className="sm:col-span-2">
                      <Textarea
                        label="Teacher steps"
                        value={activity.teacherSteps.join("\n")}
                        onChange={(event) =>
                          updateActivity(activity.id, {
                            teacherSteps: event.target.value.split("\n").filter(Boolean)
                          })
                        }
                        hint="One step per line"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Textarea
                        label="Learner actions"
                        value={activity.studentSteps.join("\n")}
                        onChange={(event) =>
                          updateActivity(activity.id, {
                            studentSteps: event.target.value.split("\n").filter(Boolean)
                          })
                        }
                        hint="One action per line"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Inclusive support"
                        value={activity.differentiation ?? ""}
                        onChange={(event) =>
                          updateActivity(activity.id, { differentiation: event.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Offline alternative"
                        value={activity.offlineAlternative ?? ""}
                        onChange={(event) =>
                          updateActivity(activity.id, { offlineAlternative: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </Card>
              ))}
              <Button variant="secondary" className="w-full" onClick={addActivity}>
                <Plus className="size-4" />
                Add activity
              </Button>
            </div>
          )}

          {tab === "assessment" && (
            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black">Checks for understanding</h2>
                    <p className="text-muted mt-1 text-xs">
                      Each check should point back to at least one objective.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      updateDraft({
                        assessments: [
                          ...draft.assessments,
                          {
                            id: uid("assessment"),
                            prompt: "Add a short check for understanding.",
                            type: "exit-ticket",
                            answerGuide: "Describe acceptable evidence.",
                            checksObjectiveIds: draft.objectives[0] ? [draft.objectives[0].id] : []
                          }
                        ]
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
                <div className="mt-5 space-y-4">
                  {draft.assessments.map((assessment, index) => (
                    <div key={assessment.id} className="rounded-2xl border border-black/6 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-moss-700 text-xs font-black tracking-wider uppercase">
                          Check {index + 1}
                        </p>
                        <button
                          aria-label="Remove assessment"
                          onClick={() =>
                            updateDraft({
                              assessments: draft.assessments.filter(
                                (item) => item.id !== assessment.id
                              )
                            })
                          }
                          className="grid size-8 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-3 space-y-4">
                        <Textarea
                          label="Prompt"
                          value={assessment.prompt}
                          onChange={(event) =>
                            updateDraft({
                              assessments: draft.assessments.map((item) =>
                                item.id === assessment.id
                                  ? { ...item, prompt: event.target.value }
                                  : item
                              )
                            })
                          }
                        />
                        <Textarea
                          label="Answer / evidence guide"
                          value={assessment.answerGuide}
                          onChange={(event) =>
                            updateDraft({
                              assessments: draft.assessments.map((item) =>
                                item.id === assessment.id
                                  ? { ...item, answerGuide: event.target.value }
                                  : item
                              )
                            })
                          }
                        />
                        <Select
                          label="Response format"
                          value={assessment.type}
                          onChange={(event) =>
                            updateDraft({
                              assessments: draft.assessments.map((item) =>
                                item.id === assessment.id
                                  ? { ...item, type: event.target.value as typeof assessment.type }
                                  : item
                              )
                            })
                          }
                        >
                          <option value="oral">Oral</option>
                          <option value="written">Written</option>
                          <option value="observation">Observation</option>
                          <option value="exit-ticket">Exit ticket</option>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="space-y-4 p-5 sm:p-6">
                <Textarea
                  label="Homework / extension"
                  value={draft.homework}
                  onChange={(event) => updateDraft({ homework: event.target.value })}
                />
                <Textarea
                  label="Private teacher notes"
                  value={draft.teacherNotes}
                  onChange={(event) => updateDraft({ teacherNotes: event.target.value })}
                  hint="Do not enter student names or personal information."
                />
              </Card>
            </div>
          )}

          {tab === "versions" && (
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="bg-moss-900 p-5 text-white sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-white/10">
                      <History className="text-sun-500 size-5" />
                    </span>
                    <div>
                      <h2 className="text-xl font-black">Immutable plan checkpoints</h2>
                      <p className="mt-1 text-xs leading-5 text-white/65">
                        Autosave protects the current draft. Checkpoints preserve meaningful states
                        for restore, sharing and publishing.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-black/5">
                  {versions.map((version, index) => (
                    <div key={version.id} className="p-5 sm:flex sm:items-center sm:gap-5">
                      <span className="bg-moss-100 text-moss-800 grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-black">
                        v{version.versionNumber}
                      </span>
                      <div className="mt-3 min-w-0 flex-1 sm:mt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">
                            {version.label ?? version.reason.replaceAll("-", " ")}
                          </p>
                          {index === 0 && <Badge tone="green">Latest checkpoint</Badge>}
                        </div>
                        <p className="text-muted mt-1 text-xs">
                          {new Date(version.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}{" "}
                          · {version.snapshot.activities.length} activities · quality{" "}
                          {version.snapshot.qualityScore}/100
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2 sm:mt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const duplicate = await duplicatePlanVersion(version.id);
                            toast.success("Version duplicated as a private draft");
                            navigate(`/plans/${duplicate.id}/edit`);
                          }}
                        >
                          <Copy className="size-4" /> Duplicate
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            await restorePlanVersion(version.id);
                            setDraft({
                              ...structuredClone(version.snapshot),
                              id: draft.id,
                              ownerId: draft.ownerId,
                              createdAt: draft.createdAt,
                              isPublic: false,
                              publicSlug: undefined,
                              updatedAt: new Date().toISOString()
                            });
                            toast.success(`Restored version ${version.versionNumber}`, {
                              description: "The previous current state was checkpointed first."
                            });
                          }}
                        >
                          <RotateCcw className="size-4" /> Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Button variant="secondary" className="w-full" onClick={checkpoint}>
                <History className="size-4" /> Save a manual checkpoint now
              </Button>
            </div>
          )}
        </div>
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <QualityPanel plan={{ ...draft, qualityScore: evaluatePlan(draft).score }} />
          <SourceDisclosure plan={draft} />
        </aside>
      </div>
      {aiOpen && (
        <div
          className="bg-ink-950/50 fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
          role="dialog"
          aria-modal="true"
          aria-label="AI section assistant"
        >
          <Card className="my-4 w-full max-w-xl overflow-hidden">
            <div className="bg-moss-900 flex items-start justify-between gap-4 p-6 text-white">
              <div>
                <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
                  Version-safe AI assist
                </p>
                <h2 className="mt-1 text-2xl font-black">Adjust one section</h2>
                <p className="mt-2 text-xs leading-5 text-white/65">
                  ChalkBox checkpoints the current plan first. Nothing is silently replaced.
                </p>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                className="grid size-9 place-items-center rounded-xl hover:bg-white/10"
                aria-label="Close AI assistant"
              >
                <X />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <Select
                label="Section to adjust"
                value={aiSection}
                onChange={(event) => setAiSection(event.target.value as RegenerableSection)}
              >
                <option value="objectives">Learning objectives</option>
                <option value="activities">Lesson activities</option>
                <option value="assessments">Assessment checks</option>
                <option value="homework">Homework / extension</option>
                <option value="teacherNotes">Teacher notes</option>
              </Select>
              <Textarea
                label="What should change?"
                value={aiInstruction}
                onChange={(event) => setAiInstruction(event.target.value)}
                hint="Include the classroom reason, not learner names."
              />
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-5 text-violet-950">
                <strong>Truthful fallback:</strong> configured deployments call the protected Gemini
                action. An unconfigured demo applies a clearly labelled prepared adjustment.
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setAiOpen(false)}>
                  Cancel
                </Button>
                <Button
                  loading={aiWorking}
                  disabled={!aiInstruction.trim()}
                  onClick={runAiAdjustment}
                >
                  <Sparkles className="size-4" /> Checkpoint & adjust
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
