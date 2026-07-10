import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";

export interface EnquiryMessage {
  id: string;
  senderRole: "seeker" | "provider" | "staff";
  body: string;
  createdAt: string;
  attachments: EnquiryAttachment[];
}

export interface EnquiryAttachment {
  id: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
}

export interface EnquiryDetail {
  id: string;
  listingId: string;
  listingTitle: string;
  status: "open" | "closed" | "withdrawn";
  channel: string;
  seekerName: string;
  seekerContact: string;
  seekerId: string | null;
  providerId: string | null;
  messages: EnquiryMessage[];
  createdAt: string;
}

export async function getEnquiryForUser(
  enquiryId: string,
  userId: string
): Promise<EnquiryDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: enquiry, error } = await supabase
    .from("enquiries")
    .select(
      "id, listing_id, status, channel, name, contact, seeker_id, message, created_at, listings(id, title, spaces(provider_id))"
    )
    .eq("id", enquiryId)
    .maybeSingle();

  if (error || !enquiry) {
    if (error) console.error("getEnquiryForUser failed:", error.message);
    return null;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const listing = enquiry.listings as any;
  const space = listing?.spaces as any;
  const providerId = space?.provider_id ?? null;
  const isSeeker = enquiry.seeker_id === userId;
  const isProvider = providerId === userId;

  if (!isSeeker && !isProvider) return null;

  const { data: messages } = await supabase
    .from("enquiry_messages")
    .select("id, sender_role, body, created_at")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: true });
  const messageIds = (messages ?? []).map((m) => m.id);
  const { data: attachments } = messageIds.length
    ? await supabase
        .from("enquiry_attachments")
        .select("id, message_id, file_name, storage_path, content_type, size_bytes")
        .in("message_id", messageIds)
    : { data: [] };
  const attachmentsByMessage = new Map<string, EnquiryAttachment[]>();
  for (const attachment of attachments ?? []) {
    const list = attachmentsByMessage.get(attachment.message_id) ?? [];
    list.push({
      id: attachment.id,
      fileName: attachment.file_name,
      storagePath: attachment.storage_path,
      contentType: attachment.content_type,
      sizeBytes: attachment.size_bytes,
    });
    attachmentsByMessage.set(attachment.message_id, list);
  }

  return {
    id: enquiry.id,
    listingId: enquiry.listing_id,
    listingTitle: listing?.title ?? "Listing",
    status: enquiry.status as EnquiryDetail["status"],
    channel: enquiry.channel,
    seekerName: enquiry.name,
    seekerContact: enquiry.contact,
    seekerId: enquiry.seeker_id,
    providerId,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      senderRole: m.sender_role as EnquiryMessage["senderRole"],
      body: m.body,
      createdAt: m.created_at,
      attachments: attachmentsByMessage.get(m.id) ?? [],
    })),
    createdAt: enquiry.created_at,
  };
}

export async function listSeekerEnquiries(userId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select("id, listing_id, status, channel, created_at")
    .eq("seeker_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listSeekerEnquiries failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function listProviderEnquiries(providerId: string) {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: spaces } = await supabase.from("spaces").select("id").eq("provider_id", providerId);

  const spaceIds = (spaces ?? []).map((s) => s.id);
  if (spaceIds.length === 0) return [];

  const { data: listings } = await supabase.from("listings").select("id").in("space_id", spaceIds);

  const listingIds = (listings ?? []).map((l) => l.id);
  if (listingIds.length === 0) return [];

  const { data, error } = await supabase
    .from("enquiries")
    .select("id, listing_id, status, channel, name, contact, created_at")
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProviderEnquiries failed:", error.message);
    return [];
  }
  return data ?? [];
}
