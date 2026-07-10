"use client";

import { useTransition } from "react";
import { Calendar, Check, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ViewingRecord } from "@/lib/viewings";
import {
  cancelViewing,
  confirmViewing,
  proposeViewing,
  requestViewing,
} from "@/app/account/viewings/actions";

export function ViewingActions({
  enquiryId,
  viewing,
  role,
}: {
  enquiryId: string;
  viewing?: ViewingRecord | null;
  role: "seeker" | "provider";
}) {
  const [isPending, startTransition] = useTransition();

  if (!viewing && role === "seeker") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await requestViewing(enquiryId, formData);
            if (result.ok) toast.success("Viewing requested.");
            else toast.error(result.error ?? "Request failed.");
          });
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="proposed_at">Preferred viewing time</FieldLabel>
            <Input
              id="proposed_at"
              name="proposed_at"
              type="datetime-local"
              required
              disabled={isPending}
            />
          </Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Calendar data-icon="inline-start" />
            )}
            Request viewing
          </Button>
        </FieldGroup>
      </form>
    );
  }

  if (!viewing) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{viewing.status}</Badge>
        <span className="text-sm text-muted-foreground">
          Proposed: {new Date(viewing.proposedAt).toLocaleString()}
        </span>
      </div>

      {viewing.alternativeAt ? (
        <p className="text-sm">Alternative: {new Date(viewing.alternativeAt).toLocaleString()}</p>
      ) : null}

      {viewing.providerNotes ? (
        <p className="text-sm text-muted-foreground">{viewing.providerNotes}</p>
      ) : null}

      {viewing.status === "confirmed" && viewing.locationReleasedAt ? (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <MapPin className="size-4" />
          Directions released after confirmation
        </p>
      ) : null}

      {role === "provider" && viewing.status === "requested" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await confirmViewing(viewing.id, formData);
              if (result.ok) toast.success("Viewing confirmed.");
              else toast.error(result.error ?? "Could not confirm.");
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="provider_notes">Notes for seeker</FieldLabel>
              <Textarea id="provider_notes" name="provider_notes" />
            </Field>
            <Field>
              <FieldLabel htmlFor="alternative_at">Alternative time (optional)</FieldLabel>
              <Input id="alternative_at" name="alternative_at" type="datetime-local" />
            </Field>
            <Button type="submit" disabled={isPending}>
              <Check data-icon="inline-start" />
              Confirm viewing
            </Button>
          </FieldGroup>
        </form>
      ) : null}

      {role === "provider" && viewing.status === "proposed" ? (
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await confirmViewing(viewing.id, new FormData());
              if (result.ok) toast.success("Viewing confirmed.");
              else toast.error(result.error ?? "Could not confirm.");
            })
          }
        >
          <Check data-icon="inline-start" />
          Confirm proposed time
        </Button>
      ) : null}

      {viewing.status !== "cancelled" && viewing.status !== "completed" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelViewing(viewing.id, role);
              if (result.ok) toast.success("Viewing cancelled.");
              else toast.error(result.error ?? "Could not cancel.");
            })
          }
        >
          <X data-icon="inline-start" />
          Cancel viewing
        </Button>
      ) : null}

      {role === "seeker" && viewing.status === "requested" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await proposeViewing(viewing.id, formData);
              if (result.ok) toast.success("Alternative time proposed.");
              else toast.error(result.error ?? "Could not update.");
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="alt_time">Suggest another time</FieldLabel>
              <Input id="alt_time" name="proposed_at" type="datetime-local" required />
            </Field>
            <Button type="submit" variant="outline" size="sm" disabled={isPending}>
              Propose alternative
            </Button>
          </FieldGroup>
        </form>
      ) : null}
    </div>
  );
}
