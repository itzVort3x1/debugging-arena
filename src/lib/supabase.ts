import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client keyed with the SERVICE-ROLE secret. It bypasses
 * row-level security and grants full access to Storage, so it must never reach
 * the browser — only server code (the challenge store, the seed script) imports
 * this. Used to read the private `challenges` bucket.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin() must never be called in the browser");
  }
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the " +
        'Supabase challenge store (ARENA_CHALLENGE_SOURCE="supabase").',
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** The Storage bucket challenges live in. */
export function challengeBucket(): string {
  return process.env.ARENA_CHALLENGE_BUCKET ?? "challenges";
}
