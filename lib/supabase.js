import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bnnontzdecwpuhjwnzjl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubm9udHpkZWN3cHVoanduempsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDY2NzUsImV4cCI6MjA5NzE4MjY3NX0.wTZE0_DaMgVlcKGS7QHnNQ0aU9wGKEEv9zefBott0bI";

let supabase;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return supabase;
}
