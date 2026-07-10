"use client";

import { useActionState } from "react";
import { ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createProviderExpense } from "@/app/provider/operations/actions";

export function ProviderExpenseForm() {
  const [, action, pending] = useActionState(async (previous: unknown, data: FormData) => {
    const result = await createProviderExpense(previous, data);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, null);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="expense-amount">Amount (MWK)</FieldLabel>
          <Input
            id="expense-amount"
            name="amount_mwk"
            type="number"
            min="1"
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-date">Date</FieldLabel>
          <Input id="expense-date" name="occurred_on" type="date" required disabled={pending} />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-category">Category</FieldLabel>
          <Input id="expense-category" name="category" maxLength={80} required disabled={pending} />
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-description">Description</FieldLabel>
          <Textarea
            id="expense-description"
            name="description"
            maxLength={500}
            disabled={pending}
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ReceiptText data-icon="inline-start" />
            )}
            Record expense
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
