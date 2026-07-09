"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voidChargeAction } from "./actions";
import { toast } from "sonner";

export function VoidChargeButton({ chargeId, occupancyId }: { chargeId: string; occupancyId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleVoid = () => {
    if (!confirm("Are you sure you want to void this charge? This will delete allocations and cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      const res = await voidChargeAction(chargeId, occupancyId);
      if (res.ok) {
        toast.success("Charge voided successfully.");
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleVoid}
      disabled={isPending}
    >
      <Trash2 className="size-4 mr-1" />
      Void
    </Button>
  );
}
