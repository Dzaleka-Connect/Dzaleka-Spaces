"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  assignVerification,
  saveContentPage,
  saveSystemSetting,
  updateModerationCase,
} from "@/app/admin/operations/actions";

function useResultAction(
  action: (previous: unknown, data: FormData) => Promise<{ ok: boolean; message: string }>
) {
  return useActionState(async (previous: unknown, data: FormData) => {
    const result = await action(previous, data);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, null);
}

export function CaseUpdateForm({
  caseId,
  currentStatus,
}: {
  caseId: string;
  currentStatus: string;
}) {
  const statuses = ["open", "triaged", "waiting", "resolved", "closed"].map((value) => ({
    value,
    label: value.replace(/_/g, " "),
  }));
  const [, action, pending] = useResultAction(async (_previous, data) =>
    updateModerationCase(caseId, data)
  );
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="case-status">Status</FieldLabel>
          <Select name="status" items={statuses} defaultValue={currentStatus}>
            <SelectTrigger id="case-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statuses.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="case-note">Decision note</FieldLabel>
          <Textarea
            id="case-note"
            name="note"
            minLength={5}
            maxLength={2000}
            required
            disabled={pending}
          />
          <FieldDescription>
            Record the reason without copying unnecessary identity, payment or exact-location data.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            Update case
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function SystemSettingForm({
  settingKey,
  value,
  description,
}: {
  settingKey: string;
  value: unknown;
  description?: string | null;
}) {
  const [, action, pending] = useResultAction(async (_previous, data) =>
    saveSystemSetting(settingKey, data)
  );
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`setting-${settingKey}`}>{settingKey}</FieldLabel>
          <Textarea
            id={`setting-${settingKey}`}
            name="value"
            defaultValue={JSON.stringify(value, null, 2)}
            required
            disabled={pending}
          />
          <FieldDescription>
            JSON value. Feature flags and protected pilot boundaries are managed separately.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`setting-description-${settingKey}`}>Change reason</FieldLabel>
          <Input
            id={`setting-description-${settingKey}`}
            name="description"
            defaultValue={description ?? ""}
            required
            disabled={pending}
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}Save
            setting
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function ContentPageForm({
  slug,
  title = "",
  body = "",
  status = "draft",
}: {
  slug: string;
  title?: string;
  body?: string;
  status?: string;
}) {
  const statuses = ["draft", "published", "archived"].map((value) => ({ value, label: value }));
  const [, action, pending] = useResultAction(async (_previous, data) =>
    saveContentPage(slug, data)
  );
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="content-title">Title</FieldLabel>
          <Input
            id="content-title"
            name="title"
            defaultValue={title}
            minLength={3}
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="content-body">Body</FieldLabel>
          <Textarea
            id="content-body"
            name="body"
            defaultValue={body}
            minLength={20}
            className="min-h-64"
            required
            disabled={pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="content-status">Status</FieldLabel>
          <Select name="status" items={statuses} defaultValue={status}>
            <SelectTrigger id="content-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statuses.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}Save
            content
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function VerificationAssignmentForm({
  listings,
  verifiers,
}: {
  listings: { value: string; label: string }[];
  verifiers: { value: string; label: string }[];
}) {
  const [, action, pending] = useResultAction(assignVerification);
  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="assignment-listing">Listing</FieldLabel>
          <Select name="listing_id" items={listings} required>
            <SelectTrigger id="assignment-listing">
              <SelectValue placeholder="Choose listing" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {listings.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="assignment-verifier">Field verifier</FieldLabel>
          <Select name="verifier_id" items={verifiers} required>
            <SelectTrigger id="assignment-verifier">
              <SelectValue placeholder="Choose verifier" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {verifiers.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="assignment-due">Due date and time</FieldLabel>
          <Input
            id="assignment-due"
            name="due_at"
            type="datetime-local"
            required
            disabled={pending}
          />
        </Field>
        <Field orientation="horizontal">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            Assign visit
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
