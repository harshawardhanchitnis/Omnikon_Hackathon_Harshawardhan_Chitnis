import { zodResolver } from "@hookform/resolvers/zod";
import { reflectionSchema } from "@chalkbox/contracts";
import type { Reflection } from "@chalkbox/contracts";
import { ArrowRight, Heart, ShieldCheck, Star } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { uid } from "@/lib/utils";
import { useDomain } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

const formSchema = reflectionSchema.extend({
  understanding: z.number().int().min(1).max(5),
  engagement: z.number().int().min(1).max(5),
  pace: z.enum(["too-slow", "right", "too-fast"]),
  evidence: z.string().trim().max(1000)
});
type Values = z.infer<typeof formSchema>;

export function ReflectionPage() {
  const { planId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { plans, addReflection, addCheckIn } = useDomain();
  const plan = plans.find((item) => item.id === planId);
  const profile = useAppStore((state) => state.profile);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Values>({
    defaultValues: {
      wentWell: "",
      improveNextTime: "",
      studentOutcome: "mostly",
      rating: 4,
      nextStep: "",
      understanding: 4,
      engagement: 4,
      pace: "right",
      evidence: ""
    },
    resolver: zodResolver(formSchema)
  });
  if (!plan)
    return (
      <main className="grid min-h-screen place-items-center">
        <Link to="/library">
          <Button>Return to library</Button>
        </Link>
      </main>
    );
  const onSubmit = async (values: Values) => {
    const now = new Date().toISOString();
    const ownerId = profile?.id ?? "teacher";
    const sessionId = params.get("session");
    await addCheckIn({
      id: uid("checkin"),
      planId: plan.id,
      ...(sessionId ? { sessionId } : {}),
      ownerId,
      understanding: values.understanding as 1 | 2 | 3 | 4 | 5,
      engagement: values.engagement as 1 | 2 | 3 | 4 | 5,
      pace: values.pace,
      evidence: values.evidence,
      createdAt: now
    });
    const reflection: Reflection = {
      id: uid("reflection"),
      planId: plan.id,
      ownerId,
      wentWell: values.wentWell,
      improveNextTime: values.improveNextTime,
      studentOutcome: values.studentOutcome,
      rating: values.rating as 1 | 2 | 3 | 4 | 5,
      nextStep: values.nextStep,
      createdAt: now,
      version: 1,
      updatedAt: now
    };
    await addReflection(reflection);
    toast.success("Reflection saved", {
      description: "Your insights are now part of the next planning cycle."
    });
    navigate("/analytics");
  };
  return (
    <main id="main-content" className="paper-grid min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="bg-moss-100 text-moss-700 mx-auto grid size-14 place-items-center rounded-2xl">
            <Heart className="size-6" />
          </span>
          <p className="text-moss-700 mt-5 text-xs font-black tracking-[0.16em] uppercase">
            Lesson complete
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Capture the learning while it’s fresh.
          </h1>
          <p className="text-muted mt-3 text-sm leading-6">
            {plan.title} · This reflection is about classroom patterns, not individual learners.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Card className="p-5 sm:p-7">
            <h2 className="text-lg font-black">Quick classroom signal</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Controller
                name="understanding"
                control={control}
                render={({ field }) => (
                  <Rating label="Understanding" value={field.value} onChange={field.onChange} />
                )}
              />
              <Controller
                name="engagement"
                control={control}
                render={({ field }) => (
                  <Rating label="Engagement" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold">Pace</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "too-slow", label: "Too slow" },
                  { value: "right", label: "About right" },
                  { value: "too-fast", label: "Too fast" }
                ].map((item) => (
                  <label key={item.value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={item.value}
                      className="peer sr-only"
                      {...register("pace")}
                    />
                    <span className="peer-checked:border-moss-700 peer-checked:bg-moss-100 peer-checked:text-moss-900 block rounded-xl border border-black/10 bg-white px-2 py-2.5 text-center text-xs font-bold">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <Textarea
                label="What evidence did you notice?"
                placeholder="e.g. Most pairs sequenced all four stages without prompting…"
                hint="Describe group-level evidence; never include student names."
                {...register("evidence")}
              />
            </div>
          </Card>
          <Card className="space-y-5 p-5 sm:p-7">
            <Textarea
              label="What worked well?"
              error={errors.wentWell?.message}
              required
              {...register("wentWell")}
            />
            <Textarea
              label="What will you change next time?"
              error={errors.improveNextTime?.message}
              required
              {...register("improveNextTime")}
            />
            <div>
              <p className="mb-2 text-sm font-bold">Overall objective outcome</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { value: "not-yet", label: "Not yet" },
                  { value: "partly", label: "Partly" },
                  { value: "mostly", label: "Mostly" },
                  { value: "fully", label: "Fully" }
                ].map((item) => (
                  <label key={item.value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={item.value}
                      className="peer sr-only"
                      {...register("studentOutcome")}
                    />
                    <span className="peer-checked:border-moss-700 peer-checked:bg-moss-100 block rounded-xl border border-black/10 px-2 py-2.5 text-center text-xs font-bold">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <Rating
                  label="How reusable is this plan?"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Textarea
              label="Your next teaching action"
              error={errors.nextStep?.message}
              required
              {...register("nextStep")}
            />
          </Card>
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-blue-50 p-4 sm:flex-row">
            <p className="flex gap-2 text-xs leading-5 text-blue-900">
              <ShieldCheck className="size-4 shrink-0" />
              Private reflection. No student profile is created.
            </p>
            <Button type="submit" size="lg" loading={isSubmitting}>
              Save & view insights <ArrowRight className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Rating({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            type="button"
            key={rating}
            onClick={() => onChange(rating)}
            aria-label={`${label}: ${rating} of 5`}
            className="grid size-9 place-items-center rounded-lg hover:bg-amber-50"
          >
            <Star
              className={`size-5 ${rating <= value ? "fill-sun-500 text-sun-500" : "text-slate-300"}`}
            />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
