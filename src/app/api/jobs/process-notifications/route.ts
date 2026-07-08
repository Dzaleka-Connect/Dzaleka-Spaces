import { headers } from "next/headers";
import { processPendingNotifications } from "@/lib/notifications";

export async function POST() {
  const headerStore = await headers();
  const expected = process.env.NOTIFICATION_WORKER_SECRET;
  const provided = headerStore.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || provided !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingNotifications();
  return Response.json(result);
}
