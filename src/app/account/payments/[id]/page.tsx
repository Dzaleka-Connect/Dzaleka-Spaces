import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PaymentRecordDocument } from "@/components/payment-record-document";
import { getSessionUser } from "@/lib/auth";
import { getPaymentForUser } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ReceiptHeader } from "./receipt-header";

export const metadata: Metadata = { title: "Payment record" };

export default async function AccountPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/account");
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const payment = await getPaymentForUser((await params).id, user.id);
  if (!payment) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <ReceiptHeader />
      <PaymentRecordDocument payment={payment} />
    </div>
  );
}
