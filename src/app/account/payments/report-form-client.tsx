"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PaymentEntryFields } from "@/components/payment-entry-fields";
import type { OccupancyRecord } from "@/lib/occupancies";
import { occupantRecordPaymentAction } from "./actions";

export function ReportPaymentForm({
  occupancies,
  idempotencyKey,
}: {
  occupancies: OccupancyRecord[];
  idempotencyKey: string;
}) {
  const router = useRouter();
  const [, formAction, isPending] = useActionState(
    async (previous: unknown, formData: FormData) => {
      const result = await occupantRecordPaymentAction(previous, formData);
      if (result.ok) {
        toast.success(result.message);
        router.push("/account/payments");
      } else {
        toast.error(result.message);
      }
      return result;
    },
    null
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <PaymentEntryFields occupancies={occupancies} audience="occupant" pending={isPending} />
    </form>
  );
}
