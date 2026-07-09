"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tenantConfirmPaymentAction } from "./actions";
import { toast } from "sonner";

export function TenantConfirmPaymentButton({ paymentId }: { paymentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const res = await tenantConfirmPaymentAction(paymentId);
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
