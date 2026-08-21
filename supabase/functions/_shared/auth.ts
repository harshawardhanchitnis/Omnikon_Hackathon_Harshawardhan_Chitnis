import { createClient, type User } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export const serviceClient = () =>
  createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });

export async function requireUser(request: Request): Promise<User> {
  const authorization = request.headers.get("Authorization");
  if (!authorization)
    throw new HttpError(401, "Sign in or start a demo session first.", "AUTH_REQUIRED");
  const client = createClient(required("SUPABASE_URL"), required("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new HttpError(401, "Your session is invalid or expired.", "INVALID_SESSION");
  return data.user;
}

export async function requireAdmin(request: Request): Promise<User> {
  const user = await requireUser(request);
  const { data, error } = await serviceClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || data?.role !== "admin")
    throw new HttpError(403, "Administrator access is required.", "ADMIN_REQUIRED");
  return user;
}
