const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const appConfig = {
  name: "ChalkBox",
  tagline: "Your classroom. Your plan. Powered by HarshLabs AI.",
  team: "Team HarshLabs",
  problemId: "Omni_EdTech_7",
  supabaseUrl,
  supabasePublishableKey,
  hasSupabase: Boolean(supabaseUrl && supabasePublishableKey),
  appUrl: (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin,
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,
  demoGenerationLimit: 5,
  teacherGenerationLimit: 25
} as const;
