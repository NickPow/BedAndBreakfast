import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseDatabase } from "@/lib/supabase/types";

let supabaseServiceClient: ReturnType<typeof createClient<SupabaseDatabase>> | null = null;

export function getSupabaseServiceClient() {
  if (supabaseServiceClient) {
    return supabaseServiceClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before using admin booking features.",
    );
  }

  supabaseServiceClient = createClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServiceClient;
}
