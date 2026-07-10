"use client";

import { useTransition } from "react";
import { CheckCircle2, MapPin, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  recordViewingSafetyCheckIn,
  releaseViewingDirections,
} from "@/app/account/viewings/actions";

export function ViewingSafetyActions({ viewingId }: { viewingId: string }) {
  const [isPending, startTransition] = useTransition();
  function checkIn(status: "departing" | "arrived" | "safe" | "needs_help") {
    startTransition(async () => {
      const result = await recordViewingSafetyCheckIn(viewingId, status);
      if (result.ok) toast.success("Safety status recorded.");
      else toast.error(result.error ?? "Could not record status.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => checkIn("departing")} disabled={isPending}>
        Leaving now
      </Button>
      <Button variant="outline" size="sm" onClick={() => checkIn("arrived")} disabled={isPending}>
        I arrived
      </Button>
      <Button variant="outline" size="sm" onClick={() => checkIn("safe")} disabled={isPending}>
        <CheckCircle2 data-icon="inline-start" />I am safe
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => checkIn("needs_help")}
        disabled={isPending}
      >
        <ShieldAlert data-icon="inline-start" />I need help
      </Button>
    </div>
  );
}

export function ViewingDirectionsForm({ viewingId }: { viewingId: string }) {
  const [isPending, startTransition] = useTransition();
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await releaseViewingDirections(viewingId, formData);
      if (result.ok) toast.success("Directions released to confirmed participants.");
      else toast.error(result.error ?? "Could not release directions.");
    });
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="directions">Meeting directions</FieldLabel>
          <Textarea
            id="directions"
            name="directions"
            minLength={10}
            maxLength={2000}
            required
            disabled={isPending}
          />
          <FieldDescription>
            Only confirmed participants can retrieve this private information. Do not include
            identity document numbers.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="meeting-contact">Meeting contact</FieldLabel>
          <Input id="meeting-contact" name="meeting_contact" maxLength={120} disabled={isPending} />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <MapPin data-icon="inline-start" />}
            Release directions
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
