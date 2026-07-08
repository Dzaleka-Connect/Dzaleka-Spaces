import { isStaff } from "./auth-roles";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import type { SessionUser } from "./session-user";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const TRADE_CATEGORIES = [
  "Building repairs",
  "Carpentry",
  "Electrical",
  "Plumbing",
  "Roofing",
  "Painting",
  "Cleaning",
  "Solar",
  "Water systems",
  "Locks and security",
  "Other approved service",
] as const;

export interface ServiceProviderProfile {
  userId: string;
  displayName: string;
  bio: string | null;
  categories: string[];
  zonesServed: string[];
  languages: string[];
  phone: string | null;
  status: string;
  verifiedAt: string | null;
}

export interface MaintenanceJob {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  zone: string | null;
  landmark: string | null;
  createdAt: string;
}

export interface MaintenanceQuote {
  id: string;
  ticketId: string;
  ticketTitle: string;
  amountMwk: number;
  timeline: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  ticketId: string;
  ticketTitle: string;
  status: string;
  scheduledFor: string | null;
  completionNotes: string | null;
  createdAt: string;
  serviceProviderId?: string;
  requesterId?: string | null;
}

export interface MaintenanceMessage {
  id: string;
  ticketId: string;
  workOrderId: string | null;
  senderId: string;
  senderRole: "requester" | "service_provider" | "staff";
  body: string;
  createdAt: string;
}

export interface MaintenanceThread {
  ticketId: string;
  ticketTitle: string;
  status: string;
  lastMessageAt: string | null;
  lastBody: string | null;
  messageCount: number;
}

export interface MaintenanceReview {
  id: string;
  workOrderId: string;
  ticketId: string;
  ticketTitle: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  serviceProviderId: string;
  reviewerId: string;
}

export interface MaintenanceDocument {
  id: string;
  ticketId: string;
  ticketTitle: string;
  workOrderId: string | null;
  kind: string;
  fileName: string;
  contentType: string | null;
  byteSize: number | null;
  createdAt: string;
  uploaderId: string;
}

export const DEMO_SERVICE_PROVIDERS: ServiceProviderProfile[] = [
  {
    userId: "demo-trade-1",
    displayName: "Bright Solar & Wiring",
    bio: "Electrical repairs, solar light installs and small venue wiring checks.",
    categories: ["Electrical", "Solar"],
    zonesServed: ["Kawale 1", "Kawale 2", "Lisungwi"],
    languages: ["English", "Chichewa", "Swahili"],
    phone: "+265 999 000 101",
    status: "active",
    verifiedAt: "2026-07-01",
  },
  {
    userId: "demo-trade-2",
    displayName: "Umodzi Carpentry Team",
    bio: "Door repairs, shelving, counter builds and lockable storage fittings.",
    categories: ["Carpentry", "Locks and security", "Building repairs"],
    zonesServed: ["Likuni 1", "Katudza", "Dzaleka Hill"],
    languages: ["English", "Chichewa"],
    phone: "+265 999 000 202",
    status: "active",
    verifiedAt: null,
  },
];

export const DEMO_MAINTENANCE_JOBS: MaintenanceJob[] = [
  {
    id: "demo-job-1",
    title: "Repair lockable market stall door",
    description:
      "Metal door is sticking and the lock no longer closes securely.",
    category: "Locks and security",
    priority: "normal",
    status: "open",
    zone: "Kawale 2",
    landmark: "Main market front row",
    createdAt: "2026-07-08T08:00:00Z",
  },
  {
    id: "demo-job-2",
    title: "Check solar lighting in training room",
    description:
      "Two indoor lights are dim and the provider wants the battery checked.",
    category: "Solar",
    priority: "low",
    status: "triaged",
    zone: "Lisungwi",
    landmark: "Near the youth centre",
    createdAt: "2026-07-07T11:30:00Z",
  },
];

export async function listServiceProviders(): Promise<ServiceProviderProfile[]> {
  if (!isSupabaseConfigured()) return DEMO_SERVICE_PROVIDERS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_provider_profiles")
    .select(
      "user_id, display_name, bio, categories, zones_served, languages, phone, status, verified_at"
    )
    .eq("status", "active")
    .order("display_name");

  if (error) {
    console.error("listServiceProviders failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    categories: row.categories ?? [],
    zonesServed: row.zones_served ?? [],
    languages: row.languages ?? [],
    phone: row.phone,
    status: row.status,
    verifiedAt: row.verified_at,
  }));
}

