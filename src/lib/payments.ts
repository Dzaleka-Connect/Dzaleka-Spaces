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

export type PaymentStatus =
  | "pending_confirmation"
  | "confirmed"
  | "disputed"
  | "rejected";

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

// ---------------------------------------------------------------------------
// Charges APIs
// ---------------------------------------------------------------------------

export async function createCharge(
  occupancyId: string,
  amountMwk: number,
  dueDate: string,
  description?: string
): Promise<{ ok: boolean; error?: string; charge?: ChargeRecord }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .insert({
      occupancy_id: occupancyId,
      amount_mwk: amountMwk,
      due_date: dueDate,
      description: description ?? null,
      status: "unpaid",
    })
    .select("id, occupancy_id, amount_mwk, due_date, status, description, created_at")
    .single();

  if (error) {
    console.error("createCharge failed:", error.message);
    return { ok: false, error: error.message };
  }

  // Attempt to auto-allocate any confirmed unallocated payments
  await runAutoAllocationForOccupancy(occupancyId);

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

export async function listChargesForOccupancy(
  occupancyId: string
): Promise<ChargeRecord[]> {
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
  chargeId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const supabase = await createClient();
  
  // First, delete allocations associated with this charge
  await supabase.from("payment_allocations").delete().eq("charge_id", chargeId);

  const { error } = await supabase
    .from("charges")
    .update({ status: "void" })
    .eq("id", chargeId);

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
  initiallyConfirmedBy: "provider" | "payer" = "provider"
): Promise<{ ok: boolean; error?: string; payment?: PaymentRecord }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database not configured." };
  }

  const isProvider = initiallyConfirmedBy === "provider";
  const now = new Date().toISOString();

  const status: PaymentStatus = "pending_confirmation"; // Double confirmation required

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .insert({
      occupancy_id: occupancyId,
      payer_id: payerId,
      amount_mwk: amountMwk,
      payment_date: paymentDate,
      method,
      external_reference: externalReference ?? null,
      notes: notes ?? null,
      status,
      provider_confirmed_at: isProvider ? now : null,
      payer_confirmed_at: !isProvider ? now : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("recordPayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    payment: {
      id: data.id,
      occupancyId: data.occupancy_id,
      payerId: data.payer_id,
      amountMwk: data.amount_mwk,
      paymentDate: data.payment_date,
      method: data.method,
      externalReference: data.external_reference,
      providerConfirmedAt: data.provider_confirmed_at,
      payerConfirmedAt: data.payer_confirmed_at,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
    },
  };
}

