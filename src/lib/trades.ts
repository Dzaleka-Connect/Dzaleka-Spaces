import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

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
    .select("id, ticket_id, status, scheduled_for, completion_notes, created_at, maintenance_tickets(title)")
    .eq("service_provider_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyWorkOrders failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const ticket = (row as any).maintenance_tickets;
    return {
    id: row.id,
    ticketId: row.ticket_id,
    ticketTitle: Array.isArray(ticket)
      ? ticket[0]?.title ?? "Work order"
      : ticket?.title ?? "Work order",
    status: row.status,
    scheduledFor: row.scheduled_for,
    completionNotes: row.completion_notes,
    createdAt: row.created_at,
    };
  });
}
