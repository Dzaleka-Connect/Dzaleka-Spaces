import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth";
import { getPaymentForUser } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatMwk } from "@/lib/types";
import { ReceiptHeader } from "./receipt-header";

export const metadata: Metadata = {
  title: "Payment Receipt",
};

interface PaymentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderPaymentDetailPage({ params }: PaymentDetailPageProps) {
  if (!isSupabaseConfigured()) {
    redirect("/provider");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const payment = await getPaymentForUser(id, user.id);
  if (!payment) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      {/* Back button (hidden on print) */}
      <ReceiptHeader />

      {/* Official Receipt Card */}
      <Card className="border-2 print:border-none print:shadow-none">
        <CardHeader className="text-center border-b pb-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Payment Receipt</CardTitle>
          <CardDescription className="text-xs uppercase tracking-wider font-semibold text-primary mt-1">
            Dzaleka Spaces Verification System
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex justify-between items-center bg-muted/30 border p-3 rounded-lg">
            <span className="text-sm text-muted-foreground">Receipt ID</span>
            <span className="font-mono text-sm font-semibold">{payment.id}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 border rounded-xl p-4 text-sm">
            <div>
              <p className="text-muted-foreground">Payment Date</p>
              <p className="font-semibold mt-0.5">{new Date(payment.paymentDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Method</p>
              <p className="font-semibold mt-0.5 capitalize">{payment.method.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">External Reference</p>
              <p className="font-mono font-semibold mt-0.5">{payment.externalReference ?? "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Confirmation Status</p>
              <div className="mt-0.5">
                <Badge
                  variant={
                    payment.status === "confirmed"
                      ? "default"
                      : payment.status === "pending_confirmation"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {payment.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-4 text-sm">
            <p className="text-muted-foreground">Associated Space</p>
            <p className="font-semibold mt-0.5">{payment.spaceTitle}</p>
            <p className="text-xs text-muted-foreground">{payment.spaceZone}</p>
          </div>

          <div className="border rounded-xl p-4 bg-primary/5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Paid</p>
            <p className="text-3xl font-extrabold text-primary mt-1">{formatMwk(payment.amountMwk)}</p>
          </div>

          {payment.notes && (
            <div className="border rounded-xl p-4 text-sm">
              <p className="text-muted-foreground">Notes / Remarks</p>
              <p className="mt-1 italic">&quot;{payment.notes}&quot;</p>
            </div>
          )}

          {/* Legal Non-Ownership / Pilot Statement */}
          <div className="border border-amber-300/30 bg-amber-500/5 rounded-lg p-3 text-center text-xs text-amber-700 dark:text-amber-400">
            Dzaleka Spaces is not a fund custodian and does not hold deposits or rent. This receipt documents a transaction directly confirmed between provider and seeker.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
