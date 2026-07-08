"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { submitEnquiry } from "@/app/spaces/[id]/actions";

export function EnquiryForm({ listingId }: { listingId: string }) {
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState("whatsapp");
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("channel", channel);
    startTransition(async () => {
      const result = await submitEnquiry(listingId, formData);
      if (result.ok) {
        setSent(true);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Your enquiry has been sent. The provider will contact you to arrange a
        viewing. Remember: view the space before paying anything.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="enq-name">Your name</FieldLabel>
          <Input id="enq-name" name="name" required disabled={isPending} />
        </Field>
        <Field>
          <FieldLabel htmlFor="enq-contact">Phone or WhatsApp number</FieldLabel>
          <Input
            id="enq-contact"
            name="contact"
            type="tel"
            required
            disabled={isPending}
          />
        </Field>
        <Field>
          <FieldLabel>How should the provider reply?</FieldLabel>
          <ToggleGroup
            value={[channel]}
            onValueChange={(v) => v[0] && setChannel(v[0] as string)}
            spacing={2}
          >
            <ToggleGroupItem value="whatsapp">WhatsApp</ToggleGroupItem>
            <ToggleGroupItem value="phone">Phone call</ToggleGroupItem>
            <ToggleGroupItem value="in_app">In-app</ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="enq-message">Message (optional)</FieldLabel>
          <Textarea
            id="enq-message"
            name="message"
            placeholder="e.g. When can I come for a viewing?"
            disabled={isPending}
          />
          <FieldDescription>
            Never pay a deposit before viewing the space in person.
          </FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Send enquiry
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
