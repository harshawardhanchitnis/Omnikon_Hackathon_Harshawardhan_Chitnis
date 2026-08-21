import { zodResolver } from "@hookform/resolvers/zod";
import type { PlanGenerationInput } from "@chalkbox/contracts";
import { boards, gradeLevels, planGenerationInputSchema, subjects } from "@chalkbox/contracts";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Mic,
  MicOff,
  PencilLine,
  School,
  WandSparkles
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, type Resolver, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { Badge } from "@/components/ui/Badge";
import { appConfig } from "@/lib/config";
import { safeMessage } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { createPreparedDemoPlan, generateLessonPlan } from "@/services/plan-generator";
import { parseQuickBrief } from "@/services/quick-brief";
import { useDomain } from "@/state/domain-context";
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
  const [searchParams] = useSearchParams();
  const queryGrade = gradeLevels.includes(searchParams.get("grade") as (typeof gradeLevels)[number])
    ? (searchParams.get("grade") as (typeof gradeLevels)[number])
    : undefined;
  const querySubject = subjects.includes(searchParams.get("subject") as (typeof subjects)[number])
    ? (searchParams.get("subject") as (typeof subjects)[number])
    : undefined;
  const queryBoard = boards.includes(searchParams.get("board") as (typeof boards)[number])
    ? (searchParams.get("board") as (typeof boards)[number])
    : undefined;
  const queryTopic = searchParams.get("topic")?.slice(0, 120) ?? "";
  const hasCurriculumPrefill = Boolean(queryTopic);
  const profile = useAppStore((state) => state.profile);
  const mode = useAppStore((state) => state.mode);
  const { addPlan, classroomProfiles } = useDomain();
  const generationCount = useAppStore((state) => state.generationCount);
  const incrementGeneration = useAppStore((state) => state.incrementGeneration);
  const settings = useAppStore((state) => state.settings);
  const [generating, setGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [brief, setBrief] = useState("");
  const [briefError, setBriefError] = useState("");
  const [extractingBrief, setExtractingBrief] = useState(false);
  const [briefReviewed, setBriefReviewed] = useState(hasCurriculumPrefill);
  const [showStructured, setShowStructured] = useState(hasCurriculumPrefill);
  const [classroomProfileId, setClassroomProfileId] = useState(
    settings.defaultClassroomProfileId ?? ""
  );
  const [extraction, setExtraction] = useState<Awaited<ReturnType<typeof parseQuickBrief>> | null>(
    null
  );
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors }
  } = useForm<PlanGenerationInput>({
    resolver: zodResolver(planGenerationInputSchema) as Resolver<PlanGenerationInput>,
    defaultValues: {
      grade: queryGrade ?? settings.defaultGrade,
      subject: querySubject ?? settings.defaultSubject,
      topic: queryTopic,
      durationMinutes: settings.defaultDurationMinutes,
      language: "Bilingual English–Hindi",
      board: queryBoard ?? "CBSE/NCERT",
      classSize: 35,
      availableMaterials: ["Blackboard", "Local objects"],
      constraints: ["No projector", "Mixed reading levels"],
      learningLevel: "mixed"
    }
  });
  const selectedMaterials = useWatch({ control, name: "availableMaterials" });
  const selectedConstraints = useWatch({ control, name: "constraints" });
  const selectedSubject = useWatch({ control, name: "subject" });
  const selectedBoard = useWatch({ control, name: "board" });
  const selectedLanguage = useWatch({ control, name: "language" });
  const appendTranscript = useCallback((transcript: string) => {
    setBrief((current) => `${current}${current.trim() ? " " : ""}${transcript}`);
  }, []);
  const voice = useSpeechRecognition(
    appendTranscript,
    selectedLanguage === "Hindi" ? "hi-IN" : "en-IN"
  );
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
  const applyClassroomProfile = (profileId: string) => {
    setClassroomProfileId(profileId);
    const classroom = classroomProfiles.find((item) => item.id === profileId);
    if (!classroom) return;
    setValue("grade", classroom.grade, { shouldValidate: true });
    setValue("additionalGrade", classroom.additionalGrade, { shouldValidate: true });
    setValue("board", classroom.board, { shouldValidate: true });
    setValue("customBoard", classroom.customBoard, { shouldValidate: true });
    setValue("language", classroom.language, { shouldValidate: true });
    setValue("classSize", classroom.learnerCount, { shouldValidate: true });
    setValue("durationMinutes", classroom.typicalDurationMinutes, { shouldValidate: true });
    setValue("availableMaterials", classroom.commonMaterials, { shouldValidate: true });
    setValue(
      "constraints",
      [
        ...(classroom.projectorAvailable ? [] : ["No projector"]),
        ...(classroom.internetAvailability === "none" ? ["No internet"] : []),
        ...(classroom.internetAvailability === "intermittent" ? ["Intermittent internet"] : []),
        ...(classroom.mixedAbility ? ["Mixed reading levels"] : [])
      ],
      { shouldValidate: true }
    );
  };
  const extractBrief = async () => {
    if (brief.trim().length < 12) {
      setBriefError("Describe the topic, class and time in at least one sentence.");
      return;
    }
    setBriefError("");
    setExtractingBrief(true);
    try {
      const classroom = classroomProfiles.find((item) => item.id === classroomProfileId);
      const result = await parseQuickBrief(brief.trim(), getValues(), classroom);
      setExtraction(result);
      setValue("grade", result.grade, { shouldValidate: true });
      setValue("additionalGrade", result.additionalGrade, { shouldValidate: true });
      setValue("subject", result.subject, { shouldValidate: true });
      setValue("customSubject", result.customSubject, { shouldValidate: true });
      setValue("topic", result.topic, { shouldValidate: true });
      setValue("durationMinutes", result.durationMinutes, { shouldValidate: true });
      setValue("language", result.language, { shouldValidate: true });
      setValue("board", result.board, { shouldValidate: true });
      setValue("customBoard", result.customBoard, { shouldValidate: true });
      setValue("classSize", result.classSize, { shouldValidate: true });
      setValue("availableMaterials", result.availableMaterials, { shouldValidate: true });
      setValue("constraints", result.constraints, { shouldValidate: true });
      setValue("learningLevel", result.learningLevel, { shouldValidate: true });
      setBriefReviewed(false);
      setShowStructured(true);
    } catch (caught) {
      setBriefError(safeMessage(caught));
    } finally {
      setExtractingBrief(false);
    }
  };
  const onSubmit = async (values: PlanGenerationInput) => {
    if (extraction && !briefReviewed) {
      setError("Review and confirm the extracted classroom details before generating.");
      return;
    }
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
      <Card className="mb-5 overflow-hidden border-black/8 shadow-[0_24px_70px_rgba(23,73,63,0.1)]">
        <div className="bg-moss-900 relative overflow-hidden p-5 text-white sm:p-7">
          <div className="bg-sun-500/20 absolute -top-20 -right-12 size-48 rounded-full blur-3xl" />
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <Badge className="border-white/10 bg-white/10 text-white">Quick Brief</Badge>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                Describe the lesson naturally.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Speak or type what you need. ChalkBox extracts the constraints, then waits for your
                review before generating anything.
              </p>
            </div>
            {classroomProfiles.length > 0 && (
              <label className="min-w-56 text-xs font-bold text-white/75">
                <span className="mb-1.5 flex items-center gap-1.5">
                  <School className="size-3.5" /> Classroom profile
                </span>
                <select
                  value={classroomProfileId}
                  onChange={(event) => applyClassroomProfile(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white"
                >
                  <option value="" className="text-ink-950">
                    No profile
                  </option>
                  {classroomProfiles
                    .filter((item) => !item.archived)
                    .map((classroom) => (
                      <option key={classroom.id} value={classroom.id} className="text-ink-950">
                        {classroom.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
          <div className="relative mt-6">
            <label htmlFor="quick-brief" className="sr-only">
              Quick lesson brief
            </label>
            <textarea
              id="quick-brief"
              value={brief}
              onChange={(event) => {
                setBrief(event.target.value);
                setBriefReviewed(false);
              }}
              rows={4}
              placeholder="Create a 40-minute Class 6 science lesson on separation of substances using only a chalkboard and household materials. Include mixed-ability support."
              className="text-ink-950 focus:border-sun-500 min-h-36 w-full resize-y rounded-2xl border border-white/15 bg-white px-5 py-4 pr-16 text-base leading-7 font-medium shadow-2xl outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              className={`absolute right-3 bottom-3 grid size-11 place-items-center rounded-xl transition ${voice.listening ? "bg-coral-500 text-white" : "bg-moss-100 text-moss-800 hover:bg-sun-100"}`}
              aria-label={voice.listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={voice.listening}
            >
              {voice.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          </div>
          {(briefError || voice.error) && (
            <p role="alert" className="mt-2 text-xs font-bold text-amber-200">
              {briefError || voice.error}
            </p>
          )}
          {voice.listening && (
            <p
              role="status"
              className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-200"
            >
              <span className="size-2 animate-pulse rounded-full bg-emerald-300" /> Listening —
              speak naturally, then stop to edit the transcript.
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="sun"
              size="lg"
              loading={extractingBrief}
              onClick={extractBrief}
            >
              <WandSparkles className="size-4" /> Extract classroom details
              <ChevronRight className="size-4" />
            </Button>
            <button
              type="button"
              onClick={() => {
                setExtraction(null);
                setBriefReviewed(true);
                setShowStructured(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white/80 hover:bg-white/10 hover:text-white"
            >
              <PencilLine className="size-4" /> Use structured mode
            </button>
            <span className="ml-auto text-[11px] font-bold text-white/60">
              {voice.supported
                ? "English & Hindi voice where supported"
                : "Typing is always available"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-white p-4 sm:px-7">
          <span className="text-ink-500 mr-1 text-[10px] font-black tracking-wider uppercase">
            Try an example
          </span>
          {[
            "Class 5 fractions with bottle caps, 35 minutes, no projector",
            "Bilingual Class 7 English lesson on point of view for mixed readers"
          ].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setBrief(example)}
              className="hover:border-moss-500 hover:bg-moss-50 text-ink-700 rounded-full border border-black/8 px-3 py-1.5 text-xs font-bold transition"
            >
              {example}
            </button>
          ))}
        </div>
      </Card>

      {extraction && (
        <Card className="border-moss-500/30 bg-moss-50/60 mb-5 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-moss-700 text-xs font-black tracking-wider uppercase">
                Extracted details · {extraction.confidence} confidence ·{" "}
                {extraction.extractionMethod === "gemini" ? "Gemini" : "on-device rules"}
              </p>
              <h2 className="mt-1 text-lg font-black">Review before generation</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  `Class ${extraction.grade}${extraction.additionalGrade ? ` + ${extraction.additionalGrade}` : ""}`,
                  extraction.customSubject ?? extraction.subject,
                  `${extraction.durationMinutes} min`,
                  extraction.language,
                  `${extraction.classSize} learners`,
                  extraction.board
                ].map((item) => (
                  <span
                    key={item}
                    className="border-moss-700/15 text-moss-900 rounded-full border bg-white px-3 py-1.5 text-xs font-black"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {extraction.assumptions.length > 0 && (
                <p className="text-muted mt-3 text-xs leading-5">
                  Assumptions: {extraction.assumptions.join(" ")}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant={briefReviewed ? "secondary" : "primary"}
              onClick={() => setBriefReviewed(true)}
            >
              <Check className="size-4" />
              {briefReviewed ? "Details confirmed" : "I reviewed these details"}
            </Button>
          </div>
        </Card>
      )}

      {showStructured && (
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
                  label="Second grade (optional)"
                  error={errors.additionalGrade?.message}
                  {...register("additionalGrade", {
                    setValueAs: (value) => (value ? value : undefined)
                  })}
                >
                  <option value="">Single-grade class</option>
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
                {selectedSubject === "Custom" && (
                  <Input
                    label="Custom subject"
                    error={errors.customSubject?.message}
                    required
                    {...register("customSubject")}
                  />
                )}
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
                  <option>CBSE/NCERT</option>
                  <option>State Board</option>
                  <option>Custom</option>
                </Select>
                {selectedBoard === "Custom" && (
                  <Input
                    label="Custom curriculum / board"
                    error={errors.customBoard?.message}
                    required
                    {...register("customBoard")}
                  />
                )}
                <Select
                  label="Teaching language"
                  error={errors.language?.message}
                  {...register("language")}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Bilingual English–Hindi</option>
                </Select>
                <Input
                  label="Duration (minutes)"
                  type="number"
                  min={20}
                  max={90}
                  error={errors.durationMinutes?.message}
                  {...register("durationMinutes", { valueAsNumber: true })}
                />
                <Input
                  label="Class size"
                  type="number"
                  min={1}
                  max={100}
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
                        {selectedMaterials.includes(item) && (
                          <Check className="mr-1 inline size-3" />
                        )}
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
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={quotaLeft === 0 || Boolean(extraction && !briefReviewed)}
            >
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
      )}
    </div>
  );
}
