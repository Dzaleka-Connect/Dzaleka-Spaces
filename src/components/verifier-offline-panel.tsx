"use client";

import { useState, useTransition } from "react";
import { CloudUpload, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface QueuedSyncEvent {
  clientGeneratedId: string;
  assignmentId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

const STORAGE_KEY = "dzaleka.verifier.syncQueue";

function readQueue(): QueuedSyncEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSyncEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

async function sendEvent(event: QueuedSyncEvent): Promise<boolean> {
  const response = await fetch("/api/verifier/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return response.ok;
}

export function VerifierOfflinePanel() {
  const [queue, setQueue] = useState<QueuedSyncEvent[]>(() =>
    typeof window === "undefined" ? [] : readQueue()
  );
  const [isPending, startTransition] = useTransition();

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const queued: QueuedSyncEvent = {
      clientGeneratedId: crypto.randomUUID(),
      assignmentId: String(formData.get("assignmentId") ?? "").trim(),
      eventType: "offline_note",
      payload: {
        note: String(formData.get("note") ?? "").trim(),
        capturedAt: new Date().toISOString(),
      },
    };
    const next = [...queue, queued];
    writeQueue(next);
    setQueue(next);
    (event.currentTarget as HTMLFormElement).reset();
    toast.success("Offline verifier event queued.");
  }

  function syncNow() {
    startTransition(async () => {
      const remaining: QueuedSyncEvent[] = [];
      for (const item of queue) {
        try {
          const ok = await sendEvent(item);
          if (!ok) remaining.push(item);
        } catch {
          remaining.push(item);
        }
      }
      writeQueue(remaining);
      setQueue(remaining);
      if (remaining.length === 0) toast.success("Verifier queue synced.");
      else toast.error("Some verifier events could not sync yet.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <form onSubmit={saveDraft} className="rounded-lg border p-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="assignment-id">Assignment ID</FieldLabel>
            <Input id="assignment-id" name="assignmentId" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="note">Offline note</FieldLabel>
            <Textarea id="note" name="note" required minLength={3} />
          </Field>
          <Button type="submit">
            <Save data-icon="inline-start" />
            Queue offline event
          </Button>
        </FieldGroup>
      </form>

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Queued events</p>
        <p className="mt-1 text-3xl font-bold">{queue.length}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={syncNow}
          disabled={isPending || queue.length === 0}
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CloudUpload data-icon="inline-start" />
          )}
          Sync now
        </Button>
      </div>
    </div>
  );
}
