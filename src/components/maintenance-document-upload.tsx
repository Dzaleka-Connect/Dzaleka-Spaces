"use client";

import { useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { uploadMaintenanceDocument } from "@/app/trades/actions";

export function MaintenanceDocumentUpload({
  ticketId,
  workOrderId,
  tickets,
}: {
  ticketId?: string | null;
  workOrderId?: string | null;
  tickets?: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const hasTicketPicker = (tickets?.length ?? 0) > 0;
  const fixedTicketId = ticketId ?? null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedTicketId =
      String(formData.get("ticketId") ?? "").trim() || fixedTicketId;
    if (!selectedTicketId) {
      toast.error("Choose a job first.");
      return;
    }
    formData.set("ticketId", selectedTicketId);
    if (workOrderId) formData.set("workOrderId", workOrderId);

    startTransition(async () => {
      const result = await uploadMaintenanceDocument(formData);
      if (result.ok) {
        toast.success("Document uploaded.");
        form.reset();
      } else {
        toast.error(result.error ?? "Upload failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border p-4">
      <FieldGroup>
        {hasTicketPicker ? (
          <Field>
            <FieldLabel htmlFor="doc-ticket">Job</FieldLabel>
            <select
              id="doc-ticket"
              name="ticketId"
              required
              defaultValue={fixedTicketId ?? tickets?.[0]?.id}
              disabled={isPending}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {tickets!.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.title}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <input type="hidden" name="ticketId" value={fixedTicketId ?? ""} />
        )}
        <Field>
          <FieldLabel htmlFor="doc-kind">Document type</FieldLabel>
          <select
            id="doc-kind"
            name="kind"
            defaultValue="evidence"
            disabled={isPending}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="evidence">Evidence photo</option>
            <option value="quote">Quote record</option>
            <option value="completion">Completion evidence</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="doc-file">File</FieldLabel>
          <Input
            id="doc-file"
            name="file"
            type="file"
            required
            disabled={isPending}
            accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
          />
          <FieldDescription>
            Private to job participants. Max 10 MB. Do not upload identity
            documents.
          </FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Upload data-icon="inline-start" />
            )}
            Upload
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
