import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { listOccupanciesForOccupant } from "@/lib/occupancies";
import { listAllPaymentsForOccupant } from "@/lib/payments";
import { requireUser } from "@/lib/portal-auth";
import { listMyMaintenanceDocuments } from "@/lib/trades";

export const metadata: Metadata = { title: "Documents" };

export default async function AccountDocumentsPage() {
  const user = await requireUser();
  const [occupancies, payments, maintenance] = await Promise.all([
    listOccupanciesForOccupant(user.id),
    listAllPaymentsForOccupant(user.id),
    listMyMaintenanceDocuments(user.id),
  ]);
  const receipts = payments.filter((payment) => payment.receiptNumber);
  const empty = occupancies.length === 0 && receipts.length === 0 && maintenance.length === 0;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Occupancy records, confirmed payment receipts and maintenance files you can access.
        </p>
      </header>
      {empty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No documents</EmptyTitle>
            <EmptyDescription>
              Documents appear after an occupancy, confirmed payment or maintenance upload is
              recorded.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {occupancies.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Occupancy records</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {occupancies.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {item.spaceZone} · {item.spaceLandmark}
                  </CardTitle>
                  <CardDescription>
                    Started {item.startDate} · {item.status.replace(/_/g, " ")}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/spaces/occupancy/${item.id}/print`} />}
                    nativeButton={false}
                  >
                    Open printable record
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      {receipts.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Payment receipts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {receipts.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">{item.receiptNumber}</CardTitle>
                  <CardDescription>
                    {item.paymentDate} · {item.spaceTitle}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/account/payments/${item.id}`} />}
                    nativeButton={false}
                  >
                    Open receipt
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      {maintenance.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Maintenance files</h2>
          <div className="flex flex-col gap-2">
            {maintenance.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{item.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.ticketTitle} · {item.kind}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/api/maintenance-documents/${item.id}`} />}
                    nativeButton={false}
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
