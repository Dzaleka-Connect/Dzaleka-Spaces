import { getSessionUser } from "@/lib/auth";
import { getViewingForUser } from "@/lib/viewings";

function ical(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icalDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Authentication required", { status: 401 });
  const viewing = await getViewingForUser((await params).id, user.id);
  if (!viewing) return new Response("Viewing not found", { status: 404 });
  const start = new Date(viewing.proposedAt);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const appUrl = new URL(`/account/viewings/${viewing.id}`, request.url).toString();
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dzaleka Spaces//Viewing//EN",
    "BEGIN:VEVENT",
    `UID:${viewing.id}@dzaleka-spaces`,
    `DTSTAMP:${icalDate(new Date().toISOString())}`,
    `DTSTART:${icalDate(start.toISOString())}`,
    `DTEND:${icalDate(end.toISOString())}`,
    `SUMMARY:${ical(`Viewing: ${viewing.listingTitle}`)}`,
    `DESCRIPTION:${ical(`Open the private appointment record: ${appUrl}`)}`,
    `URL:${appUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="viewing-${viewing.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
