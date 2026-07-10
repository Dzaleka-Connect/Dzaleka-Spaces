/* eslint-disable @typescript-eslint/no-explicit-any */
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export type PaymentMethod =
  | "cash"
  | "airtel_money"
  | "tnm_mpamba"
  | "dzalekapay"
  | "bank_transfer"
  | "organisation"
  | "other";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "cash",
  "airtel_money",
  "tnm_mpamba",
  "dzalekapay",
  "bank_transfer",
  "organisation",
  "other",
];

export type PaymentStatus = "pending_confirmation" | "confirmed" | "disputed" | "rejected";

export type ChargeStatus = "unpaid" | "partially_paid" | "paid" | "void";

export interface ChargeRecord {
  id: string;
  occupancyId: string;
  amountMwk: number;
  dueDate: string;
  status: ChargeStatus;
  description: string | null;
  createdAt: string;
  spaceTitle?: string;
  spaceZone?: string;
}

export interface PaymentRecord {
  id: string;
  occupancyId: string;
  payerId: string | null;
  amountMwk: number;
  paymentDate: string;
  method: PaymentMethod;
  externalReference: string | null;
  providerConfirmedAt: string | null;
  payerConfirmedAt: string | null;
  status: PaymentStatus;
  notes: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  receiptNumber?: string | null;
  receiptVerificationCode?: string | null;
  receiptIssuedAt?: string | null;
  disputeReason?: string | null;
  spaceTitle?: string;
  spaceZone?: string;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  chargeId: string;
  amountMwk: number;
  createdAt: string;
}

export interface LedgerBalance {
  totalChargedMwk: number;
  totalPaidMwk: number;
  balanceMwk: number;
  totalDepositChargedMwk: number;
  totalDepositPaidMwk: number;
}

function mapPayment(p: any): PaymentRecord {
  const receiptValue = p.payment_receipts;
  const receipt = Array.isArray(receiptValue) ? receiptValue[0] : receiptValue;

  return {
    id: p.id,
    occupancyId: p.occupancy_id,
    payerId: p.payer_id,
    amountMwk: p.amount_mwk,
    paymentDate: p.payment_date,
    method: p.method,
    externalReference: p.external_reference,
    providerConfirmedAt: p.provider_confirmed_at,
    payerConfirmedAt: p.payer_confirmed_at,
    status: p.status,
    notes: p.notes,
    createdAt: p.created_at,
    confirmedAt: p.confirmed_at ?? null,
    receiptNumber: receipt?.receipt_number ?? null,
    receiptVerificationCode: receipt?.verification_code ?? null,
    receiptIssuedAt: receipt?.issued_at ?? null,
    disputeReason: p.dispute_reason ?? null,
  };
}

// ---------------------------------------------------------------------------
// Charges APIs
// ---------------------------------------------------------------------------

export async function createCharge(
  occupancyId: string,
  amountMwk: number,
  dueDate: string,
  description: string | undefined,
  idempotencyKey: string
): Promise<{ ok: boolean; error?: string; charge?: ChargeRecord }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  const { data: chargeId, error } = await supabase.rpc("ledger_create_charge", {
    occupancy: occupancyId,
    amount_mwk: amountMwk,
    due_on: dueDate,
    charge_description: description ?? null,
    idempotency: idempotencyKey,
  });

  if (error) {
    console.error("createCharge failed:", error.message);
    return { ok: false, error: error.message };
  }

  const { data, error: chargeError } = await supabase
    .from("charges")
    .select("id, occupancy_id, amount_mwk, due_date, status, description, created_at")
    .eq("id", chargeId)
    .single();

  if (chargeError || !data) {
    console.error("createCharge lookup failed:", chargeError?.message);
    return { ok: false, error: "The charge was created but could not be loaded." };
  }

  return {
    ok: true,
    charge: {
      id: data.id,
      occupancyId: data.occupancy_id,
      amountMwk: data.amount_mwk,
      dueDate: data.due_date,
      status: data.status,
      description: data.description,
      createdAt: data.created_at,
    },
  };
}

