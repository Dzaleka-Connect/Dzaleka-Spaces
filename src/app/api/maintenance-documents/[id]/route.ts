import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Storage is not configured" }, { status: 404 });
  }

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("maintenance_documents")
    .select("bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    return Response.json({ error: "Could not open document" }, { status: 500 });
  }

  return Response.redirect(data.signedUrl, 302);
}
