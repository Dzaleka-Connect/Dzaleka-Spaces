import { Badge } from "@/components/ui/badge";
import { OCCUPANCY_STATUS_LABELS, type OccupancyStatus } from "@/lib/occupancies";

const VARIANTS: Record<OccupancyStatus, "default" | "secondary" | "outline" | "destructive"> = {
  awaiting_occupant_confirmation: "secondary",
  active: "default",
  notice_given: "outline",
  completed: "outline",
  cancelled: "destructive",
  disputed: "destructive",
};

export function OccupancyStatusBadge({ status }: { status: OccupancyStatus }) {
  return (
    <Badge variant={VARIANTS[status] ?? "outline"}>
      {OCCUPANCY_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
