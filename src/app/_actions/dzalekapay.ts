"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { reconcileDzalekaPayPaymentForUser } from "@/lib/dzalekapay/reconciliation";

export interface DzalekaPayActionState {
  ok: boolean;
  message: string;
}

export async function reconcileDzalekaPayAction(
  paymentId: string,
  previousState: DzalekaPayActionState,
  formData: FormData
): Promise<DzalekaPayActionState> {
  void previousState;
  void formData;
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Sign in to check this payment." };

  const result = await reconcileDzalekaPayPaymentForUser(paymentId, user.id);
  revalidatePath(`/account/payments/${paymentId}`);
  revalidatePath(`/provider/payments/${paymentId}`);
  return { ok: result.ok, message: result.message };
}
