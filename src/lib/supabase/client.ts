import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

/**
 * Cliente Supabase com permissões de administrador (Service Role),
 * seguro para ser utilizado exclusivamente no servidor (API routes e Server Components).
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "sgtcc";
