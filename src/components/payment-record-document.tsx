import { CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentRecord } from "@/lib/payments";
import { formatMwk } from "@/lib/types";

export function PaymentRecordDocument({ payment }: { payment: PaymentRecord }) {
  const receiptIssued = payment.status === "confirmed" && Boolean(payment.receiptNumber);

  return (
    <Card className="border-2 print:border-none print:shadow-none">
      <CardHeader className="border-b text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {receiptIssued ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
        </div>
        <CardTitle className="text-2xl">
          {receiptIssued ? "Payment receipt" : "Payment record"}
        </CardTitle>
        <CardDescription>
          {receiptIssued
            ? "Issued after the space provider and occupant both confirmed the external payment."
            : "Awaiting confirmation from both parties. This is not a receipt."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">
            {receiptIssued ? "Receipt number" : "Payment record ID"}
          </span>
          <span className="break-all font-mono text-sm font-semibold">
            {payment.receiptNumber ?? payment.id}
          </span>
        </div>

        {receiptIssued ? (
          <div className="grid gap-4 border p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Verification code</p>
              <p className="mt-1 font-mono font-semibold">{payment.receiptVerificationCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Issued</p>
              <p className="mt-1 font-semibold">
                {payment.receiptIssuedAt
                  ? new Date(payment.receiptIssuedAt).toLocaleString("en-MW")
                  : "Recorded"}
              </p>
            </div>
          </div>
        ) : null}

        <dl className="grid gap-4 border p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Payment date</dt>
            <dd className="mt-1 font-semibold">
              {new Date(payment.paymentDate).toLocaleDateString("en-MW")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Payment method</dt>
            <dd className="mt-1 font-semibold capitalize">{payment.method.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">External reference</dt>
            <dd className="mt-1 break-all font-mono font-semibold">
              {payment.externalReference || "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Confirmation status</dt>
            <dd className="mt-1">
              <Badge
                variant={
                  payment.status === "confirmed"
                    ? "default"
                    : payment.status === "pending_confirmation"
                      ? "secondary"
                      : "destructive"
                }
              >
                {payment.status.replaceAll("_", " ")}
              </Badge>
            </dd>
          </div>
        </dl>

        <div className="border p-4 text-sm">
          <p className="text-muted-foreground">Associated space</p>
          <p className="mt-1 font-semibold">{payment.spaceTitle}</p>
          <p className="text-xs text-muted-foreground">{payment.spaceZone}</p>
        </div>

        <div className="border bg-primary/5 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Amount recorded</p>
          <p className="mt-1 text-3xl font-extrabold text-primary">
            {formatMwk(payment.amountMwk)}
          </p>
        </div>

        {payment.notes ? (
          <div className="border p-4 text-sm">
            <p className="text-muted-foreground">Notes</p>
            <p className="mt-1">{payment.notes}</p>
          </div>
        ) : null}

        <p className="border border-amber-300/30 bg-amber-500/5 p-3 text-center text-xs text-amber-800 dark:text-amber-300">
          Dzaleka Spaces records payments made directly between parties. It does not process or hold
          money, rent, or deposits.
        </p>
      </CardContent>
    </Card>
  );
}
