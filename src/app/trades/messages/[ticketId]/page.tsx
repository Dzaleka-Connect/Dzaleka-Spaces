import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MaintenanceDocumentUpload } from "@/components/maintenance-document-upload";
import { MaintenanceThread } from "@/components/maintenance-thread";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getMaintenanceTicketAccess, listMaintenanceMessages } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Job messages",
};

export default async function TradeMessageThreadPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const { ticketId } = await params;
  const access = await getMaintenanceTicketAccess(ticketId, user);
  if (!access) notFound();

  const role = access.role ?? (isStaff(user) ? ("staff" as const) : null);
  if (!role) redirect("/trades/messages");

  const messages = await listMaintenanceMessages(ticketId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{access.title}</h1>
          <p className="mt-1 text-muted-foreground">
            Job status: {access.status.replace(/_/g, " ")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/trades/jobs/${ticketId}`} />}
          nativeButton={false}
        >
          Job brief
        </Button>
      </div>

      <MaintenanceThread ticketId={ticketId} initialMessages={messages} viewerRole={role} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Attach a document</h2>
        <MaintenanceDocumentUpload ticketId={ticketId} />
      </div>
    </div>
  );
}
