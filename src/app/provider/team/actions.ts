"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function permissionsFromForm(formData: FormData): string[] {
  return formData
    .getAll("permissions")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function inviteProviderTeamMember(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    redirect("/provider/team?error=Team%20invites%20require%20server%20configuration");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const permissions = permissionsFromForm(formData);
  if (!email || permissions.length === 0) {
    redirect("/provider/team?error=Email%20and%20permissions%20are%20required");
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    redirect("/provider/team?error=User%20must%20sign%20in%20before%20team%20invite");
  }

  const { error } = await supabase.from("provider_team_members").upsert(
    {
      provider_id: user.id,
      member_id: profile.id,
      permissions,
      status: "active",
      accepted_at: new Date().toISOString(),
    },
    { onConflict: "provider_id,member_id" }
  );

  if (error) {
    redirect(`/provider/team?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: "provider",
    action: "provider_team.invited",
    entity: "provider_team_member",
    entity_id: profile.id,
    meta: { permissions },
  });

  revalidatePath("/provider/team");
  redirect("/provider/team?saved=1");
}
