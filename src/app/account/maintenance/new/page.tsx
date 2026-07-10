import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { listOccupanciesForOccupant } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CreateTicketForm } from "./form-client";

export const metadata: Metadata = {
  title: "Request Repair",
};

export default async function NewTicketPage() {
  if (!isSupabaseConfigured()) {
    redirect("/account");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const occupancies = await listOccupanciesForOccupant(user.id);
  const activeOccupancies = occupancies.filter(
    (o) =>
      o.status === "active" ||
      o.status === "notice_given" ||
      o.status === "awaiting_occupant_confirmation"
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/account/maintenance" />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to repairs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Maintenance Repair</CardTitle>
          <CardDescription>
            Report structural issues, plumbing leaks, electrical problems, or locks failure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeOccupancies.length === 0 ? (
            <div className="rounded-lg border border-amber-300/30 bg-amber-500/5 p-4 text-center">
              <Info className="mx-auto size-8 text-amber-600 dark:text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-foreground">No active occupancy records</p>
              <p className="text-xs text-muted-foreground mt-1">
                You must have an active occupancy to submit repair requests.
              </p>
            </div>
          ) : (
            <CreateTicketForm occupancies={activeOccupancies} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
