import { createBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase client (anon key). Used by the login/signup pages
 * for signInWithPassword / signInWithOtp / signOut, and by any client
 * component that needs to read the current session.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
