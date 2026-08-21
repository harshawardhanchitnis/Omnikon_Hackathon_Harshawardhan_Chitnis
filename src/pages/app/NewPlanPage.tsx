import { zodResolver } from "@hookform/resolvers/zod";
import type { PlanGenerationInput } from "@chalkbox/contracts";
import { gradeLevels, planGenerationInputSchema, subjects } from "@chalkbox/contracts";
import { ArrowLeft, BookOpenCheck, Check, Cloud, CloudOff, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { appConfig } from "@/lib/config";
import { safeMessage } from "@/lib/utils";
import { createPreparedDemoPlan, generateLessonPlan } from "@/services/plan-generator";
import { useAppStore } from "@/store/app-store";

const materials = [
  "Blackboard",
  "Chart paper",
  "Scrap paper",
  "Textbook",
  "Local objects",
  "Basic phone",
  "Projector"
];
const constraints = [
  "No projector",
  "Intermittent electricity",
  "Limited photocopies",
  "Mixed reading levels",
  "Large class",
  "Multilingual class"
];
const generationSteps = [
  "Checking classroom constraints",
  "Finding curriculum-aligned context",
  "Building timed activities",
  "Aligning assessment evidence",
  "Running quality checks"
];

export function NewPlanPage() {
  const navigate = useNavigate();
  const profile = useAppStore((state) => state.profile);
  const mode = useAppStore((state) => state.mode);
  const addPlan = useAppStore((state) => state.addPlan);
  const generationCount = useAppStore((state) => state.generationCount);
  const incrementGeneration = useAppStore((state) => state.incrementGeneration);
  const settings = useAppStore((state) => state.settings);
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<PlanGenerationInput>({
    resolver: zodResolver(planGenerationInputSchema),
    defaultValues: {
      grade: settings.defaultGrade,
      subject: settings.defaultSubject,
      topic: "",
      durationMinutes: settings.defaultDurationMinutes,
      language: "Bilingual",
      board: "CBSE",
      classSize: 35,
      availableMaterials: ["Blackboard", "Local objects"],
      constraints: ["No projector", "Mixed reading levels"],
      learningLevel: "mixed"
    }
  });
  const selectedMaterials = useWatch({ control, name: "availableMaterials" });
  const selectedConstraints = useWatch({ control, name: "constraints" });
  const quota = mode.startsWith("demo")
    ? appConfig.demoGenerationLimit
    : appConfig.teacherGenerationLimit;
  const quotaLeft = Math.max(0, quota - generationCount);
  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(
      () => setActiveStep((step) => Math.min(step + 1, generationSteps.length - 1)),
      750
    );
    return () => window.clearInterval(timer);
  }, [generating]);
  const toggleArrayValue = (
    field: "availableMaterials" | "constraints",
    value: string,
    selected: string[]
  ) => {
    setValue(
      field,
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
      { shouldValidate: true }
    );
  };
  const onSubmit = async (values: PlanGenerationInput) => {
    if (quotaLeft === 0) {
      setError(
        "Today’s free AI generation limit has been reached. You can still edit, duplicate and teach saved plans."
      );
      return;
    }
    setError("");
    setActiveStep(0);
    setGenerating(true);
    try {
      const result = await generateLessonPlan(values, profile?.id ?? "anonymous", captchaToken);
      await addPlan(result.plan);
      incrementGeneration();
      toast.success("Lesson plan generated", {
        description: `${result.plan.qualityScore}/100 quality score · ${result.latencyMs} ms`
      });
      navigate(`/plans/${result.plan.id}/edit`);
    } catch (caught) {
      setError(safeMessage(caught));
    } finally {
      setGenerating(false);
    }
  };
  const usePreparedDemo = async () => {
    setError("");
    setActiveStep(0);
    setGenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    const result = createPreparedDemoPlan();
    await addPlan(result.plan);
    setGenerating(false);
    toast.success("Prepared example loaded", {
      description: "Clearly labelled demo content—ready for the complete workflow."
    });
    navigate(`/plans/${result.plan.id}/edit`);
  };
  const watchedDuration = useWatch({ control, name: "durationMinutes" });
  const estimated = useMemo(
    () => `${Math.max(5, Math.round(watchedDuration / 5))} min prep`,
    [watchedDuration]
  );
  if (generating)
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="overflow-hidden">
          <div className="bg-moss-900 p-7 text-white">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <WandSparkles className="text-sun-500 size-6 animate-pulse" />
            </span>
            <h1 className="mt-5 text-2xl font-black">Building your classroom-ready plan</h1>
            <p className="mt-2 text-sm text-white/80">
              ChalkBox is validating structure before anything reaches your library.
            </p>
          </div>
          <ol className="space-y-1 p-5 sm:p-7">
            {generationSteps.map((step, index) => (
              <li
                key={step}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${index === activeStep ? "bg-moss-50 text-moss-900" : index < activeStep ? "text-moss-700" : "text-ink-500"}`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full ${index < activeStep ? "bg-moss-700 text-white" : index === activeStep ? "bg-sun-500 text-ink-950" : "bg-slate-100"}`}
                >
                  {index < activeStep ? <Check className="size-4" /> : index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    );
  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/dashboard"
        className="text-ink-500 hover:text-moss-700 mb-5 inline-flex items-center gap-2 text-sm font-bold"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-moss-700 text-xs font-black tracking-[0.16em] uppercase">
            Create a lesson
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Start with your classroom.
          </h1>
          <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
            Specific constraints produce more useful activities. Never include student names or
            personal data.
          </p>
        </div>
        <div className="rounded-xl border border-black/6 bg-white px-3 py-2 text-right">
          <p className="text-ink-500 text-[10px] font-black tracking-wider uppercase">
            Free generations today
          </p>
          <p className="text-moss-700 text-sm font-black">
            {quotaLeft} of {quota} remaining
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="bg-moss-100 text-moss-700 grid size-9 place-items-center rounded-xl font-black">
                1
              </span>
              <div>
                <h2 className="font-black">Lesson essentials</h2>
                <p className="text-muted text-xs">What are you teaching, and for how long?</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Grade" error={errors.grade?.message} required {...register("grade")}>
                {gradeLevels.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </Select>
              <Select
                label="Subject"
                error={errors.subject?.message}
                required
                {...register("subject")}
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2">
                <Input
                  label="Topic or learning focus"
                  placeholder="e.g. Water cycle and changes of state"
                  hint="Use a specific concept, not an entire subject."
                  error={errors.topic?.message}
                  required
                  {...register("topic")}
                />
              </div>
              <Select
                label="Board / curriculum"
                error={errors.board?.message}
                {...register("board")}
              >
                <option>CBSE</option>
                <option>State Board</option>
                <option>Other</option>
              </Select>
              <Select
                label="Teaching language"
                error={errors.language?.message}
                {...register("language")}
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
                <option>Bilingual</option>
              </Select>
              <Input
                label="Duration (minutes)"
                type="number"
                min={20}
                max={120}
                error={errors.durationMinutes?.message}
                {...register("durationMinutes", { valueAsNumber: true })}
              />
              <Input
                label="Class size"
                type="number"
                min={1}
                max={120}
                error={errors.classSize?.message}
                {...register("classSize", { valueAsNumber: true })}
              />
              <Select
                label="Current learning level"
                error={errors.learningLevel?.message}
                {...register("learningLevel")}
              >
                <option value="support-needed">Support needed</option>
                <option value="mixed">Mixed levels</option>
                <option value="on-level">Mostly on level</option>
                <option value="advanced">Ready for challenge</option>
              </Select>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="bg-moss-100 text-moss-700 grid size-9 place-items-center rounded-xl font-black">
                2
              </span>
              <div>
                <h2 className="font-black">Resources actually available</h2>
                <p className="text-muted text-xs">
                  ChalkBox will favour these—not an imaginary smart classroom.
                </p>
              </div>
            </div>
            <Controller
              name="availableMaterials"
              control={control}
              render={() => (
                <div className="flex flex-wrap gap-2">
                  {materials.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        toggleArrayValue("availableMaterials", item, selectedMaterials)
                      }
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selectedMaterials.includes(item) ? "border-moss-700 bg-moss-700 text-white" : "text-ink-700 hover:bg-moss-50 border-black/10 bg-white"}`}
                    >
                      {selectedMaterials.includes(item) && <Check className="mr-1 inline size-3" />}
                      {item}
                    </button>
                  ))}
                </div>
              )}
            />
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="bg-moss-100 text-moss-700 grid size-9 place-items-center rounded-xl font-black">
                3
              </span>
              <div>
                <h2 className="font-black">Classroom constraints</h2>
                <p className="text-muted text-xs">
                  Select every condition the plan should respect.
                </p>
              </div>
            </div>
            <Controller
              name="constraints"
              control={control}
              render={() => (
                <div className="flex flex-wrap gap-2">
                  {constraints.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayValue("constraints", item, selectedConstraints)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selectedConstraints.includes(item) ? "border-amber-500 bg-amber-100 text-amber-900" : "text-ink-700 border-black/10 bg-white hover:bg-amber-50"}`}
                    >
                      {selectedConstraints.includes(item) && (
                        <Check className="mr-1 inline size-3" />
                      )}
                      {item}
                    </button>
                  ))}
                </div>
              )}
            />
          </Card>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="bg-moss-100 text-moss-700 grid size-10 place-items-center rounded-xl">
                <BookOpenCheck className="size-5" />
              </span>
              <div>
                <p className="text-ink-500 text-xs font-black tracking-wider uppercase">
                  Expected output
                </p>
                <p className="font-black">{estimated}</p>
              </div>
            </div>
            <ul className="text-ink-700 mt-5 space-y-3 text-xs leading-5">
              {[
                "2–4 measurable objectives",
                "Timed low-resource activities",
                "Differentiation and offline options",
                "Objective-linked checks",
                "Editable and PDF-ready"
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="text-moss-700 mt-0.5 size-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-900">AI generation unavailable</p>
              <p className="mt-1 text-xs leading-5 text-red-800">{error}</p>
            </div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={quotaLeft === 0}>
            <Cloud className="size-4" />
            Generate with Gemini
          </Button>
          <TurnstileWidget onToken={setCaptchaToken} />
          <Button
            type="button"
            variant="sun"
            size="lg"
            className="w-full"
            onClick={usePreparedDemo}
          >
            <CloudOff className="size-4" />
            Use prepared water-cycle example
          </Button>
          <p className="text-muted px-2 text-center text-[11px] leading-5">
            {appConfig.hasSupabase
              ? "Gemini requests use the protected Supabase function."
              : "Cloud AI needs deployment variables; the labelled prepared example always works."}
          </p>
        </aside>
      </form>
    </div>
  );
}
