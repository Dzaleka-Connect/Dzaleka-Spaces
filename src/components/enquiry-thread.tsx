"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { EnquiryDetail } from "@/lib/enquiries";
import {
  closeEnquiry,
  sendEnquiryMessage,
} from "@/app/account/enquiries/actions";

export function EnquiryThread({
  enquiry,
  viewerRole,
}: {
  enquiry: EnquiryDetail;
  viewerRole: "seeker" | "provider";
}) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState(enquiry.messages);

  function onSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await sendEnquiryMessage(
        enquiry.id,
        formData,
        viewerRole
      );
      if (result.ok && result.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            senderRole: viewerRole,
            body: result.message!,
            createdAt: new Date().toISOString(),
            attachments: [],
          },
        ]);
        (event.target as HTMLFormElement).reset();
        toast.success("Message sent.");
      } else {
        toast.error(result.error ?? "Could not send message.");
      }
    });
  }

  function onClose() {
    startTransition(async () => {
      const result = await closeEnquiry(enquiry.id, viewerRole);
      if (result.ok) {
        toast.success("Enquiry closed.");
      } else {
        toast.error(result.error ?? "Could not close enquiry.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{enquiry.channel}</Badge>
        <Badge
          variant={enquiry.status === "open" ? "secondary" : "outline"}
        >
          {enquiry.status}
        </Badge>
      </div>

      <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`flex flex-col gap-1 rounded-lg p-2 text-sm ${
              m.senderRole === viewerRole
                ? "ml-8 bg-primary/10"
                : "mr-8 bg-muted"
            }`}
          >
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {m.senderRole}
            </span>
            <p>{m.body}</p>
            {m.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {m.attachments.map((attachment) => (
                  <Badge key={attachment.id} variant="outline">
                    <a href={`/api/enquiry-attachments/${attachment.id}`}>
                      {attachment.fileName}
                    </a>
                  </Badge>
                ))}
              </div>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {new Date(m.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      {enquiry.status === "open" ? (
        <form onSubmit={onSend}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reply-body">Reply</FieldLabel>
              <Textarea
                id="reply-body"
                name="body"
                required
                minLength={1}
                disabled={isPending}
                placeholder="Write your message…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="attachments">Attachments</FieldLabel>
              <Input
                id="attachments"
                name="attachments"
                type="file"
                multiple
                disabled={isPending}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                Send
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={onClose}
              >
                Close enquiry
              </Button>
            </div>
          </FieldGroup>
        </form>
      ) : null}
    </div>
  );
}
