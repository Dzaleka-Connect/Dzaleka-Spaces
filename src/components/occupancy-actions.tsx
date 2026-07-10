"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  cancelOccupancy,
  completeOccupancy,
  giveNotice,
  recordInPersonConfirmation,
} from "@/app/provider/occupancies/actions";
import { confirmOccupancy } from "@/app/account/occupancy/actions";
import type { OccupancyStatus } from "@/lib/occupancies";

type ActionResult = { ok: boolean; message: string };

function ActionButton({
  label,
  variant = "outline",
  action,
}: {
  label: string;
  variant?: "default" | "outline" | "destructive";
  action: () => Promise<ActionResult>;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {isPending ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}

export function ProviderOccupancyActions({
  occupancyId,
  status,
  occupantHasAccount,
  occupantConfirmed,
}: {
  occupancyId: string;
  status: OccupancyStatus;
  occupantHasAccount: boolean;
  occupantConfirmed: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "awaiting_occupant_confirmation" && !occupantHasAccount && !occupantConfirmed ? (
        <ActionButton
          label="Record in-person confirmation"
          variant="default"
          action={() => recordInPersonConfirmation(occupancyId)}
        />
      ) : null}
      {status === "active" ? (
        <ActionButton label="Record notice given" action={() => giveNotice(occupancyId)} />
      ) : null}
      {status === "active" || status === "notice_given" ? (
        <ActionButton label="Mark completed" action={() => completeOccupancy(occupancyId)} />
      ) : null}
      {status === "awaiting_occupant_confirmation" ? (
        <ActionButton
          label="Cancel record"
          variant="destructive"
          action={() => cancelOccupancy(occupancyId)}
        />
      ) : null}
    </div>
  );
}

export function OccupantConfirmButton({ occupancyId }: { occupancyId: string }) {
  return (
    <ActionButton
      label="Confirm this arrangement"
      variant="default"
      action={() => confirmOccupancy(occupancyId)}
    />
  );
}
