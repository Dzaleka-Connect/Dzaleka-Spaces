import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Storage is not configured" }, { status: 404 });
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from("enquiry_attachments")
    .select("bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !attachment) {
    return Response.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(attachment.bucket)
    .createSignedUrl(attachment.storage_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    return Response.json({ error: "Could not open attachment" }, { status: 500 });
  }

  return Response.redirect(data.signedUrl, 302);
}
