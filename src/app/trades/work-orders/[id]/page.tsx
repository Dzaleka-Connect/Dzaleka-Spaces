import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MaintenanceDocumentUpload } from "@/components/maintenance-document-upload";
import { getSessionUser } from "@/lib/auth";
import { listMyWorkOrders } from "@/lib/trades";
import { completeWorkOrder } from "../../actions";

export const metadata: Metadata = {
  title: "Work order detail",
};

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ completed?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  const status = searchParams ? await searchParams : {};
  const order = (await listMyWorkOrders(user.id)).find((w) => w.id === id);
  if (!order) redirect("/trades/work-orders");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{order.ticketTitle}</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/trades/messages/${order.ticketId}`} />}
            nativeButton={false}
          >
            Messages
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/trades/documents" />}
            nativeButton={false}
          >
            Documents
          </Button>
        </div>
      </div>

      {status.completed ? (
        <Alert>
          <AlertTitle>Work order completed</AlertTitle>
          <AlertDescription>
            The requester can now leave a review from Trade reviews.
          </AlertDescription>
        </Alert>
      ) : null}
      {status.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not update</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge>{order.status}</Badge>
          </div>
          <CardTitle>Work order</CardTitle>
          <CardDescription>
            {order.scheduledFor
              ? new Date(order.scheduledFor).toLocaleString()
              : "Schedule not set"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {order.completionNotes ?? "No completion notes yet."}
          </p>
          {order.status !== "completed" ? (
            <form action={completeWorkOrder}>
              <input type="hidden" name="workOrderId" value={order.id} />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="completion-notes">
                    Completion notes
                  </FieldLabel>
                  <Textarea
                    id="completion-notes"
                    name="completionNotes"
                    rows={3}
                    placeholder="What was done. Do not include exact household coordinates."
                  />
                </Field>
                <Field>
                  <Button type="submit">Mark completed</Button>
                </Field>
              </FieldGroup>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Attach evidence</h2>
        <MaintenanceDocumentUpload
          ticketId={order.ticketId}
          workOrderId={order.id}
        />
      </div>
    </div>
  );
}
