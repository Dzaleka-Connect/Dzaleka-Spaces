"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createMaintenanceReview } from "@/app/trades/actions";
import type { WorkOrder } from "@/lib/trades";

export function MaintenanceReviewForm({
  reviewable,
}: {
  reviewable: WorkOrder[];
}) {
  const [isPending, startTransition] = useTransition();

  if (reviewable.length === 0) return null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createMaintenanceReview(formData);
      if (result.ok) {
        toast.success("Review submitted.");
        form.reset();
      } else {
        toast.error(result.error ?? "Could not submit review.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border p-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="review-work-order">Completed work order</FieldLabel>
          <select
            id="review-work-order"
            name="workOrderId"
            required
            disabled={isPending}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Select a completed job</option>
            {reviewable.map((order) => (
              <option key={order.id} value={order.id}>
                {order.ticketTitle}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="review-rating">Rating (1–5)</FieldLabel>
          <Input
            id="review-rating"
            name="rating"
            type="number"
            min={1}
            max={5}
            required
            disabled={isPending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="review-comment">Comment</FieldLabel>
          <Textarea
            id="review-comment"
            name="comment"
            rows={3}
            disabled={isPending}
            placeholder="Optional feedback for the service provider"
          />
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Submit review
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
