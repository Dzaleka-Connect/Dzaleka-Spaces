"use client";

import { ReceiptText } from "lucide-react";
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

const PAYMENT_METHOD_ITEMS = [
  { value: "cash", label: "Cash" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "tnm_mpamba", label: "TNM Mpamba" },
  { value: "dzalekapay", label: "DzalekaPay" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "organisation", label: "Organisation sponsor" },
  { value: "other", label: "Other external method" },
];

export function PaymentEntryFields({
  occupancies,
  audience,
  pending,
}: {
  occupancies: OccupancyRecord[];
  audience: "occupant" | "provider";
  pending: boolean;
}) {
  const occupancyItems = occupancies.map((occupancy) => {
    const occupant = occupancy.parties.find((party) => party.role === "occupant");
    const space = `${categoryLabel(occupancy.spaceCategory)} (${occupancy.spaceZone})`;
    return {
      value: occupancy.id,
      label:
        audience === "provider"
          ? `${occupant?.fullName ?? "Occupant"} - ${space}`
          : `${space} - ${occupancy.spaceLandmark}`,
    };
  });

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="payment-occupancy">Occupancy record</FieldLabel>
        <Select name="occupancyId" items={occupancyItems} required disabled={pending}>
          <SelectTrigger id="payment-occupancy">
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
          <FieldLabel htmlFor="payment-amount">Amount (MWK)</FieldLabel>
          <Input
            id="payment-amount"
            name="amount"
            type="number"
            min="1"
            max="2000000000"
            inputMode="numeric"
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="payment-date">Payment date</FieldLabel>
          <Input id="payment-date" name="paymentDate" type="date" required disabled={pending} />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="payment-method">Method used outside the platform</FieldLabel>
        <Select name="method" items={PAYMENT_METHOD_ITEMS} required disabled={pending}>
          <SelectTrigger id="payment-method">
            <SelectValue placeholder="Choose a method" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PAYMENT_METHOD_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          Dzaleka Spaces does not initiate or hold this payment. Record only a payment the parties
          made directly.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="payment-reference">External reference</FieldLabel>
        <Input
          id="payment-reference"
          name="externalReference"
          maxLength={200}
          placeholder="Optional transaction or cash receipt reference"
          disabled={pending}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="payment-notes">Notes</FieldLabel>
        <Textarea id="payment-notes" name="notes" maxLength={500} disabled={pending} />
      </Field>

      <Field orientation="horizontal">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ReceiptText data-icon="inline-start" />
          )}
          {audience === "provider" ? "Record payment" : "Report payment"}
        </Button>
      </Field>
    </FieldGroup>
  );
}
