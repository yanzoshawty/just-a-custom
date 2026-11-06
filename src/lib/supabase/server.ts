import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
}

let client: SupabaseClient | undefined;

// Service-role client: bypasses RLS. Throws BackendNotConfiguredError when env is missing.
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new BackendNotConfiguredError();
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
