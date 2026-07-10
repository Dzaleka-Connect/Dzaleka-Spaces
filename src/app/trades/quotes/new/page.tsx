import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSessionUser } from "@/lib/auth";
import { createMaintenanceQuote } from "../../actions";

export const metadata: Metadata = {
  title: "Submit quote",
};

export default async function NewTradeQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ ticketId?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Submit quote</h1>
        <p className="mt-1 text-muted-foreground">
          Quote only for work you can safely complete. Exact work locations are released after
          assignment.
        </p>
      </div>

      {params.error ? (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Quote not submitted</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Quote details</CardTitle>
          <CardDescription>
            The requester or staff can accept, decline or request clarification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createMaintenanceQuote}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ticket-id">Job ID</FieldLabel>
                <Input
                  id="ticket-id"
                  name="ticketId"
                  required
                  defaultValue={params.ticketId ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="amount">Amount (MWK)</FieldLabel>
                <Input id="amount" name="amountMwk" type="number" min={0} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="timeline">Timeline</FieldLabel>
                <Input
                  id="timeline"
                  name="timeline"
                  placeholder="e.g. 2 days after materials are ready"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea id="notes" name="notes" />
              </Field>
              <Button type="submit">
                <Send data-icon="inline-start" />
                Submit quote
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
