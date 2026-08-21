import { gradeLevels, subjects } from "@chalkbox/contracts";
import {
  AlertTriangle,
  Cloud,
  Copy,
  Download,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  WifiOff
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { downloadJson } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

export function SettingsPage() {
  const profile = useAppStore((state) => state.profile);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const {
    plans,
    sessions,
    checkIns,
    reflections,
    classroomProfiles,
    conflicts,
    pendingMutationCount,
    resolveConflict,
    resetDemo
  } = useDomain();
  const mode = useAppStore((state) => state.mode);
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.theme;
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
  }, [settings.theme, settings.highContrast]);
  const exportWorkspace = () =>
    downloadJson("chalkbox-workspace-backup.json", {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      plans,
      sessions,
      checkIns,
      reflections
    });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Control defaults, accessibility, offline behaviour and your demo data."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">Teacher profile</h2>
            <p className="text-muted mt-1 text-xs">
              Profile editing will sync to the account when cloud mode is enabled.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={profile?.fullName ?? ""} readOnly />
              <Input label="Email" value={profile?.email ?? ""} readOnly />
              <Input label="School" value={profile?.schoolName ?? ""} readOnly />
              <Input
                label="District and state"
                value={[profile?.district, profile?.state].filter(Boolean).join(", ")}
                readOnly
              />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">Planning defaults</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Select
                label="Default grade"
                value={settings.defaultGrade}
                onChange={(event) =>
                  setSettings({ defaultGrade: event.target.value as typeof settings.defaultGrade })
                }
              >
                {gradeLevels.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </Select>
              <Select
                label="Default subject"
                value={settings.defaultSubject}
                onChange={(event) =>
                  setSettings({
                    defaultSubject: event.target.value as typeof settings.defaultSubject
                  })
                }
              >
                {subjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </Select>
              <Input
                label="Default duration"
                type="number"
                min={20}
                max={90}
                value={settings.defaultDurationMinutes}
                onChange={(event) =>
                  setSettings({ defaultDurationMinutes: Number(event.target.value) })
                }
              />
              <Select
                label="Default classroom"
                value={settings.defaultClassroomProfileId ?? ""}
                onChange={(event) =>
                  setSettings({ defaultClassroomProfileId: event.target.value || undefined })
                }
              >
                <option value="">No profile</option>
                {classroomProfiles
                  .filter((item) => !item.archived)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">Accessibility & appearance</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => setSettings({ theme: "light" })}
                className={`rounded-2xl border p-4 text-left ${settings.theme === "light" ? "border-moss-700 bg-moss-50" : "border-black/8"}`}
              >
                <Sun className="size-5" />
                <p className="mt-3 text-sm font-black">Light</p>
              </button>
              <button
                onClick={() => setSettings({ theme: "dark" })}
                className={`rounded-2xl border p-4 text-left ${settings.theme === "dark" ? "border-moss-700 bg-moss-50 text-ink-950" : "border-black/8"}`}
              >
                <Moon className="size-5" />
                <p className="mt-3 text-sm font-black">Dark</p>
              </button>
              <button
                onClick={() => setSettings({ theme: "system" })}
                className={`rounded-2xl border p-4 text-left ${settings.theme === "system" ? "border-moss-700 bg-moss-50" : "border-black/8"}`}
              >
                <span className="text-xl font-black">A</span>
                <p className="mt-3 text-sm font-black">System</p>
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <Toggle
                label="Reduce motion"
                description="Minimise transitions and animated progress."
                checked={settings.reducedMotion}
                onChange={(value) => setSettings({ reducedMotion: value })}
              />
              <Toggle
                label="Higher contrast"
                description="Strengthen text and border contrast."
                checked={settings.highContrast}
                onChange={(value) => setSettings({ highContrast: value })}
              />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">Offline sync safety</h2>
                <p className="text-muted mt-1 text-xs leading-5">
                  Changes replay in order after reconnecting. A version mismatch pauses instead of
                  silently overwriting either copy.
                </p>
              </div>
              <span className="bg-moss-100 text-moss-800 rounded-full px-3 py-1 text-xs font-black">
                {pendingMutationCount} queued
              </span>
            </div>
            {conflicts.length ? (
              <div className="mt-5 space-y-3">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                      <div>
                        <p className="text-sm font-black text-amber-950">
                          Choose which {conflict.entityType.replaceAll("-", " ")} to keep
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-900">
                          Local v{conflict.localVersion} and cloud v{conflict.cloudVersion} changed
                          independently. Detected{" "}
                          {new Date(conflict.detectedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                          .
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await resolveConflict(conflict.id, "keep-local");
                          toast.success("Local copy queued for sync");
                        }}
                      >
                        <WifiOff className="size-3.5" /> Keep local
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await resolveConflict(conflict.id, "keep-cloud");
                          toast.success("Cloud copy restored locally");
                        }}
                      >
                        <Cloud className="size-3.5" /> Keep cloud
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await resolveConflict(conflict.id, "duplicate-both");
                          toast.success("Both copies preserved");
                        }}
                      >
                        <Copy className="size-3.5" /> Duplicate both
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-moss-50 text-moss-800 mt-5 flex items-center gap-3 rounded-xl p-4 text-sm font-bold">
                <ShieldCheck className="size-5" /> No unresolved sync conflicts.
              </div>
            )}
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-black">Privacy & notifications</h2>
            <div className="mt-4 space-y-2">
              <Toggle
                label="Save plans offline"
                description="Keep drafts and teaching notes in this browser."
                checked={settings.saveOffline}
                onChange={(value) => setSettings({ saveOffline: value })}
              />
              <Toggle
                label="Email notifications"
                description="Receive plan and mentor reminders in account mode."
                checked={settings.emailNotifications}
                onChange={(value) => setSettings({ emailNotifications: value })}
              />
              <Toggle
                label="Anonymous product analytics"
                description="Off by default; never includes lesson content."
                checked={settings.analyticsConsent}
                onChange={(value) => setSettings({ analyticsConsent: value })}
              />
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <WifiOff className="size-5" />
            </span>
            <h2 className="mt-4 font-black">Offline storage</h2>
            <p className="text-muted mt-2 text-xs leading-5">
              {plans.length} plans and {sessions.length} teaching sessions are available on this
              device.
            </p>
            <Button variant="secondary" className="mt-4 w-full" onClick={exportWorkspace}>
              <Download className="size-4" />
              Export backup
            </Button>
          </Card>
          <Card className="p-5">
            <span className="bg-moss-100 text-moss-700 grid size-10 place-items-center rounded-xl">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="mt-4 font-black">Data boundary</h2>
            <p className="text-muted mt-2 text-xs leading-5">
              Do not enter student names or personal data. AI credentials stay server-side.
            </p>
          </Card>
          {mode.startsWith("demo") && (
            <Card className="border-amber-200 bg-amber-50 p-5">
              <h2 className="font-black text-amber-950">Reset judge demo</h2>
              <p className="mt-2 text-xs leading-5 text-amber-900">
                Restore the prepared teacher, plans, session, reflection and analytics records.
              </p>
              <Button
                variant="secondary"
                className="mt-4 w-full border-amber-300 bg-white"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="size-4" />
                Reset demo
              </Button>
            </Card>
          )}
        </aside>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={() => toast.success("Settings saved on this device")}>
          <Save className="size-4" />
          Save settings
        </Button>
      </div>
      {resetOpen && (
        <div className="bg-ink-950/45 fixed inset-0 z-50 grid place-items-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-black">Restore the original demo?</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              Any plans or reflections created in this demo browser will be replaced by the prepared
              fixture set.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await resetDemo();
                  setResetOpen(false);
                  toast.success("Demo restored");
                }}
              >
                Reset now
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="hover:bg-moss-50 flex w-full cursor-pointer items-center gap-4 rounded-xl p-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        <span className="text-muted mt-0.5 block text-xs leading-5">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 rounded-full transition after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-white after:transition ${checked ? "bg-moss-700 after:translate-x-5" : "bg-slate-300"}`}
      />
    </button>
  );
}
