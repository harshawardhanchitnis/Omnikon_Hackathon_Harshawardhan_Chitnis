import { ArrowRight, BookOpenCheck, ShieldCheck } from "lucide-react";
import type { LessonPlan } from "@chalkbox/contracts";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { LessonTimeline } from "@/components/plans/LessonTimeline";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { demoPlans } from "@/data/demo-fixtures";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/app-store";

export function SharedPlanPage() {
  const { slug } = useParams();
  const storedPlans = useAppStore((state) => state.plans);
  const localPlan = [...storedPlans, ...demoPlans].find(
    (item) =>
      item.publicSlug === slug || (slug === "water-cycle-demo" && item.id === "plan_water_cycle")
  );
  const [remotePlan, setRemotePlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(Boolean(!localPlan && supabase));
  useEffect(() => {
    if (localPlan || !slug || !supabase) return;
    const client = supabase;
    let active = true;
    const load = async () => {
      const { data } = await client
        .from("lesson_plans")
        .select("plan_data")
        .eq("public_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (active) {
        setRemotePlan((data?.plan_data as LessonPlan | undefined) ?? null);
        setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [localPlan, slug]);
  const plan = localPlan ?? remotePlan;
  if (loading)
    return (
      <main className="paper-grid min-h-screen">
        <LoadingState label="Opening shared lesson…" />
      </main>
    );
  if (!plan)
    return (
      <main className="paper-grid grid min-h-screen place-items-center px-4 text-center">
        <div>
          <Logo className="justify-center" />
          <h1 className="mt-8 text-2xl font-black">This shared plan is unavailable.</h1>
          <p className="text-muted mt-2 text-sm">The owner may have stopped sharing it.</p>
          <Link to="/" className="mt-5 inline-block">
            <Button>Visit ChalkBox</Button>
          </Link>
        </div>
      </main>
    );
  return (
    <div className="bg-paper min-h-screen">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-17 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link to="/demo">
            <Button variant="sun" size="sm">
              Try ChalkBox <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="bg-moss-900 rounded-3xl p-7 text-white sm:p-10">
          <p className="text-xs font-black tracking-wider text-emerald-200 uppercase">
            Shared classroom plan · Grade {plan.grade} {plan.subject}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">{plan.title}</h1>
          <p className="mt-3 text-sm text-white/65">
            {plan.durationMinutes} minutes · {plan.language} · {plan.board}
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <ShieldCheck className="mr-2 inline size-4" />
          Read-only plan. Review curriculum alignment, factual accuracy and safety for your own
          classroom before use.
        </div>
        <section className="mt-8">
          <h2 className="text-2xl font-black">Learning objectives</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {plan.objectives.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <BookOpenCheck className="text-moss-700 mt-0.5 size-5 shrink-0" />
                <p className="text-sm leading-6 font-bold">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-black">Lesson sequence</h2>
          <LessonTimeline activities={plan.activities} compact />
        </section>
      </main>
    </div>
  );
}
