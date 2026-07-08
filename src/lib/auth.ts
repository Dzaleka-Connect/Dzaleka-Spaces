import "server-only";

import { cache } from "react";
import type { SessionUser } from "./session-user";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type { SessionUser } from "./session-user";
export { canModerate, getDashboardPath, hasRole, isStaff } from "./auth-roles";

export const getSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    if (!isSupabaseConfigured()) return null;

    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    if (claimsError || !claimsData?.claims?.sub) return null;

    const userId = claimsData.claims.sub;

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    return {
      id: userId,
      email: claimsData.claims.email ?? null,
      fullName: profile?.full_name || null,
      roles: (roles ?? []).map((r) => r.role as string),
    };
  }
);
