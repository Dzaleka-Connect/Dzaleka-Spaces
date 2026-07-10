"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { grantRole, revokeRole } from "@/app/admin/users/actions";

const ROLE_OPTIONS = [
  { label: "Grant role…", value: null },
  { label: "provider", value: "provider" },
  { label: "field verifier", value: "field_verifier" },
  { label: "service provider", value: "service_provider" },
  { label: "organisation manager", value: "organisation_manager" },
  { label: "moderator", value: "moderator" },
  { label: "finance", value: "finance" },
  { label: "admin", value: "admin" },
];

export function RoleManager({
  userId,
  roles,
  canEdit,
}: {
  userId: string;
  roles: string[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setSelected(null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((role) => (
        <Badge key={role} variant="secondary" className="gap-1">
          {role.replace(/_/g, " ")}
          {canEdit ? (
            <button
              type="button"
              aria-label={`Revoke ${role}`}
              className="ml-0.5 opacity-60 hover:opacity-100"
              disabled={isPending}
              onClick={() => run(() => revokeRole(userId, role))}
            >
              <X className="size-3" />
            </button>
          ) : null}
        </Badge>
      ))}
      {canEdit ? (
        <div className="flex items-center gap-1">
          <Select
            items={ROLE_OPTIONS}
            value={selected}
            onValueChange={(v) => setSelected(v as string | null)}
          >
            <SelectTrigger size="sm" className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ROLE_OPTIONS.map((item) => (
                  <SelectItem key={String(item.value)} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            disabled={isPending || !selected}
            onClick={() => selected && run(() => grantRole(userId, selected))}
          >
            {isPending ? <Spinner /> : "Grant"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
