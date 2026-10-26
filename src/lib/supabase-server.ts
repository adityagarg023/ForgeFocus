import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 *
 * This client bypasses RLS and must NEVER be imported in client-side
 * code. It is used exclusively by Next.js route handlers to perform
 * database operations on behalf of a Clerk-authenticated user.
 *
 * The service role key is read from the server environment
 * (SUPABASE_SERVICE_ROLE_KEY), which is NOT exposed to the browser
 * (no NEXT_PUBLIC_ prefix).
 *
 * Ownership enforcement happens in every query: route handlers derive
 * clerk_user_id from the verified Clerk session and filter all queries
 * by it. The client never supplies a user ID.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

/**
 * Returns the server-side Supabase client. Throws at call time (not
 * import time) if the service role key is missing, so the module can
 * be safely imported during build without crashing.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    );
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
