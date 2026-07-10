"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACILITIES, SPACE_CATEGORIES, ZONES } from "@/lib/types";

const categories = [
  { label: "All categories", value: "all" },
  ...SPACE_CATEGORIES.map((item) => ({ label: item.label, value: item.value as string })),
];
const billing = [
  { label: "Any billing period", value: "all" },
  { label: "Per day", value: "daily" },
  { label: "Per month", value: "monthly" },
];
const sorting = [
  { label: "Most relevant", value: "relevance" },
  { label: "Most recent", value: "recent" },
  { label: "Lowest amount", value: "price_asc" },
  { label: "Highest amount", value: "price_desc" },
  { label: "Recently verified", value: "verified_recent" },
  { label: "Available soon", value: "available_soon" },
];
const recent = [
  { label: "Any verification date", value: "all" },
  { label: "Checked in 7 days", value: "7" },
  { label: "Checked in 30 days", value: "30" },
  { label: "Checked in 90 days", value: "90" },
];

export function SpacesFilters({ zones = [...ZONES] }: { zones?: string[] }) {
  const params = useSearchParams();
  const zoneItems = [
    { label: "All zones", value: "all" },
    ...zones.map((zone) => ({ label: zone, value: zone })),
  ];
  const facilities = new Set(params.getAll("facility"));
  const hasAdvanced = ["min", "max", "billing", "available", "rooms", "facility", "recent"].some(
    (key) => params.has(key)
  );

  return (
    <form action="/spaces" method="get" className="w-full border bg-card p-4">
      <FieldGroup>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="space-query">Search</FieldLabel>
            <Input
              id="space-query"
              name="q"
              defaultValue={params.get("q") ?? ""}
              placeholder="Landmark, zone or keyword"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="space-category">Category</FieldLabel>
            <Select
              name="category"
              items={categories}
              defaultValue={params.get("category") ?? "all"}
            >
              <SelectTrigger id="space-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="space-zone">Zone</FieldLabel>
            <Select name="zone" items={zoneItems} defaultValue={params.get("zone") ?? "all"}>
              <SelectTrigger id="space-zone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {zoneItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="space-sort">Sort</FieldLabel>
            <Select name="sort" items={sorting} defaultValue={params.get("sort") ?? "relevance"}>
              <SelectTrigger id="space-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sorting.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Collapsible defaultOpen={hasAdvanced}>
          <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
            <SlidersHorizontal data-icon="inline-start" />
            More filters
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="min-price">Minimum amount (MWK)</FieldLabel>
                <Input
                  id="min-price"
                  name="min"
                  type="number"
                  min="0"
                  defaultValue={params.get("min") ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="max-price">Maximum amount (MWK)</FieldLabel>
                <Input
                  id="max-price"
                  name="max"
                  type="number"
                  min="0"
                  defaultValue={params.get("max") ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="billing-period">Billing period</FieldLabel>
                <Select
                  name="billing"
                  items={billing}
                  defaultValue={params.get("billing") ?? "all"}
                >
                  <SelectTrigger id="billing-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {billing.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="available-by">Available by</FieldLabel>
                <Input
                  id="available-by"
                  name="available"
                  type="date"
                  defaultValue={params.get("available") ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="minimum-rooms">Minimum rooms</FieldLabel>
                <Input
                  id="minimum-rooms"
                  name="rooms"
                  type="number"
                  min="1"
                  max="50"
                  defaultValue={params.get("rooms") ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recent-verification">Verification date</FieldLabel>
                <Select name="recent" items={recent} defaultValue={params.get("recent") ?? "all"}>
                  <SelectTrigger id="recent-verification">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {recent.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal" className="items-end pb-2">
                <Checkbox
                  id="verified-only"
                  name="verified"
                  value="1"
                  defaultChecked={params.get("verified") === "1"}
                />
                <FieldLabel htmlFor="verified-only">Verified only</FieldLabel>
              </Field>
            </div>
            <FieldSet className="mt-5">
              <FieldLegend>Facilities</FieldLegend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {FACILITIES.map((facility) => (
                  <Field key={facility.value} orientation="horizontal">
                    <Checkbox
                      id={`facility-${facility.value}`}
                      name="facility"
                      value={facility.value}
                      defaultChecked={facilities.has(facility.value)}
                    />
                    <FieldLabel htmlFor={`facility-${facility.value}`} className="font-normal">
                      {facility.label}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </FieldSet>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Apply filters</Button>
          {params.size ? (
            <Button variant="ghost" render={<Link href="/spaces" />} nativeButton={false}>
              <X data-icon="inline-start" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
