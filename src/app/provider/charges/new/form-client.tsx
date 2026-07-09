"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createChargeAction } from "../actions";
import type { OccupancyRecord } from "@/lib/occupancies";
import { categoryLabel } from "@/lib/types";
import { toast } from "sonner";

export function CreateChargeForm({ occupancies }: { occupancies: OccupancyRecord[] }) {
  const router = useRouter();
  const [_state, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const res = await createChargeAction(prevState, formData);
      if (res.ok) {
        toast.success(res.message);
        router.push("/provider/charges");
      } else {
        toast.error(res.message);
      }
      return res;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="occupancyId">Tenant & Space</Label>
        <select
          id="occupancyId"
          name="occupancyId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {occupancies.map((o) => {
            const occupant = o.parties.find((p) => p.role === "occupant");
            return (
              <option key={o.id} value={o.id}>
                {occupant?.fullName ?? "Tenant"} — {categoryLabel(o.spaceCategory)} ({o.spaceZone})
              </option>
            );
          })}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (MWK)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          required
          placeholder="e.g. 25000"
          min="1"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description / Notes</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="e.g. Monthly rent for August, Electricity bill adjustment"
          disabled={isPending}
          maxLength={500}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Scheduling..." : "Schedule Charge"}
      </Button>
    </form>
  );
}
