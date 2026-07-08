import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
}

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

export function isStaff(user: SessionUser | null): boolean {
  return Boolean(
    user?.roles.some((r) =>
      ["moderator", "admin", "field_verifier"].includes(r)
    )
  );
}

export function hasRole(user: SessionUser | null, role: string): boolean {
  return Boolean(user?.roles.includes(role));
}

export function canModerate(user: SessionUser | null): boolean {
  return Boolean(
    user?.roles.some((role) => role === "admin" || role === "moderator")
  );
}
