import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Logo } from "@/components/brand/Logo";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { appConfig } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { safeMessage } from "@/lib/utils";

const schema = z.object({ email: z.email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

export function AuthPage() {
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const onSubmit = async ({ email }: Values) => {
    setSubmitError("");
    try {
      if (!supabase)
        throw new Error(
          "Account sign-in is not configured in this preview. The complete prepared demo is still available."
        );
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appConfig.appUrl}/auth/callback`,
          ...(captchaToken ? { captchaToken } : {})
        }
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setSubmitError(safeMessage(error));
    }
  };
  return (
    <main id="main-content" className="grid min-h-screen lg:grid-cols-[1fr_.9fr]">
      <section className="bg-moss-900 relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="bg-moss-500/30 absolute -top-44 -right-32 size-[30rem] rounded-full blur-3xl" />
        <Logo inverse />
        <div className="relative my-auto max-w-xl">
          <p className="text-xs font-black tracking-[0.18em] text-emerald-200 uppercase">
            A calmer way to prepare
          </p>
          <h1 className="mt-4 text-5xl leading-[1.03] font-black tracking-[-0.05em]">
            Your lesson starts with the classroom you actually have.
          </h1>
          <ul className="mt-8 space-y-4 text-sm text-white/75">
            {[
              "Plan around real time, material and language constraints",
              "Keep saved plans available when connectivity drops",
              "Tie every assessment to a learning objective"
            ].map((text) => (
              <li key={text} className="flex gap-3">
                <ShieldCheck className="text-sun-500 size-5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">
          Team HarshLabs · Omnikon National Hackathon 2026
        </p>
      </section>
      <section className="paper-grid flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="text-ink-500 hover:text-moss-700 mb-8 inline-flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft className="size-4" />
            Back to ChalkBox
          </Link>
          <div className="surface shadow-lift rounded-3xl border p-6 sm:p-8">
            <div className="lg:hidden">
              <Logo />
            </div>
            {!sent ? (
              <>
                <div className="mt-7 lg:mt-0">
                  <p className="text-moss-700 text-xs font-black tracking-wider uppercase">
                    Free teacher workspace
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    Sign in without a password
                  </h2>
                  <p className="text-muted mt-3 text-sm leading-6">
                    We’ll email you a secure sign-in link. No payment details are requested.
                  </p>
                </div>
                <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <Input
                    label="School or personal email"
                    type="email"
                    autoComplete="email"
                    placeholder="teacher@example.edu"
                    error={errors.email?.message}
                    required
                    {...register("email")}
                  />
                  {submitError && (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800"
                    >
                      {submitError}
                    </p>
                  )}
                  <TurnstileWidget onToken={setCaptchaToken} />
                  <Button className="w-full" size="lg" loading={isSubmitting}>
                    <Mail className="size-4" />
                    Email me a sign-in link
                  </Button>
                </form>
              </>
            ) : (
              <div className="py-6 text-center">
                <span className="bg-moss-100 text-moss-700 mx-auto grid size-14 place-items-center rounded-2xl">
                  <Mail className="size-6" />
                </span>
                <h2 className="mt-5 text-2xl font-black">Check your inbox</h2>
                <p className="text-muted mt-3 text-sm leading-6">
                  Open the secure ChalkBox link on this device to continue.
                </p>
                <Button variant="ghost" className="mt-5" onClick={() => setSent(false)}>
                  Use another email
                </Button>
              </div>
            )}
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/8" />
              <span className="text-ink-500 text-[10px] font-black tracking-widest uppercase">
                or judge the full workflow
              </span>
              <span className="h-px flex-1 bg-black/8" />
            </div>
            <Link to="/demo">
              <Button variant="sun" className="w-full" size="lg">
                Open prepared demo <ArrowRight className="size-4" />
              </Button>
            </Link>
            <p className="text-muted mt-3 text-center text-[11px] leading-5">
              The demo is clearly labelled and uses only fictional, seeded records.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
