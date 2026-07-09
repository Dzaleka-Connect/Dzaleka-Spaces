"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmPaymentAction } from "./actions";
import { toast } from "sonner";

export function ConfirmPaymentButton({ paymentId, occupancyId }: { paymentId: string; occupancyId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const res = await confirmPaymentAction(paymentId, occupancyId);
      if (res.ok) {
        toast.success("Payment confirmed!");
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-success border-success/30 hover:bg-success/10"
      onClick={handleConfirm}
      disabled={isPending}
    >
      <Check className="size-4 mr-1" />
      Confirm
    </Button>
  );
}
