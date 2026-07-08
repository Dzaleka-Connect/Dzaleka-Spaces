import { redirect } from "next/navigation";
import { featureEnabled } from "@/lib/features";

export default async function TradesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await featureEnabled("maintenance_marketplace"))) {
    redirect("/spaces");
  }

  return children;
}
