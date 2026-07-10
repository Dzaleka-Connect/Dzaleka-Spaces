"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const GRANTABLE_ROLES = [
  "seeker",
  "provider",
  "field_verifier",
  "service_provider",
  "organisation_manager",
  "moderator",
  "admin",
  "finance",
];

export interface RoleActionResult {
  ok: boolean;
  message: string;
}

async function requireAdmin() {
  if (!isSupabaseConfigured()) redirect("/admin");
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!hasRole(user, "admin")) redirect("/admin");
  return user;
}

export async function grantRole(userId: string, role: string): Promise<RoleActionResult> {
  const admin = await requireAdmin();
  if (!GRANTABLE_ROLES.includes(role)) {
    return { ok: false, message: "Unknown role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });

  if (error && !error.message.includes("duplicate")) {
    console.error("grantRole failed:", error.message);
    return { ok: false, message: "Could not grant the role." };
  }

  await supabase.from("audit_events").insert({
    actor_id: admin.id,
    actor_role: "admin",
    action: "role.granted",
    entity: "user",
    entity_id: userId,
    after_state: { role },
  });

  revalidatePath("/admin/users");
  return { ok: true, message: `Granted ${role.replace(/_/g, " ")}.` };
}

export async function revokeRole(userId: string, role: string): Promise<RoleActionResult> {
  const admin = await requireAdmin();

  if (role === "admin" && userId === admin.id) {
    return { ok: false, message: "You cannot revoke your own admin role." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);

  if (error) {
    console.error("revokeRole failed:", error.message);
    return { ok: false, message: "Could not revoke the role." };
  }

  await supabase.from("audit_events").insert({
    actor_id: admin.id,
    actor_role: "admin",
    action: "role.revoked",
    entity: "user",
    entity_id: userId,
    before_state: { role },
  });

  revalidatePath("/admin/users");
  return { ok: true, message: `Revoked ${role.replace(/_/g, " ")}.` };
}