export async function listChargesForOccupancy(occupancyId: string): Promise<ChargeRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("id, occupancy_id, amount_mwk, due_date, status, description, created_at")
    .eq("occupancy_id", occupancyId)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("listChargesForOccupancy failed:", error.message);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    occupancyId: c.occupancy_id,
    amountMwk: c.amount_mwk,
    dueDate: c.due_date,
    status: c.status,
    description: c.description,
    createdAt: c.created_at,
  }));
}

export async function voidCharge(
  chargeId: string,
  reason = "Voided by the space provider"
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("ledger_void_charge", {
    charge: chargeId,
    reason,
  });

  if (error) {
    console.error("voidCharge failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Payment Records APIs
// ---------------------------------------------------------------------------

export async function recordPayment(
  occupancyId: string,
  payerId: string | null,
  amountMwk: number,
  paymentDate: string,
  method: PaymentMethod,
  externalReference?: string,
  notes?: string,
  initiallyConfirmedBy: "provider" | "payer" = "provider",
  idempotencyKey?: string
): Promise<{ ok: boolean; error?: string; payment?: PaymentRecord }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  void payerId;
  void initiallyConfirmedBy;
  const { data: paymentId, error } = await supabase.rpc("ledger_record_payment", {
    occupancy: occupancyId,
    amount_mwk: amountMwk,
    paid_on: paymentDate,
    payment_method: method,
    external_reference: externalReference || null,
    payment_notes: notes || null,
    idempotency: idempotencyKey ?? crypto.randomUUID(),
  });

  if (error) {
    console.error("recordPayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  const { data, error: readError } = await supabase
    .from("payment_records")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (readError) {
    console.error("recordPayment read-back failed:", readError.message);
    return { ok: false, error: "Payment was recorded but could not be loaded." };
  }

  return { ok: true, payment: mapPayment(data) };
}

export async function confirmPayment(
  paymentId: string,
  confirmerRole: "provider" | "occupant"
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  void confirmerRole;
  const { error } = await supabase.rpc("ledger_confirm_payment", {
    payment: paymentId,
  });

  if (error) {
    console.error("confirmPayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function rejectPayment(
  paymentId: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("ledger_reject_payment", {
    payment: paymentId,
    reason: notes || "Rejected by the space provider",
  });

  if (error) {
    console.error("rejectPayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function disputePayment(
  paymentId: string,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("ledger_dispute_payment", {
    payment: paymentId,
    reason: notes,
  });

  if (error) {
    console.error("disputePayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function listPaymentsForOccupancy(occupancyId: string): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*, payment_receipts(receipt_number, verification_code, issued_at)")
    .eq("occupancy_id", occupancyId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("listPaymentsForOccupancy failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapPayment);
}

// ---------------------------------------------------------------------------
// Balance & Ledgers APIs
// ---------------------------------------------------------------------------

export async function getOccupancyBalance(occupancyId: string): Promise<LedgerBalance> {
  const result: LedgerBalance = {
    totalChargedMwk: 0,
    totalPaidMwk: 0,
    balanceMwk: 0,
    totalDepositChargedMwk: 0,
    totalDepositPaidMwk: 0,
  };

  if (!isSupabaseConfigured()) return result;

  const supabase = await createClient();

  // Get total charged
  const { data: charges } = await supabase
    .from("charges")
    .select("amount_mwk, description")
    .eq("occupancy_id", occupancyId)
    .neq("status", "void");

  // Get total paid (must be confirmed)
  const { data: payments } = await supabase
    .from("payment_records")
    .select("amount_mwk, notes")
    .eq("occupancy_id", occupancyId)
    .eq("status", "confirmed");

  // Get deposit terms
  const { data: occupancy } = await supabase
    .from("occupancies")
    .select("deposit_amount_mwk")
    .eq("id", occupancyId)
    .maybeSingle();

  if (charges) {
    for (const c of charges) {
      if (c.description?.toLowerCase().includes("deposit")) {
        result.totalDepositChargedMwk += c.amount_mwk;
      } else {
        result.totalChargedMwk += c.amount_mwk;
      }
    }
  }

  if (payments) {
    for (const p of payments) {
      if (p.notes?.toLowerCase().includes("deposit")) {
        result.totalDepositPaidMwk += p.amount_mwk;
      } else {
        result.totalPaidMwk += p.amount_mwk;
      }
    }
  }

  // Fallback: if no custom "deposit" charge exists but occupancy has deposit, add to deposit balance
  if (result.totalDepositChargedMwk === 0 && occupancy?.deposit_amount_mwk) {
    result.totalDepositChargedMwk = occupancy.deposit_amount_mwk;
  }

  result.balanceMwk = result.totalChargedMwk - result.totalPaidMwk;
  return result;
}

// ---------------------------------------------------------------------------
// Cross-Occupancy / Profile APIs
// ---------------------------------------------------------------------------

export async function listAllChargesForProvider(providerId: string): Promise<ChargeRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .select(
      "id, occupancy_id, amount_mwk, due_date, status, description, created_at, occupancies!inner(provider_id, spaces(category, landmark, zones(name)))"
    )
    .eq("occupancies.provider_id", providerId)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("listAllChargesForProvider failed:", error.message);
    return [];
  }

  return (data ?? []).map((c: any) => ({
    id: c.id,
    occupancyId: c.occupancy_id,
    amountMwk: c.amount_mwk,
    dueDate: c.due_date,
    status: c.status,
    description: c.description,
    createdAt: c.created_at,
    spaceTitle: c.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: c.occupancies?.spaces?.zones?.name ?? "",
  }));
}

export async function listAllPaymentsForProvider(providerId: string): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select(
      "*, payment_receipts(receipt_number, verification_code, issued_at), occupancies!inner(provider_id, spaces(category, landmark, zones(name)))"
    )
    .eq("occupancies.provider_id", providerId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("listAllPaymentsForProvider failed:", error.message);
    return [];
  }

  return (data ?? []).map((p: any) => ({
    ...mapPayment(p),
    spaceTitle: p.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: p.occupancies?.spaces?.zones?.name ?? "",
  }));
}

export async function listAllChargesForOccupant(occupantId: string): Promise<ChargeRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  // Get occupancy IDs where user is the occupant party
  const { data: partyRows } = await supabase
    .from("occupancy_parties")
    .select("occupancy_id")
    .eq("user_id", occupantId)
    .eq("role", "occupant");

  const ids = [...new Set((partyRows ?? []).map((p) => p.occupancy_id))];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("charges")
    .select(
      "id, occupancy_id, amount_mwk, due_date, status, description, created_at, occupancies!inner(spaces(category, landmark, zones(name)))"
    )
    .in("occupancy_id", ids)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("listAllChargesForOccupant failed:", error.message);
    return [];
  }

  return (data ?? []).map((c: any) => ({
    id: c.id,
    occupancyId: c.occupancy_id,
    amountMwk: c.amount_mwk,
    dueDate: c.due_date,
    status: c.status,
    description: c.description,
    createdAt: c.created_at,
    spaceTitle: c.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: c.occupancies?.spaces?.zones?.name ?? "",
  }));
}

export async function listAllPaymentsForOccupant(occupantId: string): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: partyRows } = await supabase
    .from("occupancy_parties")
    .select("occupancy_id")
    .eq("user_id", occupantId)
    .eq("role", "occupant");

  const ids = [...new Set((partyRows ?? []).map((p) => p.occupancy_id))];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("payment_records")
    .select(
      "*, payment_receipts(receipt_number, verification_code, issued_at), occupancies!inner(spaces(category, landmark, zones(name)))"
    )
    .in("occupancy_id", ids)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("listAllPaymentsForOccupant failed:", error.message);
    return [];
  }

  return (data ?? []).map((p: any) => ({
    ...mapPayment(p),
    spaceTitle: p.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: p.occupancies?.spaces?.zones?.name ?? "",
  }));
}

export async function getPaymentForUser(
  paymentId: string,
  userId: string
): Promise<PaymentRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select(
      "*, payment_receipts(receipt_number, verification_code, issued_at), occupancies!inner(provider_id, spaces(category, landmark, zones(name)), occupancy_parties(user_id))"
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getPaymentForUser failed:", error.message);
    return null;
  }

  const matchesUser =
    data.occupancies?.provider_id === userId ||
    data.payer_id === userId ||
    (data.occupancies?.occupancy_parties ?? []).some((p: any) => p.user_id === userId);

  if (!matchesUser) return null;

  return {
    ...mapPayment(data),
    spaceTitle: data.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: data.occupancies?.spaces?.zones?.name ?? "",
  };
}
