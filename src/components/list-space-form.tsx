"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PhotoUpload, uploadSpacePhotos } from "@/components/photo-upload";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FACILITIES, SPACE_CATEGORIES, ZONES } from "@/lib/types";
import { submitSpace } from "@/app/list-a-space/actions";

type CategoryOption = { value: string; label: string };

const authorityItems = [
  { label: "Select the basis of your authority", value: null },
  { label: "I currently occupy / manage this space", value: "current_recognised_occupier" },
  { label: "I manage it for an organisation", value: "organisation_manager" },
  { label: "I operate this venue", value: "venue_operator" },
  { label: "I represent my family", value: "family_representative" },
  { label: "I am an authorised agent", value: "authorised_agent" },
  { label: "Other documented relationship", value: "other_documented" },
];

export function ListSpaceForm({
  zones = [...ZONES],
  categories = SPACE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
}: {
  zones?: string[];
  categories?: CategoryOption[];
}) {
  const zoneItems = [
    { label: "Select a zone", value: null },
    ...zones.map((z) => ({ label: z, value: z })),
  ];
  const categoryItems = [
    { label: "Select a category", value: null },
    ...categories.map((c) => ({ label: c.label, value: c.value })),
  ];
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [authority, setAuthority] = useState<string | null>(null);
  const [billing, setBilling] = useState("monthly");
  const [photos, setPhotos] = useState<File[]>([]);
  const [done, setDone] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [photosUploaded, setPhotosUploaded] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photos.length < 1) {
      toast.error("Add at least one photo of the space before submitting.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    if (category) formData.set("category", category);
    if (zone) formData.set("zone", zone);
    if (authority) formData.set("authority_basis", authority);
    formData.set("billing_period", billing);

    startTransition(async () => {
      const result = await submitSpace(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.spaceId) {
        const upload = await uploadSpacePhotos(result.spaceId, photos);
        if (!upload.ok) {
          setSpaceId(result.spaceId);
          setPhotosUploaded(false);
          setDone(true);
          toast.error(
            `Space saved, but photos failed: ${upload.message}. Please upload them below.`
          );
          return;
        }
        setPhotosUploaded(true);
        setSpaceId(result.spaceId);
      } else {
        // Demo mode: no storage — treat selected photos as accepted.
        setPhotosUploaded(true);
      }

      setDone(true);
      toast.success(result.message);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-md border p-6">
        <CheckCircle2 className="size-8 text-primary" />
        <h2 className="text-xl font-semibold">Space submitted</h2>
        <p className="text-base text-muted-foreground">
          Thank you. A field representative will contact you to arrange an in-person verification
          visit before your listing is published. There is no charge until verification is agreed.
        </p>
        {photosUploaded ? (
          <p className="text-base text-muted-foreground">
            {photos.length} photo{photos.length === 1 ? "" : "s"} attached for review.
          </p>
        ) : spaceId ? (
          <PhotoUpload
            spaceId={spaceId}
            required
            files={photos}
            onFilesChange={setPhotos}
            description="Photos are required for verification. GPS metadata is removed before upload."
            onComplete={() => setPhotosUploaded(true)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ls-title">Listing title</FieldLabel>
          <Input
            id="ls-title"
            name="title"
            placeholder="e.g. Training room with electricity, Zone 3"
            required
            disabled={isPending}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel>Category</FieldLabel>
            <Select
              items={categoryItems}
              value={category}
              onValueChange={(v) => setCategory(v as string | null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categoryItems.map((item) => (
                    <SelectItem key={String(item.value)} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Zone</FieldLabel>
            <Select
              items={zoneItems}
              value={zone}
              onValueChange={(v) => setZone(v as string | null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {zoneItems.map((item) => (
                    <SelectItem key={String(item.value)} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="ls-landmark">Nearby landmark</FieldLabel>
          <Input
            id="ls-landmark"
            name="landmark"
            placeholder="e.g. Near the main market water point"
            required
            disabled={isPending}
          />
          <FieldDescription>
            Only the zone and landmark are shown publicly. The exact location is shared after you
            confirm a viewing.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="ls-description">Description</FieldLabel>
          <Textarea
            id="ls-description"
            name="description"
            placeholder="Describe the space, its condition and any rules."
            required
            disabled={isPending}
            className="min-h-28"
          />
        </Field>

        <PhotoUpload
          required
          files={photos}
          onFilesChange={setPhotos}
          description="At least one photo is required. Up to 5 images. GPS and camera metadata are removed before upload."
        />

        <div className="grid gap-6 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="ls-price">Price (MWK)</FieldLabel>
            <Input id="ls-price" name="price" type="number" min={0} required disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ls-deposit">Deposit (MWK, optional)</FieldLabel>
            <Input id="ls-deposit" name="deposit" type="number" min={0} disabled={isPending} />
          </Field>
          <Field>
            <FieldLabel>Billing period</FieldLabel>
            <ToggleGroup
              value={[billing]}
              onValueChange={(v) => v[0] && setBilling(v[0] as string)}
              spacing={2}
            >
              <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
              <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
              <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
            </ToggleGroup>
          </Field>
        </div>

        {billing !== "monthly" ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ls-min-stay">Minimum stay (days, optional)</FieldLabel>
              <Input
                id="ls-min-stay"
                name="min_stay_days"
                type="number"
                min={1}
                placeholder="e.g. 2"
                disabled={isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ls-max-stay">Maximum stay (days, optional)</FieldLabel>
              <Input
                id="ls-max-stay"
                name="max_stay_days"
                type="number"
                min={1}
                placeholder="e.g. 14"
                disabled={isPending}
              />
              <FieldDescription>
                Helpful for visiting families staying only a few days — seekers
                see the stay range on the listing.
              </FieldDescription>
            </Field>
          </div>
        ) : null}

        <FieldSet>
          <FieldLegend>Facilities</FieldLegend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FACILITIES.map((f) => (
              <div key={f.value} className="flex items-center gap-2">
                <Checkbox
                  id={`fac-${f.value}`}
                  name="facilities"
                  value={f.value}
                  disabled={isPending}
                />
                <FieldLabel htmlFor={`fac-${f.value}`} className="font-normal">
                  {f.label}
                </FieldLabel>
              </div>
            ))}
          </div>
        </FieldSet>

        <Field>
          <FieldLabel>Your authority to offer this space</FieldLabel>
          <Select
            items={authorityItems}
            value={authority}
            onValueChange={(v) => setAuthority(v as string | null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {authorityItems.map((item) => (
                  <SelectItem key={String(item.value)} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            A field representative will check this during the verification visit. It is never
            displayed publicly and does not establish ownership of land or property.
          </FieldDescription>
        </Field>

        <Field>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <Send data-icon="inline-start" />}
            Submit for verification
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
