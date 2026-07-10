"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { categoryLabel, TRADE_CATEGORIES } from "@/lib/types";
import { createMaintenanceTicketAction } from "../actions";

const PRIORITIES = [
  { value: "low", label: "Low - non-urgent check" },
  { value: "normal", label: "Normal - standard repair" },
  { value: "urgent", label: "Urgent - immediate safety or hazard issue" },
];

export function CreateTicketForm({ occupancies }: { occupancies: OccupancyRecord[] }) {
  const router = useRouter();
  const [, formAction, isPending] = useActionState(
    async (previous: unknown, formData: FormData) => {
      const result = await createMaintenanceTicketAction(previous, formData);
      if (result.ok) {
        toast.success(result.message);
        router.push("/account/maintenance");
      } else {
        toast.error(result.message);
      }
      return result;
    },
    null
  );
  const occupancyItems = occupancies.map((occupancy) => ({
    value: occupancy.id,
    label: `${categoryLabel(occupancy.spaceCategory)} (${occupancy.spaceZone}) - ${occupancy.spaceLandmark}`,
  }));
  const categoryItems = TRADE_CATEGORIES.map((category) => ({
    value: category,
    label: category,
  }));

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="maintenance-occupancy">Associated space</FieldLabel>
          <Select name="occupancyId" items={occupancyItems} required disabled={isPending}>
            <SelectTrigger id="maintenance-occupancy">
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
        <Field>
          <FieldLabel htmlFor="maintenance-title">What needs attention?</FieldLabel>
          <Input
            id="maintenance-title"
            name="title"
            minLength={5}
            maxLength={140}
            placeholder="For example: leaking pipe near the wash area"
            required
            disabled={isPending}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="maintenance-category">Service category</FieldLabel>
            <Select name="category" items={categoryItems} required disabled={isPending}>
              <SelectTrigger id="maintenance-category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="maintenance-priority">Priority</FieldLabel>
            <Select
              name="priority"
              items={PRIORITIES}
              defaultValue="normal"
              required
              disabled={isPending}
            >
              <SelectTrigger id="maintenance-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRIORITIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="maintenance-description">Details</FieldLabel>
          <Textarea
            id="maintenance-description"
            name="description"
            minLength={10}
            maxLength={3000}
            rows={5}
            placeholder="Describe the problem, its location inside the space, and any immediate safety concern."
            required
            disabled={isPending}
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <Wrench data-icon="inline-start" />}
            Submit request
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
