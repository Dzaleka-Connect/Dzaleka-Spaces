"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canModerate, getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const REPORT_STATUSES = ["open", "closed", "withdrawn"] as const;

export async function updateReportStatus(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/admin/reports");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!reportId || !REPORT_STATUSES.includes(status as (typeof REPORT_STATUSES)[number])) {
    redirect("/admin/reports");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);

  if (error) {
    console.error("updateReportStatus failed:", error.message);
    redirect(`/admin/reports?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("audit_events").insert({
    actor_id: user.id,
    actor_role: user.roles[0] ?? "moderator",
    action: "report.status_updated",
    entity: "reports",
    entity_id: reportId,
    after_state: { status },
  });

  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}
