import type { ClassroomProfile, GradeLevel } from "@chalkbox/contracts";
import { gradeLevels } from "@chalkbox/contracts";
import { Archive, Check, Copy, Plus, School, Users, Wifi, WifiOff, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { demoTeacher } from "@/data/demo-fixtures";
import { uid } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

function newProfile(ownerId: string): ClassroomProfile {
  const now = new Date().toISOString();
  return {
    id: uid("classroom"),
    ownerId,
    name: "New classroom",
    grade: "6",
    learnerCount: 35,
    board: "CBSE/NCERT",
    language: "Bilingual English–Hindi",
    internetAvailability: "intermittent",
    projectorAvailable: false,
    chalkboardAvailable: true,
    commonMaterials: ["Blackboard", "Chalk", "Local objects"],
    mixedAbility: true,
    readingSupportNeeds: [],
    accessibilityConsiderations: [],
    typicalDurationMinutes: 45,
    archived: false,
    createdAt: now,
    updatedAt: now
  };
}

export function ClassroomProfilesPage() {
  const profile = useAppStore((state) => state.profile);
  const {
    classroomProfiles,
    saveClassroomProfile,
    archiveClassroomProfile,
    duplicateClassroomProfile
  } = useDomain();
  const [draft, setDraft] = useState<ClassroomProfile | null>(null);
  const active = classroomProfiles.filter((item) => !item.archived);
  const save = async () => {
    if (!draft) return;
    const updated = { ...draft, updatedAt: new Date().toISOString() };
    await saveClassroomProfile(updated);
    setDraft(null);
    toast.success("Classroom profile saved", {
      description: "New plans can now reuse these constraints."
    });
  };
  return (
    <div>
      <PageHeader
        eyebrow="Reusable planning context"
        title="Classroom Profiles"
        description="Save the room, resource and learner-group context—not learner identities."
        actions={
          <Button onClick={() => setDraft(newProfile(profile?.id ?? demoTeacher.id))}>
            <Plus className="size-4" /> New classroom
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {active.map((classroom) => (
          <Card key={classroom.id} className="overflow-hidden">
            <div className="bg-moss-900 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-white/10">
                  <School className="size-5" />
                </span>
                <Badge className="border-white/10 bg-white/10 text-white">
                  {classroom.additionalGrade
                    ? `Classes ${classroom.grade} + ${classroom.additionalGrade}`
                    : `Class ${classroom.grade}`}
                </Badge>
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight">{classroom.name}</h2>
              <p className="mt-2 text-sm text-white/70">
                {classroom.board} · {classroom.language}
              </p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="surface-subtle rounded-xl p-3">
                  <Users className="text-moss-700 size-4" />
                  <p className="mt-2 text-lg font-black">{classroom.learnerCount}</p>
                  <p className="text-muted text-[10px] font-bold uppercase">learners</p>
                </div>
                <div className="surface-subtle rounded-xl p-3">
                  {classroom.internetAvailability === "none" ? (
                    <WifiOff className="text-moss-700 size-4" />
                  ) : (
                    <Wifi className="text-moss-700 size-4" />
                  )}
                  <p className="mt-2 text-sm font-black capitalize">
                    {classroom.internetAvailability}
                  </p>
                  <p className="text-muted text-[10px] font-bold uppercase">internet</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {classroom.commonMaterials.slice(0, 4).map((item) => (
                  <span
                    key={item}
                    className="bg-moss-50 text-moss-800 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setDraft(structuredClone(classroom))}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await duplicateClassroomProfile(classroom.id);
                    toast.success("Classroom duplicated");
                  }}
                >
                  <Copy className="size-4" /> Duplicate
                </Button>
              </div>
              <button
                onClick={async () => {
                  await archiveClassroomProfile(classroom.id);
                  toast.success("Classroom archived");
                }}
                className="text-muted mx-auto mt-3 flex items-center gap-1 text-xs font-bold hover:text-red-700"
              >
                <Archive className="size-3.5" /> Archive
              </button>
            </div>
          </Card>
        ))}
      </div>

      {draft && (
        <div
          className="bg-ink-950/45 fixed inset-0 z-50 overflow-y-auto p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Classroom profile editor"
        >
          <Card className="mx-auto my-4 w-full max-w-3xl overflow-hidden">
            <div className="bg-moss-900 flex items-center justify-between p-6 text-white">
              <div>
                <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
                  No student names
                </p>
                <h2 className="mt-1 text-2xl font-black">Classroom context</h2>
              </div>
              <button onClick={() => setDraft(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Input
                label="Profile name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <Input
                label="Approximate learners"
                type="number"
                min={1}
                max={100}
                value={draft.learnerCount}
                onChange={(event) =>
                  setDraft({ ...draft, learnerCount: Number(event.target.value) })
                }
              />
              <Select
                label="Primary grade"
                value={draft.grade}
                onChange={(event) =>
                  setDraft({ ...draft, grade: event.target.value as GradeLevel })
                }
              >
                {gradeLevels.map((item) => (
                  <option key={item} value={item}>
                    Class {item}
                  </option>
                ))}
              </Select>
              <Select
                label="Second grade (optional)"
                value={draft.additionalGrade ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    additionalGrade: (event.target.value || undefined) as GradeLevel | undefined
                  })
                }
              >
                <option value="">Single-grade</option>
                {gradeLevels
                  .filter((item) => item !== draft.grade)
                  .map((item) => (
                    <option key={item} value={item}>
                      Class {item}
                    </option>
                  ))}
              </Select>
              <Select
                label="Board"
                value={draft.board}
                onChange={(event) =>
                  setDraft({ ...draft, board: event.target.value as ClassroomProfile["board"] })
                }
              >
                <option>CBSE/NCERT</option>
                <option>State Board</option>
                <option>Custom</option>
              </Select>
              <Select
                label="Teaching language"
                value={draft.language}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    language: event.target.value as ClassroomProfile["language"]
                  })
                }
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Bilingual English–Hindi</option>
              </Select>
              <Select
                label="Internet"
                value={draft.internetAvailability}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    internetAvailability: event.target
                      .value as ClassroomProfile["internetAvailability"]
                  })
                }
              >
                <option value="reliable">Reliable</option>
                <option value="intermittent">Intermittent</option>
                <option value="none">None</option>
              </Select>
              <Input
                label="Typical lesson minutes"
                type="number"
                min={20}
                max={90}
                value={draft.typicalDurationMinutes}
                onChange={(event) =>
                  setDraft({ ...draft, typicalDurationMinutes: Number(event.target.value) })
                }
              />
              <Textarea
                label="Common materials (comma separated)"
                value={draft.commonMaterials.join(", ")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    commonMaterials: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
              />
              <Textarea
                label="Reading support needs"
                value={draft.readingSupportNeeds.join(", ")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    readingSupportNeeds: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
              />
              <Textarea
                label="Accessibility considerations"
                value={draft.accessibilityConsiderations.join(", ")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    accessibilityConsiderations: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
              />
              <div className="grid gap-2 text-sm font-bold">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.chalkboardAvailable}
                    onChange={(event) =>
                      setDraft({ ...draft, chalkboardAvailable: event.target.checked })
                    }
                    className="accent-moss-700 size-5"
                  />{" "}
                  Chalkboard available
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.projectorAvailable}
                    onChange={(event) =>
                      setDraft({ ...draft, projectorAvailable: event.target.checked })
                    }
                    className="accent-moss-700 size-5"
                  />{" "}
                  Projector available
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.mixedAbility}
                    onChange={(event) => setDraft({ ...draft, mixedAbility: event.target.checked })}
                    className="accent-moss-700 size-5"
                  />{" "}
                  Mixed-ability group
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-black/5 p-5">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button onClick={save}>
                <Check className="size-4" /> Save classroom
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
