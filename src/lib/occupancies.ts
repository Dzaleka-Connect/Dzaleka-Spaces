import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type OccupancyStatus =
  | "awaiting_occupant_confirmation"
  | "active"
  | "notice_given"
  | "completed"
  | "cancelled"
  | "disputed";

export const OCCUPANCY_STATUS_LABELS: Record<OccupancyStatus, string> = {
  awaiting_occupant_confirmation: "Awaiting occupant confirmation",
  active: "Active",
  notice_given: "Notice given",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export interface OccupancyParty {
  id: string;
  userId: string | null;
  role: "provider" | "occupant";
  fullName: string;
  contact: string | null;
  confirmedAt: string | null;
  confirmationMethod: string | null;
}

export interface OccupancyRecord {
  id: string;
  spaceId: string;
  listingId: string | null;
  providerId: string;
  status: OccupancyStatus;
  startDate: string;
  expectedEndDate: string | null;
  billingPeriod: "daily" | "monthly";
  agreedAmountMwk: number;
  depositAmountMwk: number | null;
  paymentDueDay: number | null;
  noticePeriodDays: number | null;
  includedServices: string | null;
  notes: string | null;
  createdAt: string;
  activatedAt: string | null;
  closedAt: string | null;
  spaceLandmark: string;
  spaceZone: string;
  spaceCategory: string;
  parties: OccupancyParty[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToOccupancy(row: any, parties: any[]): OccupancyRecord {
  const space = row.spaces as any;
  return {
    id: row.id,
    spaceId: row.space_id,
    listingId: row.listing_id,
    providerId: row.provider_id,
    status: row.status,
    startDate: row.start_date,
    expectedEndDate: row.expected_end_date,
    billingPeriod: row.billing_period,
    agreedAmountMwk: row.agreed_amount_mwk,
    depositAmountMwk: row.deposit_amount_mwk,
    paymentDueDay: row.payment_due_day,
    noticePeriodDays: row.notice_period_days,
    includedServices: row.included_services,
    notes: row.notes,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    closedAt: row.closed_at,
    spaceLandmark: space?.landmark ?? "",
    spaceZone: space?.zones?.name ?? "",
    spaceCategory: space?.category ?? "",
    parties: parties.map((p) => ({
      id: p.id,
      userId: p.user_id,
      role: p.role,
      fullName: p.full_name,
      contact: p.contact,
      confirmedAt: p.confirmed_at,
      confirmationMethod: p.confirmation_method,
    })),
  };
}

const OCCUPANCY_SELECT =
  "id, space_id, listing_id, provider_id, status, start_date, expected_end_date, billing_period, agreed_amount_mwk, deposit_amount_mwk, payment_due_day, notice_period_days, included_services, notes, created_at, activated_at, closed_at, spaces(category, landmark, zones(name))";

async function attachParties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: any[]
): Promise<OccupancyRecord[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: parties } = await supabase
    .from("occupancy_parties")
    .select(
      "id, occupancy_id, user_id, role, full_name, contact, confirmed_at, confirmation_method"
    )
    .in("occupancy_id", ids);
  return rows.map((r) =>
    rowToOccupancy(
      r,
      (parties ?? []).filter((p) => p.occupancy_id === r.id)
    )
  );
}

export async function listOccupanciesForProvider(userId: string): Promise<OccupancyRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occupancies")
    .select(OCCUPANCY_SELECT)
    .eq("provider_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listOccupanciesForProvider failed:", error.message);
    return [];
  }
  return attachParties(supabase, data ?? []);
}

export async function listOccupanciesForOccupant(userId: string): Promise<OccupancyRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: partyRows } = await supabase
    .from("occupancy_parties")
    .select("occupancy_id")
    .eq("user_id", userId)
    .eq("role", "occupant");
  const ids = [...new Set((partyRows ?? []).map((p) => p.occupancy_id))];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("occupancies")
    .select(OCCUPANCY_SELECT)
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listOccupanciesForOccupant failed:", error.message);
    return [];
  }
  return attachParties(supabase, data ?? []);
}

export async function getOccupancyForUser(
  occupancyId: string,
  userId: string
): Promise<OccupancyRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occupancies")
    .select(OCCUPANCY_SELECT)
    .eq("id", occupancyId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("getOccupancyForUser failed:", error.message);
    return null;
  }
  const [record] = await attachParties(supabase, [data]);
  const involved = record.providerId === userId || record.parties.some((p) => p.userId === userId);
  return involved ? record : null;
}
