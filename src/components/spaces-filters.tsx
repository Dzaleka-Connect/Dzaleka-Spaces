"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPACE_CATEGORIES, ZONES } from "@/lib/types";

const categoryItems = [
  { label: "All categories", value: null },
  ...SPACE_CATEGORIES.map((c) => ({ label: c.label, value: c.value as string })),
];

export function SpacesFilters({ zones = [...ZONES] }: { zones?: string[] }) {
  const zoneItems = [
    { label: "All zones", value: null },
    ...zones.map((z) => ({ label: z, value: z })),
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const hasFilters = searchParams.size > 0;

  return (
    <FieldGroup
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-pending={isPending || undefined}
    >
      <Field>
        <FieldLabel htmlFor="q">Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="q"
            placeholder="Landmark, keyword…"
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => setParam("q", e.target.value || null)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel>Category</FieldLabel>
        <Select
          items={categoryItems}
          value={searchParams.get("category")}
          onValueChange={(v) => setParam("category", v as string | null)}
        >
          <SelectTrigger>
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
          value={searchParams.get("zone")}
          onValueChange={(v) => setParam("zone", v as string | null)}
        >
          <SelectTrigger>
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
      <Field orientation="horizontal" className="items-end pb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="verified"
            checked={searchParams.get("verified") === "1"}
            onCheckedChange={(checked) =>
              setParam("verified", checked ? "1" : null)
            }
          />
          <FieldLabel htmlFor="verified">Verified only</FieldLabel>
        </div>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => router.replace(pathname))}
          >
            <X data-icon="inline-start" />
            Clear
          </Button>
        ) : null}
      </Field>
    </FieldGroup>
  );
}
