import { getSessionUser, isStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

const MAX_BODY_BYTES = 30 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"]);

type EvidenceInput = {
  name?: unknown;
  type?: unknown;
  size?: unknown;
  data?: unknown;
  kind?: unknown;
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Sync payload is too large" }, { status: 413 });
  }
  const user = await getSessionUser();
  if (!user || !isStaff(user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.clientGeneratedId || !body?.eventType) {
    return Response.json({ error: "Invalid sync event" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json({ ok: true, demo: true });
  }

  const supabase = await createClient();
  if (body.eventType !== "verification_submission" || !body.assignmentId) {
    return Response.json({ error: "Unsupported sync event" }, { status: 400 });
  }

  const payload = body.payload;
  if (!payload || typeof payload !== "object" || !payload.recommendation) {
    return Response.json({ error: "Incomplete checklist payload" }, { status: 400 });
  }

  const { data: assignment } = await supabase
    .from("verification_assignments")
    .select("id, listings(spaces(id))")
    .eq("id", String(body.assignmentId))
    .eq("verifier_id", user.id)
    .maybeSingle();
  if (!assignment) {
    return Response.json({ error: "Assignment not found" }, { status: 404 });
  }

  const { data: verificationId, error } = await supabase.rpc("submit_verification_assignment", {
    assignment: String(body.assignmentId),
    checklist_payload: payload,
    verifier_notes: typeof body.notes === "string" ? body.notes : null,
    client_event_id: String(body.clientGeneratedId),
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const listingValue = assignment.listings as unknown as
    | { spaces?: { id?: string } | { id?: string }[] }
    | { spaces?: { id?: string } | { id?: string }[] }[]
    | null;
  const listing = Array.isArray(listingValue) ? listingValue[0] : listingValue;
  const spaceValue = listing?.spaces;
  const space = Array.isArray(spaceValue) ? spaceValue[0] : spaceValue;
  if (!space?.id) {
    return Response.json({ error: "Assignment space not found" }, { status: 409 });
  }

  const evidence = Array.isArray(body.evidence)
    ? (body.evidence as EvidenceInput[]).slice(0, 6)
    : [];
  for (let index = 0; index < evidence.length; index += 1) {
    const item = evidence[index]!;
    if (typeof item.data !== "string" || typeof item.type !== "string") {
      return Response.json({ error: "Invalid evidence file" }, { status: 400 });
    }
    const original = Buffer.from(item.data, "base64");
    if (original.length === 0 || original.length > MAX_FILE_BYTES) {
      return Response.json({ error: "Evidence file size is invalid" }, { status: 400 });
    }

    const isPhoto = item.kind === "photo";
    if (!isPhoto && (item.kind !== "audio" || !AUDIO_TYPES.has(item.type))) {
      return Response.json({ error: "Evidence file type is not allowed" }, { status: 400 });
    }

    let bytes: Buffer;
    let contentType: string;
    let extension: string;
    let scanStatus: "clean" | "pending";
    try {
      if (isPhoto) {
        bytes = await sharp(original, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer();
        contentType = "image/jpeg";
        extension = "jpg";
        scanStatus = "clean";
      } else {
        bytes = original;
        contentType = item.type;
        extension =
          item.type === "audio/ogg"
            ? "ogg"
            : item.type === "audio/mpeg"
              ? "mp3"
              : item.type === "audio/mp4"
                ? "m4a"
                : "webm";
        scanStatus = "pending";
      }
    } catch {
      return Response.json({ error: "Evidence file could not be decoded" }, { status: 400 });
    }

    const path = `${space.id}/offline/${body.clientGeneratedId}/${index}.${extension}`;
    const { data: existing } = await supabase
      .from("file_uploads")
      .select("id")
      .eq("bucket", "verification-private")
      .eq("storage_path", path)
      .maybeSingle();
    if (existing) continue;

    const { error: uploadError } = await supabase.storage
      .from("verification-private")
      .upload(path, bytes, { contentType, upsert: false });
    if (uploadError) {
      return Response.json({ error: "Evidence upload failed" }, { status: 502 });
    }

    const { data: upload, error: registryError } = await supabase
      .from("file_uploads")
      .insert({
        uploader_id: user.id,
        bucket: "verification-private",
        storage_path: path,
        entity_type: "verification_assignment",
        entity_id: body.assignmentId,
        original_name: typeof item.name === "string" ? item.name.slice(0, 255) : null,
        content_type: contentType,
        byte_size: bytes.length,
        scan_status: scanStatus,
        scan_provider: isPhoto ? "sharp-reencode" : null,
        scanned_at: isPhoto ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (registryError || !upload) {
      return Response.json({ error: "Evidence registry failed" }, { status: 500 });
    }
    const { error: evidenceError } = await supabase.from("verification_evidence").insert({
      assignment_id: body.assignmentId,
      verification_id: verificationId,
      uploader_id: user.id,
      kind: isPhoto ? "photo" : "audio",
      storage_path: path,
      file_upload_id: upload.id,
    });
    if (evidenceError) {
      return Response.json({ error: "Evidence metadata failed" }, { status: 500 });
    }
  }

  return Response.json({ ok: true, verificationId });
}