export async function getMyServiceProviderProfile(
  userId: string
): Promise<ServiceProviderProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_provider_profiles")
    .select(
      "user_id, display_name, bio, categories, zones_served, languages, phone, status, verified_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getMyServiceProviderProfile failed:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    userId: data.user_id,
    displayName: data.display_name,
    bio: data.bio,
    categories: data.categories ?? [],
    zonesServed: data.zones_served ?? [],
    languages: data.languages ?? [],
    phone: data.phone,
    status: data.status,
    verifiedAt: data.verified_at,
  };
}

export async function listOpenMaintenanceJobs(): Promise<MaintenanceJob[]> {
  if (!isSupabaseConfigured()) return DEMO_MAINTENANCE_JOBS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("id, title, description, category, priority, status, landmark, created_at, zones(name)")
    .in("status", ["open", "triaged", "quoted"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listOpenMaintenanceJobs failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const zones = (row as any).zones;
    return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    zone: Array.isArray(zones) ? zones[0]?.name ?? null : zones?.name ?? null,
    landmark: row.landmark,
    createdAt: row.created_at,
    };
  });
}

export async function getMaintenanceJob(
  id: string
): Promise<MaintenanceJob | null> {
  const jobs = await listOpenMaintenanceJobs();
  return jobs.find((job) => job.id === id) ?? null;
}

export async function listMyMaintenanceQuotes(
  userId: string
): Promise<MaintenanceQuote[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_quotes")
    .select("id, ticket_id, amount_mwk, timeline, notes, status, created_at, maintenance_tickets(title)")
    .eq("service_provider_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyMaintenanceQuotes failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const ticket = (row as any).maintenance_tickets;
    return {
    id: row.id,
    ticketId: row.ticket_id,
    ticketTitle: Array.isArray(ticket)
      ? ticket[0]?.title ?? "Maintenance job"
      : ticket?.title ?? "Maintenance job",
    amountMwk: row.amount_mwk,
    timeline: row.timeline,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    };
  });
}

export async function listMyWorkOrders(userId: string): Promise<WorkOrder[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_work_orders")
    .select(
      "id, ticket_id, service_provider_id, status, scheduled_for, completion_notes, created_at, maintenance_tickets(title, requester_id)"
    )
    .eq("service_provider_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyWorkOrders failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const ticket = (row as any).maintenance_tickets;
    const ticketRow = Array.isArray(ticket) ? ticket[0] : ticket;
    return {
      id: row.id,
      ticketId: row.ticket_id,
      ticketTitle: ticketRow?.title ?? "Work order",
      status: row.status,
      scheduledFor: row.scheduled_for,
      completionNotes: row.completion_notes,
      createdAt: row.created_at,
      serviceProviderId: row.service_provider_id,
      requesterId: ticketRow?.requester_id ?? null,
    };
  });
}

export async function listMyMaintenanceThreads(
  userId: string
): Promise<MaintenanceThread[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: tickets, error } = await supabase
    .from("maintenance_tickets")
    .select("id, title, status, updated_at")
    .or(
      `requester_id.eq.${userId},assigned_service_provider_id.eq.${userId}`
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listMyMaintenanceThreads failed:", error.message);
    return [];
  }

  const ticketRows = tickets ?? [];
  if (ticketRows.length === 0) return [];

  const ticketIds = ticketRows.map((t) => t.id);
  const { data: messages } = await supabase
    .from("maintenance_messages")
    .select("ticket_id, body, created_at")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: false });

  const latestByTicket = new Map<
    string,
    { body: string; createdAt: string; count: number }
  >();
  for (const message of messages ?? []) {
    const existing = latestByTicket.get(message.ticket_id);
    if (!existing) {
      latestByTicket.set(message.ticket_id, {
        body: message.body,
        createdAt: message.created_at,
        count: 1,
      });
    } else {
      existing.count += 1;
    }
  }

  return ticketRows.map((ticket) => {
    const latest = latestByTicket.get(ticket.id);
    return {
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      status: ticket.status,
      lastMessageAt: latest?.createdAt ?? null,
      lastBody: latest?.body ?? null,
      messageCount: latest?.count ?? 0,
    };
  });
}

