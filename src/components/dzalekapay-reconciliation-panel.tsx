"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { reconcileDzalekaPayAction, type DzalekaPayActionState } from "@/app/_actions/dzalekapay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { DzalekaPayReconciliation } from "@/lib/dzalekapay/contract";
import { formatMwk } from "@/lib/types";

const initialState: DzalekaPayActionState = { ok: false, message: "" };

function badgeVariant(status: DzalekaPayReconciliation["reconciliationStatus"]) {
  if (status === "verified") return "default" as const;
  if (status === "failed" || status === "amount_mismatch") return "destructive" as const;
  return "secondary" as const;
}

export function DzalekaPayReconciliationPanel({
  paymentId,
  reconciliation,
  enabled,
}: {
  paymentId: string;
  reconciliation: DzalekaPayReconciliation | null;
  enabled: boolean;
}) {
  const action = reconcileDzalekaPayAction.bind(null, paymentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>DzalekaPay verification</CardTitle>
        <CardDescription>
          This checks the external transaction. It does not replace confirmation by both parties.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {reconciliation ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">DzalekaPay status</dt>
              <dd className="mt-1 capitalize">{reconciliation.providerStatus}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reconciliation</dt>
              <dd className="mt-1">
                <Badge variant={badgeVariant(reconciliation.reconciliationStatus)}>
                  {reconciliation.reconciliationStatus.replaceAll("_", " ")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Provider amount</dt>
              <dd className="mt-1 font-semibold">{formatMwk(reconciliation.amountMwk)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last checked</dt>
              <dd className="mt-1">
                {new Date(reconciliation.lastVerifiedAt).toLocaleString("en-MW")}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            This transaction has not been checked against DzalekaPay.
          </p>
        )}
        {state.message ? (
          <Alert variant={state.ok ? "default" : "destructive"} aria-live="polite">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter>
        <form action={formAction}>
          <Button type="submit" variant="outline" disabled={!enabled || pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            {reconciliation ? "Check again" : "Check status"}
          </Button>
        </form>
        {!enabled ? (
          <p className="ml-3 text-xs text-muted-foreground">Merchant connection is not enabled.</p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
