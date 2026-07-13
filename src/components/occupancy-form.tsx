"use client";

import { useState, useTransition } from "react";
import { FilePlus2 } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createOccupancy } from "@/app/provider/occupancies/actions";

export interface SpaceOption {
  id: string;
  label: string;
}

export interface EnquirerOption {
  userId: string;
  label: string;
}

export function OccupancyForm({
  spaces,
  enquirers,
}: {
  spaces: SpaceOption[];
  enquirers: EnquirerOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [occupantUserId, setOccupantUserId] = useState<string | null>(null);
  const [billing, setBilling] = useState("monthly");

  const spaceItems = [
    { label: "Select a space", value: null },
    ...spaces.map((s) => ({ label: s.label, value: s.id })),
  ];
  const enquirerItems = [
    { label: "No account — record name below", value: null },
    ...enquirers.map((e) => ({ label: e.label, value: e.userId })),
  ];

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (spaceId) formData.set("space_id", spaceId);
    if (occupantUserId) formData.set("occupant_user_id", occupantUserId);
    formData.set("billing_period", billing);
    startTransition(async () => {
      const result = await createOccupancy(formData);
      if (result && !result.ok) toast.error(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel>Space</FieldLabel>
          <Select
            items={spaceItems}
            value={spaceId}
            onValueChange={(v) => setSpaceId(v as string | null)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {spaceItems.map((item) => (
                  <SelectItem key={String(item.value)} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Occupant account (optional)</FieldLabel>
          <Select
            items={enquirerItems}
            value={occupantUserId}
            onValueChange={(v) => setOccupantUserId(v as string | null)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {enquirerItems.map((item) => (
                  <SelectItem key={String(item.value)} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Link someone who enquired through the platform so they can confirm from their own
            account. Otherwise they confirm in person.
          </FieldDescription>
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="occ-name">Occupant name</FieldLabel>
            <Input id="occ-name" name="occupant_name" required disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="occ-contact">Occupant phone / WhatsApp</FieldLabel>
            <Input id="occ-contact" name="occupant_contact" disabled={isPending} />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="occ-start">Start date</FieldLabel>
            <Input id="occ-start" name="start_date" type="date" required disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="occ-end">Expected end (optional)</FieldLabel>
            <Input id="occ-end" name="expected_end_date" type="date" disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel>Billing period</FieldLabel>
            <ToggleGroup
              value={[billing]}
              onValueChange={(v) => v[0] && setBilling(v[0] as string)}
              spacing={2}
            >
              <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
              <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
              <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="occ-amount">Agreed amount (MWK)</FieldLabel>
            <Input
              id="occ-amount"
              name="amount"
              type="number"
              min={0}
              required
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="occ-deposit">Deposit (MWK, optional)</FieldLabel>
            <Input id="occ-deposit" name="deposit" type="number" min={0} disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="occ-due">Payment due day (1–28)</FieldLabel>
            <Input
              id="occ-due"
              name="payment_due_day"
              type="number"
              min={1}
              max={28}
              disabled={isPending}
            />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="occ-notice">Notice period (days, optional)</FieldLabel>
            <Input
              id="occ-notice"
              name="notice_period_days"
              type="number"
              min={0}
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="occ-services">Included services (optional)</FieldLabel>
            <Input
              id="occ-services"
              name="included_services"
              placeholder="e.g. water, security"
              disabled={isPending}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="occ-notes">Basic conditions (optional)</FieldLabel>
          <Textarea
            id="occ-notes"
            name="notes"
            placeholder="Repair responsibilities, space rules…"
            disabled={isPending}
          />
          <FieldDescription>
            This record documents the arrangement for both parties. It does not create or transfer
            ownership of land or property.
          </FieldDescription>
        </Field>

        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FilePlus2 data-icon="inline-start" />
            )}
            Create occupancy record
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
