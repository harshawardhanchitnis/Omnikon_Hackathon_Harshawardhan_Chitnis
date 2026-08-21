import { createClient } from "@supabase/supabase-js";
import { appConfig } from "./config";

export const supabase = appConfig.hasSupabase
  ? createClient(appConfig.supabaseUrl!, appConfig.supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Cloud AI is not configured in this deployment.");
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The AI service returned an empty response.");
  return data;
}
