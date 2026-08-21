import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UserProfile } from "@chalkbox/contracts";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/app-store";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setProfile = useAppStore((state) => state.setAuthenticatedProfile);
  const [error, setError] = useState("");
  useEffect(() => {
    const complete = async () => {
      if (!supabase) {
        setError("Supabase is not configured.");
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.user) {
        setError(sessionError?.message ?? "The sign-in link is invalid or expired.");
        return;
      }
      const user = data.session.user;
      const profile: UserProfile = {
        id: user.id,
        role: "teacher",
        fullName: (user.user_metadata.full_name as string | undefined) ?? "ChalkBox Teacher",
        email: user.email ?? "",
        schoolName: "",
        district: "",
        state: "",
        preferredLanguage: "English",
        grades: ["6"],
        subjects: ["Science"],
        onboardingComplete: false,
        createdAt: user.created_at,
        lastActiveAt: new Date().toISOString()
      };
      setProfile(profile);
      navigate("/onboarding", { replace: true });
    };
    void complete();
  }, [navigate, setProfile]);
  return (
    <main id="main-content" className="paper-grid grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <Logo className="justify-center" />
        {error ? (
          <>
            <h1 className="mt-8 text-xl font-black">We couldn’t complete sign-in</h1>
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          </>
        ) : (
          <p className="text-muted mt-8 flex items-center gap-2 font-bold">
            <LoaderCircle className="size-5 animate-spin" />
            Securing your workspace…
          </p>
        )}
      </div>
    </main>
  );
}
