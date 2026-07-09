import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOccupancyForUser } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PrintContractClient } from "./print-client";

export const metadata: Metadata = {
  title: "Print Occupancy Record",
};

interface PrintOccupancyPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintOccupancyPage({ params }: PrintOccupancyPageProps) {
  if (!isSupabaseConfigured()) {
    redirect("/provider/occupancies");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const occupancy = await getOccupancyForUser(id, user.id);
  if (!occupancy) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PrintContractClient occupancy={occupancy} />
    </div>
  );
}
