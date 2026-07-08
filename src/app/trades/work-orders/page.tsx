import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Hammer, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { getSessionUser } from "@/lib/auth";
import { listMyWorkOrders } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Work orders",
};

export default async function WorkOrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const orders = await listMyWorkOrders(user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Work orders</h1>
        <p className="mt-1 text-muted-foreground">
          Assigned maintenance jobs and completion status.
        </p>
      </div>

      {orders.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No assigned work orders</EmptyTitle>
            <EmptyDescription>
              Accepted quotes become work orders after requester or staff
              confirmation.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{order.ticketTitle}</CardTitle>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
                <CardDescription>
                  {order.scheduledFor
                    ? new Date(order.scheduledFor).toLocaleString()
                    : "Schedule not set"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  render={<Link href={`/trades/work-orders/${order.id}`} />}
                  nativeButton={false}
                >
                  <Hammer data-icon="inline-start" />
                  Open work order
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
