"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ProfileResult {
  ok: boolean;
  message: string;
}

export async function updateProfile(
  formData: FormData
): Promise<ProfileResult> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const language = String(formData.get("preferred_language") ?? "en");

  if (!fullName) {
    return { ok: false, message: "Please enter your name." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      whatsapp: whatsapp || null,
      preferred_language: language,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile failed:", error.message);
    return { ok: false, message: "Could not save your profile." };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true, message: "Profile saved." };
}
