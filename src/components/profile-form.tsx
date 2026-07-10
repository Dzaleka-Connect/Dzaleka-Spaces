"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
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
import { updateProfile } from "@/app/account/profile/actions";

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Chichewa", value: "ny" },
  { label: "Swahili", value: "sw" },
  { label: "French", value: "fr" },
  { label: "Kirundi", value: "rn" },
];

export interface ProfileValues {
  fullName: string;
  phone: string;
  whatsapp: string;
  preferredLanguage: string;
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [isPending, startTransition] = useTransition();
  const [language, setLanguage] = useState<string | null>(initial.preferredLanguage || "en");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (language) formData.set("preferred_language", language);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="pf-name">Full name</FieldLabel>
          <Input
            id="pf-name"
            name="full_name"
            defaultValue={initial.fullName}
            required
            disabled={isPending}
          />
          <FieldDescription>
            Shown to providers you contact, and as the provider name on your own published listings.
          </FieldDescription>
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pf-phone">Phone (optional)</FieldLabel>
            <Input
              id="pf-phone"
              name="phone"
              type="tel"
              defaultValue={initial.phone}
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pf-whatsapp">WhatsApp (optional)</FieldLabel>
            <Input
              id="pf-whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={initial.whatsapp}
              disabled={isPending}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>Preferred language</FieldLabel>
          <Select
            items={LANGUAGES}
            value={language}
            onValueChange={(v) => setLanguage(v as string | null)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {LANGUAGES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Used for occupancy documents and future notifications.
          </FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            Save profile
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
