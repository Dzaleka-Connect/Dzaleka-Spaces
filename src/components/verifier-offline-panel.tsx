"use client";

import { useEffect, useState, useTransition } from "react";
import { CloudUpload, LocateFixed, LockKeyhole, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { stripImageMetadata } from "@/lib/strip-image-client";
import { CHECKLIST_ITEMS, RECOMMENDATIONS } from "@/lib/verification";
import {
  arrayBufferToBase64,
  clearVerifierDeviceData,
  queueVerification,
  readVerificationQueue,
  removeQueuedVerification,
  type OfflineEvidence,
  type QueuedVerification,
} from "@/lib/verifier-offline";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const INACTIVITY_MS = 15 * 60 * 1000;

export function VerifierOfflinePanel({
  assignments,
}: {
  assignments: { value: string; label: string }[];
}) {
  const [queue, setQueue] = useState<QueuedVerification[]>([]);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locked, setLocked] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function refreshQueue() {
    setQueue(await readVerificationQueue());
  }
  useEffect(() => {
    let active = true;
    void readVerificationQueue().then((items) => {
      if (active) setQueue(items);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let timeout = window.setTimeout(() => setLocked(true), INACTIVITY_MS);
    const reset = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setLocked(true), INACTIVITY_MS);
    };
    for (const event of ["pointerdown", "keydown", "touchstart"] as const)
      window.addEventListener(event, reset, { passive: true });
    return () => {
      window.clearTimeout(timeout);
      for (const event of ["pointerdown", "keydown", "touchstart"] as const)
        window.removeEventListener(event, reset);
    };
  }, []);

  function captureCoordinates() {
    if (!navigator.geolocation)
      return toast.error("This device does not provide location capture.");
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => toast.error("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function evidenceFromForm(formData: FormData): Promise<OfflineEvidence[]> {
    const evidence: OfflineEvidence[] = [];
    for (const [field, kind] of [
      ["photos", "photo"],
      ["audio", "audio"],
    ] as const) {
      for (const entry of formData.getAll(field)) {
        if (!(entry instanceof File) || entry.size === 0) continue;
        if (entry.size > MAX_EVIDENCE_BYTES) throw new Error(`${entry.name} is larger than 10 MB.`);
        const source = kind === "photo" ? await stripImageMetadata(entry) : entry;
        evidence.push({
          name: entry.name,
          type: source.type,
          size: source.size,
          data: arrayBufferToBase64(await source.arrayBuffer()),
          kind,
        });
      }
    }
    return evidence;
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const assignmentId = String(formData.get("assignmentId") ?? "");
        if (!assignmentId) throw new Error("Choose an assignment.");
        const checklist = Object.fromEntries(
          CHECKLIST_ITEMS.map((item) => [item.key, formData.get(item.key) === "on"])
        );
        const item: QueuedVerification = {
          clientGeneratedId: crypto.randomUUID(),
          assignmentId,
          eventType: "verification_submission",
          payload: {
            ...checklist,
            recommendation: String(formData.get("recommendation") ?? ""),
            safety_notes: String(formData.get("safety_notes") ?? ""),
            coordinates,
            captured_at: new Date().toISOString(),
          },
          notes: String(formData.get("notes") ?? "").trim() || null,
          evidence: await evidenceFromForm(formData),
          createdAt: new Date().toISOString(),
        };
        await queueVerification(item);
        form.reset();
        setCoordinates(null);
        await refreshQueue();
        toast.success("Encrypted verification draft queued on this device.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save the offline draft.");
      }
    });
  }

  function syncNow() {
    startTransition(async () => {
      let failed = 0;
      for (const item of queue) {
        try {
          const response = await fetch("/api/verifier/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (!response.ok) {
            failed += 1;
            continue;
          }
          await removeQueuedVerification(item.clientGeneratedId);
        } catch {
          failed += 1;
        }
      }
      await refreshQueue();
      if (failed) {
        toast.error(`${failed} verification draft${failed === 1 ? "" : "s"} could not sync.`);
      } else {
        toast.success("Verifier queue synced and local copies deleted.");
      }
    });
  }

  if (locked) return <VerifierReauthentication onUnlock={() => setLocked(false)} />;

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <LockKeyhole />
        <AlertTitle>Encrypted device queue</AlertTitle>
        <AlertDescription>
          Drafts and evidence are encrypted with a non-exportable key stored by this browser. Synced
          copies are deleted from the device automatically. Clear local data before handing the
          device to another person.
        </AlertDescription>
      </Alert>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Offline field record</CardTitle>
            <CardDescription>
              Complete this during the visit. A supervisor, not the verifier, decides publication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveDraft}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="assignment-id">Assignment</FieldLabel>
                  <Select name="assignmentId" items={assignments} required>
                    <SelectTrigger id="assignment-id">
                      <SelectValue placeholder="Choose downloaded assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {assignments.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <FieldSet>
                  <FieldLegend>Field checks</FieldLegend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CHECKLIST_ITEMS.map((item) => (
                      <Field key={item.key} orientation="horizontal">
                        <Checkbox id={`offline-${item.key}`} name={item.key} />
                        <FieldLabel htmlFor={`offline-${item.key}`} className="font-normal">
                          {item.label}
                        </FieldLabel>
                      </Field>
                    ))}
                  </div>
                </FieldSet>
                <Field>
                  <FieldLabel htmlFor="offline-recommendation">Recommendation</FieldLabel>
                  <Select name="recommendation" items={RECOMMENDATIONS} required>
                    <SelectTrigger id="offline-recommendation">
                      <SelectValue placeholder="Choose recommendation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {RECOMMENDATIONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Private coordinates</FieldLabel>
                  <Button type="button" variant="outline" onClick={captureCoordinates}>
                    <LocateFixed data-icon="inline-start" />
                    {coordinates
                      ? `Captured within ${Math.round(coordinates.accuracy)} m`
                      : "Capture coordinates"}
                  </Button>
                  <FieldDescription>
                    Coordinates are restricted evidence and are never placed in the public listing.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="offline-photos">Evidence photos</FieldLabel>
                  <Input
                    id="offline-photos"
                    name="photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    multiple
                  />
                  <FieldDescription>
                    Image metadata is removed before the encrypted draft is stored.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="offline-audio">Voice note</FieldLabel>
                  <Input id="offline-audio" name="audio" type="file" accept="audio/*" capture />
                  <FieldDescription>
                    Use only when typing is impractical. Avoid names and identity numbers unless
                    operationally necessary.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="offline-safety">Safety concerns</FieldLabel>
                  <Textarea id="offline-safety" name="safety_notes" maxLength={2000} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="offline-notes">Reviewer notes</FieldLabel>
                  <Textarea id="offline-notes" name="notes" maxLength={4000} />
                </Field>
                <Field orientation="horizontal">
                  <Button type="submit" disabled={isPending}>
                    <Save data-icon="inline-start" />
                    Save encrypted draft
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync queue</CardTitle>
              <CardDescription>Oldest draft uploads first.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-3xl font-bold">{queue.length}</p>
              {queue.map((item) => (
                <div key={item.clientGeneratedId} className="border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{new Date(item.createdAt).toLocaleString("en-MW")}</span>
                    <Badge variant="outline">{item.evidence.length} files</Badge>
                  </div>
                </div>
              ))}
              <Button onClick={syncNow} disabled={isPending || queue.length === 0}>
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CloudUpload data-icon="inline-start" />
                )}
                Sync now
              </Button>
            </CardContent>
          </Card>
          <Button
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                await clearVerifierDeviceData();
                await refreshQueue();
                toast.success("Local verifier data cleared.");
              })
            }
            disabled={isPending}
          >
            <Trash2 data-icon="inline-start" />
            Clear device data
          </Button>
        </aside>
      </div>
    </div>
  );
}

function VerifierReauthentication({ onUnlock }: { onUnlock: () => void }) {
  const [pending, startTransition] = useTransition();
  function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp[0];
      if (!factor) {
        toast.error("Set up an authenticator in Account security.");
        return;
      }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) toast.error(error.message);
      else onUnlock();
    });
  }
  return (
    <Card>
      <CardHeader>
        <LockKeyhole />
        <CardTitle>Verifier locked after inactivity</CardTitle>
        <CardDescription>
          Enter a fresh authenticator code to reopen locally stored field records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={verify}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reauth-code">Six-digit code</FieldLabel>
              <Input
                id="reauth-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                disabled={pending}
              />
            </Field>
            <Field orientation="horizontal">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LockKeyhole data-icon="inline-start" />
                )}
                Unlock
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
