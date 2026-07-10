"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { createPrivacyRequest } from "@/app/account/privacy/actions";

const TYPES = [
  { label: "Access my data", value: "access" },
  { label: "Correct my data", value: "correction" },
  { label: "Export my data", value: "export" },
  { label: "Delete my account data", value: "deletion" },
  { label: "Restrict processing", value: "restriction" },
];

export function PrivacyRequestForm() {
  const [, action, pending] = useActionState(async (previous: unknown, data: FormData) => {
    const result = await createPrivacyRequest(previous, data);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, null);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="request-type">Request type</FieldLabel>
          <Select name="request_type" items={TYPES} required>
            <SelectTrigger id="request-type">
              <SelectValue placeholder="Choose a request" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="privacy-details">Details</FieldLabel>
          <Textarea id="privacy-details" name="details" maxLength={2000} disabled={pending} />
          <FieldDescription>
            Do not include passwords, authentication codes, identity document numbers or exact
            household coordinates.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            Submit request
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
