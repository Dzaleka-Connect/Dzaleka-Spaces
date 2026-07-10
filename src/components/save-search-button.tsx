"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { filtersToCriteria } from "@/lib/search-criteria";
import { saveSearch } from "@/app/account/saved-searches/actions";

const channelItems = [
  { label: "Email", value: "email" },
  { label: "In-app", value: "in_app" },
];

const frequencyItems = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Instant", value: "instant" },
];

export function SaveSearchButton({ signedIn }: { signedIn: boolean }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("email");
  const [frequency, setFrequency] = useState("weekly");
  const [isPending, startTransition] = useTransition();

  if (!signedIn || searchParams.size === 0) return null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("channel", channel);
    formData.set("frequency", frequency);
    formData.set("criteria", JSON.stringify(filtersToCriteria(searchParams)));

    startTransition(async () => {
      const result = await saveSearch(formData);
      if (result.ok) {
        toast.success("Search saved.");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Could not save search.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Bookmark data-icon="inline-start" />
        Save search
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>
            Get notified when new listings match your current filters. Alerts require the
            saved_search_alerts feature flag.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="search-name">Name</FieldLabel>
              <Input
                id="search-name"
                name="name"
                required
                placeholder="e.g. Verified shops in Kawale"
              />
            </Field>
            <Field>
              <FieldLabel>Channel</FieldLabel>
              <Select
                items={channelItems}
                value={channel}
                onValueChange={(v) => setChannel(v as string)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {channelItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Frequency</FieldLabel>
              <Select
                items={frequencyItems}
                value={frequency}
                onValueChange={(v) => setFrequency(v as string)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {frequencyItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Save
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