export async function confirmPayment(
  paymentId: string,
  confirmerRole: "provider" | "occupant"
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Fetch the current payment details
  const { data: payment, error: fetchErr } = await supabase
    .from("payment_records")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchErr || !payment) {
    return { ok: false, error: fetchErr?.message ?? "Payment not found." };
  }

  const updates: any = {};
  if (confirmerRole === "provider") {
    updates.provider_confirmed_at = now;
  } else {
    updates.payer_confirmed_at = now;
  }

  // If both parties have now confirmed, mark status as confirmed
  if (
    (confirmerRole === "provider" && payment.payer_confirmed_at) ||
    (confirmerRole === "occupant" && payment.provider_confirmed_at)
  ) {
    updates.status = "confirmed";
  }

  const { error } = await supabase
    .from("payment_records")
    .update(updates)
    .eq("id", paymentId);

  if (error) {
    console.error("confirmPayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  // If status is newly confirmed, run auto-allocation
  if (updates.status === "confirmed" || payment.status === "confirmed") {
    await runAutoAllocationForOccupancy(payment.occupancy_id);
  }

  return { ok: true };
}

export async function rejectPayment(
  paymentId: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_records")
    .update({
      status: "rejected",
      notes: notes ? `Rejected: ${notes}` : "Rejected by party",
    })
    .eq("id", paymentId);

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
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_records")
    .update({
      status: "disputed",
      notes: `Disputed: ${notes}`,
    })
    .eq("id", paymentId);

  if (error) {
    console.error("disputePayment failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function listPaymentsForOccupancy(
  occupancyId: string
): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*")
    .eq("occupancy_id", occupancyId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("listPaymentsForOccupancy failed:", error.message);
    return [];
  }

  return (data ?? []).map((p) => ({
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
  }));
}

// ---------------------------------------------------------------------------
// Balance & Ledgers APIs
// ---------------------------------------------------------------------------

export async function getOccupancyBalance(
  occupancyId: string
): Promise<LedgerBalance> {
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

export async function listAllChargesForProvider(
  providerId: string
): Promise<ChargeRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("id, occupancy_id, amount_mwk, due_date, status, description, created_at, occupancies!inner(provider_id, spaces(category, landmark, zones(name)))")
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

export async function listAllPaymentsForProvider(
  providerId: string
): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*, occupancies!inner(provider_id, spaces(category, landmark, zones(name)))")
    .eq("occupancies.provider_id", providerId)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("listAllPaymentsForProvider failed:", error.message);
    return [];
  }

  return (data ?? []).map((p: any) => ({
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
    spaceTitle: p.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: p.occupancies?.spaces?.zones?.name ?? "",
  }));
}

export async function listAllChargesForOccupant(
  occupantId: string
): Promise<ChargeRecord[]> {
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
    .select("id, occupancy_id, amount_mwk, due_date, status, description, created_at, occupancies!inner(spaces(category, landmark, zones(name)))")
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

export async function listAllPaymentsForOccupant(
  occupantId: string
): Promise<PaymentRecord[]> {
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
    .select("*, occupancies!inner(spaces(category, landmark, zones(name)))")
    .in("occupancy_id", ids)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("listAllPaymentsForOccupant failed:", error.message);
    return [];
  }

  return (data ?? []).map((p: any) => ({
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
    spaceTitle: p.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: p.occupancies?.spaces?.zones?.name ?? "",
  }));
}

// ---------------------------------------------------------------------------
// Auto Allocation Engine (FIFO)
// ---------------------------------------------------------------------------

export async function runAutoAllocationForOccupancy(
  occupancyId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = await createClient();

  // 1. Get total confirmed payments
  const { data: confirmedPayments } = await supabase
    .from("payment_records")
    .select("id, amount_mwk")
    .eq("occupancy_id", occupancyId)
    .eq("status", "confirmed");

  if (!confirmedPayments || confirmedPayments.length === 0) return;

  // 2. Get active charges (excluding void) ordered oldest to newest
  const { data: charges } = await supabase
    .from("charges")
    .select("id, amount_mwk")
    .eq("occupancy_id", occupancyId)
    .neq("status", "void")
    .order("due_date", { ascending: true });

  if (!charges || charges.length === 0) return;

  // 3. Clear existing allocations for confirmed payments & charges for this occupancy
  // to run a clean, correct FIFO allocation rebuild
  const paymentIds = confirmedPayments.map((p) => p.id);
  await supabase
    .from("payment_allocations")
    .delete()
    .in("payment_id", paymentIds);

  // 4. Perform FIFO Allocation
  let chargeIdx = 0;
  let chargeRemaining = charges[0].amount_mwk;

  for (const payment of confirmedPayments) {
    let paymentRemaining = payment.amount_mwk;

    while (paymentRemaining > 0 && chargeIdx < charges.length) {
      const charge = charges[chargeIdx];
      const allocateAmt = Math.min(paymentRemaining, chargeRemaining);

      if (allocateAmt > 0) {
        await supabase.from("payment_allocations").insert({
          payment_id: payment.id,
          charge_id: charge.id,
          amount_mwk: allocateAmt,
        });

        paymentRemaining -= allocateAmt;
        chargeRemaining -= allocateAmt;
      }

      if (chargeRemaining === 0) {
        chargeIdx++;
        if (chargeIdx < charges.length) {
          chargeRemaining = charges[chargeIdx].amount_mwk;
        }
      }
    }
  }
}

export async function getPaymentForUser(
  paymentId: string,
  userId: string
): Promise<PaymentRecord | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*, occupancies!inner(provider_id, spaces(category, landmark, zones(name)), occupancy_parties(user_id))")
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
    id: data.id,
    occupancyId: data.occupancy_id,
    payerId: data.payer_id,
    amountMwk: data.amount_mwk,
    paymentDate: data.payment_date,
    method: data.method,
    externalReference: data.external_reference,
    providerConfirmedAt: data.provider_confirmed_at,
    payerConfirmedAt: data.payer_confirmed_at,
    status: data.status,
    notes: data.notes,
    createdAt: data.created_at,
    spaceTitle: data.occupancies?.spaces?.landmark ?? "Space",
    spaceZone: data.occupancies?.spaces?.zones?.name ?? "",
  };
}

