"use client";

import { useTransition } from "react";
import { Upload } from "lucide-react";
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
  const ticketItems = (tickets ?? []).map((ticket) => ({
    value: ticket.id,
    label: ticket.title,
  }));
  const kindItems = [
    { value: "evidence", label: "Evidence photo" },
    { value: "quote", label: "Quote record" },
    { value: "completion", label: "Completion evidence" },
    { value: "other", label: "Other" },
  ];

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedTicketId = String(formData.get("ticketId") ?? "").trim() || fixedTicketId;
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
            <Select
              name="ticketId"
              items={ticketItems}
              required
              defaultValue={fixedTicketId ?? tickets?.[0]?.id}
              disabled={isPending}
            >
              <SelectTrigger id="doc-ticket">
                <SelectValue placeholder="Choose a job" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ticketItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="ticketId" value={fixedTicketId ?? ""} />
        )}
        <Field>
          <FieldLabel htmlFor="doc-kind">Document type</FieldLabel>
          <Select name="kind" items={kindItems} defaultValue="evidence" disabled={isPending}>
            <SelectTrigger id="doc-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {kindItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
            Private to job participants. Max 10 MB. Do not upload identity documents.
          </FieldDescription>
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
            Upload
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