export async function listMaintenanceMessages(
  ticketId: string
): Promise<MaintenanceMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_messages")
    .select(
      "id, ticket_id, work_order_id, sender_id, sender_role, body, created_at"
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listMaintenanceMessages failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    workOrderId: row.work_order_id,
    senderId: row.sender_id,
    senderRole: row.sender_role as MaintenanceMessage["senderRole"],
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function getMaintenanceTicketAccess(
  ticketId: string,
  user: SessionUser
): Promise<{
  id: string;
  title: string;
  status: string;
  requesterId: string | null;
  assignedServiceProviderId: string | null;
  role: "requester" | "service_provider" | "staff" | null;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("id, title, status, requester_id, assigned_service_provider_id")
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getMaintenanceTicketAccess failed:", error.message);
    return null;
  }

  let role: "requester" | "service_provider" | "staff" | null = null;
  if (isStaff(user)) role = "staff";
  else if (data.requester_id === user.id) role = "requester";
  else if (data.assigned_service_provider_id === user.id) {
    role = "service_provider";
  }

  return {
    id: data.id,
    title: data.title,
    status: data.status,
    requesterId: data.requester_id,
    assignedServiceProviderId: data.assigned_service_provider_id,
    role,
  };
}

export async function listMyMaintenanceReviews(
  userId: string
): Promise<MaintenanceReview[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_reviews")
    .select(
      "id, work_order_id, ticket_id, rating, comment, created_at, service_provider_id, reviewer_id, maintenance_tickets(title)"
    )
    .or(`reviewer_id.eq.${userId},service_provider_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyMaintenanceReviews failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const ticket = (row as any).maintenance_tickets;
    return {
      id: row.id,
      workOrderId: row.work_order_id,
      ticketId: row.ticket_id,
      ticketTitle: Array.isArray(ticket)
        ? ticket[0]?.title ?? "Maintenance job"
        : ticket?.title ?? "Maintenance job",
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
      serviceProviderId: row.service_provider_id,
      reviewerId: row.reviewer_id,
    };
  });
}

export async function listReviewableWorkOrders(
  userId: string
): Promise<WorkOrder[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_work_orders")
    .select(
      "id, ticket_id, service_provider_id, status, scheduled_for, completion_notes, created_at, maintenance_tickets!inner(title, requester_id)"
    )
    .eq("status", "completed")
    .eq("maintenance_tickets.requester_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listReviewableWorkOrders failed:", error.message);
    return [];
  }

  const orders = (data ?? []).map((row) => {
    const ticket = (row as any).maintenance_tickets;
    const ticketRow = Array.isArray(ticket) ? ticket[0] : ticket;
    return {
      id: row.id,
      ticketId: row.ticket_id,
      ticketTitle: ticketRow?.title ?? "Work order",
      status: row.status,
      scheduledFor: row.scheduled_for,
      completionNotes: row.completion_notes,
      createdAt: row.created_at,
      serviceProviderId: row.service_provider_id,
      requesterId: ticketRow?.requester_id ?? null,
    } satisfies WorkOrder;
  });

  if (orders.length === 0) return [];

  const { data: existing } = await supabase
    .from("maintenance_reviews")
    .select("work_order_id")
    .in(
      "work_order_id",
      orders.map((order) => order.id)
    );

  const reviewed = new Set((existing ?? []).map((row) => row.work_order_id));
  return orders.filter((order) => !reviewed.has(order.id));
}

export async function listMyMaintenanceDocuments(
  userId: string
): Promise<MaintenanceDocument[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: tickets, error: ticketError } = await supabase
    .from("maintenance_tickets")
    .select("id, title")
    .or(
      `requester_id.eq.${userId},assigned_service_provider_id.eq.${userId}`
    );

  if (ticketError) {
    console.error("listMyMaintenanceDocuments tickets failed:", ticketError.message);
    return [];
  }

  const ticketRows = tickets ?? [];
  if (ticketRows.length === 0) return [];

  const titleById = new Map(ticketRows.map((t) => [t.id, t.title]));
  const { data, error } = await supabase
    .from("maintenance_documents")
    .select(
      "id, ticket_id, work_order_id, kind, file_name, content_type, byte_size, created_at, uploader_id"
    )
    .in(
      "ticket_id",
      ticketRows.map((t) => t.id)
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyMaintenanceDocuments failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    ticketTitle: titleById.get(row.ticket_id) ?? "Maintenance job",
    workOrderId: row.work_order_id,
    kind: row.kind,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    uploaderId: row.uploader_id,
  }));
}
