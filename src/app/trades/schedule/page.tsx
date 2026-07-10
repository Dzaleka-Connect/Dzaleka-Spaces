import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
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
  title: "Trade schedule",
};

export default async function TradeSchedulePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const scheduled = (await listMyWorkOrders(user.id)).filter((order) => order.scheduledFor);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Schedule</h1>
      {scheduled.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays />
            </EmptyMedia>
            <EmptyTitle>No scheduled work</EmptyTitle>
            <EmptyDescription>
              Work orders with confirmed times will appear in this schedule.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {scheduled.map((order) => (
            <li key={order.id} className="rounded-lg border p-4">
              <p className="font-medium">{order.ticketTitle}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(order.scheduledFor!).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
