import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { listMyWorkOrders } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Work order detail",
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  const order = (await listMyWorkOrders(user.id)).find((w) => w.id === id);
  if (!order) redirect("/trades/work-orders");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">{order.ticketTitle}</h1>
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
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {order.completionNotes ?? "No completion notes yet."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
