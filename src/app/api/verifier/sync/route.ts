import { getSessionUser, isStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
  const { error } = await supabase.from("verifier_sync_events").upsert(
    {
      client_generated_id: String(body.clientGeneratedId),
      verifier_id: user.id,
      assignment_id: body.assignmentId || null,
      event_type: String(body.eventType),
      payload: body.payload ?? {},
      status: "queued",
    },
    { onConflict: "verifier_id,client_generated_id" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
