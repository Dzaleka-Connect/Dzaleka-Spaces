import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VerifierOfflinePanel } from "@/components/verifier-offline-panel";
import { getSessionUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verifier offline queue",
};

export default async function VerifierOfflinePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!isStaff(user)) redirect("/account");

  const { data } = await (
    await createClient()
  )
    .from("verification_assignments")
    .select("id, due_at, listings(title)")
    .eq("verifier_id", user.id)
    .in("status", ["assigned", "downloaded", "in_progress"])
    .order("due_at", { ascending: true });
  const assignments = (data ?? []).map((assignment) => {
    const listingValue = assignment.listings as unknown as
      { title?: string } | { title?: string }[] | null;
    const listing = Array.isArray(listingValue) ? listingValue[0] : listingValue;
    return {
      value: assignment.id,
      label: `${listing?.title ?? "Assignment"} · due ${new Date(assignment.due_at).toLocaleDateString("en-MW")}`,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Verifier offline queue</h1>
        <p className="mt-1 text-muted-foreground">
          Cache verifier pages, save offline events locally, and sync them when connectivity
          returns.
        </p>
      </div>

      <Alert>
        <Info />
        <AlertTitle>Local device data</AlertTitle>
        <AlertDescription>
          Keep offline notes minimal. Do not store identity document numbers or unnecessary private
          household details on shared devices.
        </AlertDescription>
      </Alert>

      <VerifierOfflinePanel assignments={assignments} />
    </div>
  );
}
