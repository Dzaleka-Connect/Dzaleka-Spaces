import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { listOccupanciesForProvider } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CreateChargeForm } from "./form-client";

export const metadata: Metadata = {
  title: "Schedule New Charge",
};

export default async function NewChargePage() {
  if (!isSupabaseConfigured()) {
    redirect("/provider");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const occupancies = await listOccupanciesForProvider(user.id);
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
          render={<Link href="/provider/charges" />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to charges
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule new charge</CardTitle>
          <CardDescription>
            Create a rent, utility, or deposit record for one of your active occupancy records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeOccupancies.length === 0 ? (
            <div className="rounded-lg border border-amber-300/30 bg-amber-500/5 p-4 text-center">
              <Info className="mx-auto size-8 text-amber-600 dark:text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-foreground">No active occupancy records</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create an active occupancy record before scheduling a charge.
              </p>
              <div className="mt-4">
                <Button render={<Link href="/provider/occupancies/new" />} nativeButton={false}>
                  Create occupancy record
                </Button>
              </div>
            </div>
          ) : (
            <CreateChargeForm
              occupancies={activeOccupancies}
              idempotencyKey={crypto.randomUUID()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
