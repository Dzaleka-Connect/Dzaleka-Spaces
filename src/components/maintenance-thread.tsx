"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceMessage } from "@/lib/trades";
import { sendMaintenanceMessage } from "@/app/trades/actions";

export function MaintenanceThread({
  ticketId,
  workOrderId,
  initialMessages,
  viewerRole,
}: {
  ticketId: string;
  workOrderId?: string | null;
  initialMessages: MaintenanceMessage[];
  viewerRole: "requester" | "service_provider" | "staff";
}) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState(initialMessages);

  function onSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (workOrderId) formData.set("workOrderId", workOrderId);

    startTransition(async () => {
      const result = await sendMaintenanceMessage(ticketId, formData);
      if (result.ok && result.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            ticketId,
            workOrderId: workOrderId ?? null,
            senderId: "me",
            senderRole: viewerRole,
            body: result.message!,
            createdAt: new Date().toISOString(),
          },
        ]);
        form.reset();
        toast.success("Message sent.");
      } else {
        toast.error(result.error ?? "Could not send message.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Keep job updates here — do not share exact household coordinates in
            chat.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderRole === viewerRole;
            return (
              <div
                key={message.id}
                className={`flex flex-col gap-1 rounded-lg p-3 text-sm ${
                  mine ? "bg-primary/10 self-end" : "bg-muted self-start"
                } max-w-[85%]`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {message.senderRole.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={onSend}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="maintenance-message">Message</FieldLabel>
            <Textarea
              id="maintenance-message"
              name="body"
              rows={3}
              required
              disabled={isPending}
              placeholder="Share schedule updates or questions…"
            />
          </Field>
          <Field>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
              Send
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
