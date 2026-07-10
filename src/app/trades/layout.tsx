import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { featureEnabled } from "@/lib/features";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TradesLayout({ children }: { children: React.ReactNode }) {
  if (!(await featureEnabled("maintenance_marketplace"))) {
    redirect("/spaces");
  }

  return children;
}
