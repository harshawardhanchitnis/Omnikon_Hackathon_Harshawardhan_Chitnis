import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { seedDemoDomainData } from "@/state/domain-context";
import { useAppStore } from "@/store/app-store";

export function DemoBootstrapPage() {
  const enterDemo = useAppStore((state) => state.enterDemo);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const start = async () => {
      await enterDemo();
      await seedDemoDomainData();
      if (!active) return;
      setReady(true);
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 650);
    };
    void start();
    return () => {
      active = false;
    };
  }, [enterDemo, navigate]);
  return (
    <main id="main-content" className="paper-grid grid min-h-screen place-items-center px-4">
      <div className="surface shadow-lift w-full max-w-md rounded-3xl border p-8 text-center">
        <Logo className="justify-center" linkTo="" />
        <div className="bg-moss-100 text-moss-700 mx-auto mt-8 grid size-16 place-items-center rounded-2xl">
          {ready ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <LoaderCircle className="size-8 animate-spin" />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight">
          {ready ? "Your classroom is ready" : "Preparing the demo classroom"}
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          Loading Meera Patil’s lesson library, classroom profiles, assessment bank, teaching
          history and aggregate outcome insights.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
          <ShieldCheck className="size-3.5" />
          No account or personal data required
        </p>
      </div>
    </main>
  );
}
