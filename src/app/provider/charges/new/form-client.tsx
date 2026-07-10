"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { OccupancyRecord } from "@/lib/occupancies";
import { categoryLabel } from "@/lib/types";
import { createChargeAction } from "../actions";

export function CreateChargeForm({
  occupancies,
  idempotencyKey,
}: {
  occupancies: OccupancyRecord[];
  idempotencyKey: string;
}) {
  const router = useRouter();
  const [, formAction, isPending] = useActionState(
    async (previous: unknown, formData: FormData) => {
      const result = await createChargeAction(previous, formData);
      if (result.ok) {
        toast.success(result.message);
        router.push("/provider/charges");
      } else {
        toast.error(result.message);
      }
      return result;
    },
    null
  );
  const occupancyItems = occupancies.map((occupancy) => {
    const occupant = occupancy.parties.find((party) => party.role === "occupant");
    return {
      value: occupancy.id,
      label: `${occupant?.fullName ?? "Occupant"} - ${categoryLabel(occupancy.spaceCategory)} (${occupancy.spaceZone})`,
    };
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="charge-occupancy">Occupancy record</FieldLabel>
          <Select name="occupancyId" items={occupancyItems} required disabled={isPending}>
            <SelectTrigger id="charge-occupancy">
              <SelectValue placeholder="Choose an occupancy record" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {occupancyItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="charge-amount">Amount (MWK)</FieldLabel>
            <Input
              id="charge-amount"
              name="amount"
              type="number"
              min="1"
              max="2000000000"
              inputMode="numeric"
              required
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="charge-due-date">Due date</FieldLabel>
            <Input id="charge-due-date" name="dueDate" type="date" required disabled={isPending} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="charge-description">Description</FieldLabel>
          <Textarea
            id="charge-description"
            name="description"
            maxLength={500}
            placeholder="For example: August occupancy payment or electricity adjustment"
            disabled={isPending}
          />
          <FieldDescription>
            This creates a ledger entry only. Dzaleka Spaces does not collect this amount.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CalendarPlus data-icon="inline-start" />
            )}
            Schedule charge
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
