"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMaintenanceTicketAction } from "../actions";
import type { OccupancyRecord } from "@/lib/occupancies";
import { categoryLabel, TRADE_CATEGORIES } from "@/lib/types";
import { toast } from "sonner";

export function CreateTicketForm({ occupancies }: { occupancies: OccupancyRecord[] }) {
  const router = useRouter();
  const [_state, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      const res = await createMaintenanceTicketAction(prevState, formData);
      if (res.ok) {
        toast.success(res.message);
        router.push("/account/maintenance");
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
        <Label htmlFor="occupancyId">Associated Space</Label>
        <select
          id="occupancyId"
          name="occupancyId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {occupancies.map((o) => (
            <option key={o.id} value={o.id}>
              {categoryLabel(o.spaceCategory)} ({o.spaceZone}) — {o.spaceLandmark}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Job Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. Leaking pipe in bathroom, Broken front door lock"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Service Category</Label>
        <select
          id="category"
          name="category"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {TRADE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="priority">Urgency / Priority</Label>
        <select
          id="priority"
          name="priority"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="low">Low (Non-urgent check)</option>
          <option value="normal">Normal (Standard repair)</option>
          <option value="urgent">Urgent (Immediate safety or hazard issue)</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Detailed Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          placeholder="Describe exactly what needs fixing, where it is located inside the space, and any details."
          disabled={isPending}
          rows={5}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Submitting..." : "Submit Maintenance Request"}
      </Button>
    </form>
  );
}
