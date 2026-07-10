"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
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
import { SPACE_CATEGORIES, ZONES } from "@/lib/types";
import { requestAssistedListing } from "@/app/request-assisted-listing/actions";

const categoryItems = [
  { label: "What kind of space? (optional)", value: null },
  ...SPACE_CATEGORIES.map((c) => ({ label: c.label, value: c.value as string })),
];

export function AssistedListingForm({ zones = [...ZONES] }: { zones?: string[] }) {
  const zoneItems = [
    { label: "Which zone? (optional)", value: null },
    ...zones.map((z) => ({ label: z, value: z })),
  ];
  const [isPending, startTransition] = useTransition();
  const [zone, setZone] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (zone) formData.set("zone", zone);
    if (category) formData.set("category", category);
    startTransition(async () => {
      const result = await requestAssistedListing(formData);
      if (result.ok) {
        setDone(true);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border p-6">
        <CheckCircle2 className="size-8 text-primary" />
        <h2 className="text-lg font-semibold">Request received</h2>
        <p className="text-sm text-muted-foreground">
          A field representative will contact you to arrange a visit, take photographs and prepare
          the listing with you. The assisted-listing fee is agreed before any work starts.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="al-name">Your name</FieldLabel>
            <Input id="al-name" name="name" required disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="al-contact">Phone or WhatsApp</FieldLabel>
            <Input id="al-contact" name="contact" type="tel" required disabled={isPending} />
          </Field>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel>Zone</FieldLabel>
            <Select
              items={zoneItems}
              value={zone}
              onValueChange={(v) => setZone(v as string | null)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {zoneItems.map((item) => (
                    <SelectItem key={String(item.value)} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Space category</FieldLabel>
            <Select
              items={categoryItems}
              value={category}
              onValueChange={(v) => setCategory(v as string | null)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryItems.map((item) => (
                    <SelectItem key={String(item.value)} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="al-notes">Anything we should know? (optional)</FieldLabel>
          <Textarea
            id="al-notes"
            name="notes"
            placeholder="e.g. best days to visit, how to find the space"
            disabled={isPending}
          />
          <FieldDescription>
            Your contact details are only used to arrange the visit. They are never published.
          </FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            Request a visit
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
