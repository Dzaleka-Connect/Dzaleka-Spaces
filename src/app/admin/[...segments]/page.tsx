import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, ShieldCheck } from "lucide-react";
import {
  CaseUpdateForm,
  ContentPageForm,
  SystemSettingForm,
  VerificationAssignmentForm,
} from "@/components/admin-operation-forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isEmailConfigured } from "@/lib/email/resend";
import { requireModerator } from "@/lib/portal-auth";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administration" };

type Field = { key: string; label: string };
type Resource = {
  title: string;
  description: string;
  table: string;
  fields: Field[];
  order?: string;
  detailBase?: string;
  filter?: { column: string; value: string };
};

const RESOURCES: Record<string, Resource> = {
  spaces: {
    title: "Spaces",
    description: "Space records and approximate public locations.",
    table: "spaces",
    fields: [
      { key: "id", label: "ID" },
      { key: "category", label: "Category" },
      { key: "landmark", label: "Landmark" },
      { key: "created_at", label: "Created" },
    ],
    detailBase: "/admin/spaces",
  },
  listings: {
    title: "Listings",
    description: "Listing workflow records and publication state.",
    table: "listings",
    fields: [
      { key: "id", label: "ID" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
    ],
    detailBase: "/admin/listings",
  },
  users: {
    title: "Users",
    description: "Account status and assigned application roles.",
    table: "admin_user_directory",
    fields: [
      { key: "id", label: "ID" },
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "account_status", label: "Status" },
      { key: "roles", label: "Roles" },
    ],
    detailBase: "/admin/users",
  },
  providers: {
    title: "Space providers",
    description: "Accounts with the provider role.",
    table: "admin_provider_directory",
    fields: [
      { key: "id", label: "ID" },
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "account_status", label: "Status" },
      { key: "roles", label: "Roles" },
    ],
    detailBase: "/admin/providers",
  },
  verifiers: {
    title: "Field verifiers",
    description: "Accounts assigned to field verification work.",
    table: "admin_verifier_directory",
    fields: [
      { key: "id", label: "ID" },
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "account_status", label: "Status" },
      { key: "roles", label: "Roles" },
    ],
    detailBase: "/admin/verifiers",
  },
  verifications: {
    title: "Verifications",
    description: "Assignments and supervisor decisions. Evidence remains private.",
    table: "verifications",
    fields: [
      { key: "id", label: "ID" },
      { key: "status", label: "Status" },
      { key: "verifier_id", label: "Verifier" },
      { key: "reverify_by", label: "Recheck by" },
    ],
    detailBase: "/admin/verifications",
  },
  organisations: {
    title: "Organisations",
    description: "Organisation accounts and operating status.",
    table: "organisations",
    fields: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
    ],
    detailBase: "/admin/organisations",
  },
  adjustments: {
    title: "Payment adjustments",
    description: "Append-only corrections created by finance or administrators.",
    table: "payment_adjustments",
    fields: [
      { key: "id", label: "ID" },
      { key: "payment_id", label: "Payment" },
      { key: "amount_delta_mwk", label: "Amount delta" },
      { key: "created_at", label: "Created" },
    ],
  },
  receipts: {
    title: "Receipts",
    description: "Receipts issued only after both payment parties confirm.",
    table: "payment_receipts",
    fields: [
      { key: "id", label: "ID" },
      { key: "receipt_number", label: "Receipt" },
      { key: "payment_id", label: "Payment" },
      { key: "issued_at", label: "Issued" },
    ],
  },
  occupancies: {
    title: "Occupancies",
    description: "Occupancy record lifecycle and parties.",
    table: "occupancies",
    fields: [
      { key: "id", label: "ID" },
      { key: "space_id", label: "Space" },
      { key: "provider_id", label: "Provider" },
      { key: "status", label: "Status" },
      { key: "start_date", label: "Start" },
    ],
    detailBase: "/admin/occupancies",
  },
  payments: {
    title: "Payment records",
    description: "Non-custodial payment records and confirmation state.",
    table: "payment_records",
    fields: [
      { key: "id", label: "ID" },
      { key: "occupancy_id", label: "Occupancy" },
      { key: "amount_mwk", label: "Amount (MWK)" },
      { key: "method", label: "Method" },
      { key: "status", label: "Status" },
    ],
    detailBase: "/admin/payments",
  },
  maintenance: {
    title: "Maintenance",
    description: "Maintenance requests across the platform.",
    table: "maintenance_tickets",
    fields: [
      { key: "id", label: "ID" },
      { key: "title", label: "Title" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
    ],
    detailBase: "/admin/maintenance",
  },
  "work-orders": {
    title: "Work orders",
    description: "Assigned and completed maintenance work.",
    table: "maintenance_work_orders",
    fields: [
      { key: "id", label: "ID" },
      { key: "ticket_id", label: "Ticket" },
      { key: "service_provider_id", label: "Service provider" },
      { key: "status", label: "Status" },
    ],
  },
  "service-providers": {
    title: "Service providers",
    description: "Trade profiles and operational status.",
    table: "service_provider_profiles",
    fields: [
      { key: "user_id", label: "User" },
      { key: "display_name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "verified_at", label: "Checked" },
    ],
    detailBase: "/admin/service-providers",
  },
  zones: {
    title: "Zones",
    description: "Administratively managed public zone names.",
    table: "zones",
    fields: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "active", label: "Active" },
    ],
    detailBase: "/admin/locations/zones",
  },
  landmarks: {
    title: "Landmarks",
    description: "Approximate public landmarks. Exact coordinates do not belong here.",
    table: "landmarks",
    fields: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "zone_id", label: "Zone" },
      { key: "active", label: "Active" },
    ],
    detailBase: "/admin/locations/landmarks",
  },
  "notification-templates": {
    title: "Notification templates",
    description: "Email template catalogue and enabled state.",
    table: "notification_templates",
    fields: [
      { key: "key", label: "Key" },
      { key: "subject", label: "Subject" },
      { key: "enabled", label: "Enabled" },
      { key: "updated_at", label: "Updated" },
    ],
  },
  "notification-failures": {
    title: "Notification failures",
    description: "Deliveries requiring retry or investigation.",
    table: "notification_queue",
    fields: [
      { key: "id", label: "ID" },
      { key: "template_key", label: "Template" },
      { key: "attempts", label: "Attempts" },
      { key: "last_error", label: "Last error" },
      { key: "updated_at", label: "Updated" },
    ],
    filter: { column: "status", value: "failed" },
  },
};

export default async function AdminCatchAllPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  await requireModerator();
  const segments = (await params).segments;
  const path = segments.join("/");
  if (path === "system") return <SystemHealth />;
  if (path === "verifications" || path === "verifications/calendar")
    return <VerificationOperations />;
  if (segments[0] === "settings") return <SettingsArea section={segments[1] ?? "general"} />;
  if (segments[0] === "content")
    return <ContentArea section={segments[1] ?? "pages"} slug={segments[2]} />;
  if (segments[0] === "cases" && segments[1]) return <CaseDetail id={segments[1]} />;
  const key = resourceKey(segments);
  const resource = RESOURCES[key];
  if (!resource) notFound();
  const detailId = detailIdFor(segments);
  return detailId ? (
    <ResourceDetail resource={resource} id={detailId} />
  ) : (
    <ResourceList resource={resource} />
  );
}

function resourceKey(segments: string[]) {
  if (segments[0] === "locations") return segments[1] ?? "";
  if (segments[0] === "notifications")
    return segments[1] === "failures" ? "notification-failures" : "notification-templates";
  if (segments[0] === "verifications" && segments[1] === "calendar") return "verifications";
  return segments[0];
}

function detailIdFor(segments: string[]) {
  if (segments[0] === "locations") return segments[2];
  if (["notifications", "settings", "content"].includes(segments[0])) return undefined;
  if (segments[1] === "calendar") return undefined;
  return segments[1];
}

function display(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString("en-MW");
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "Structured record";
  return String(value).replace(/_/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Administration</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{description}</p>
      </header>
      {children}
    </div>
  );
}

async function ResourceList({ resource }: { resource: Resource }) {
  const supabase = await createClient();
  let query = supabase
    .from(resource.table)
    .select(resource.fields.map((field) => field.key).join(","))
    .limit(100);
  if (resource.filter) query = query.eq(resource.filter.column, resource.filter.value);
  const { data, error } = await query;
  if (error)
    return (
      <Shell title={resource.title} description={resource.description}>
        <Alert variant="destructive">
          <Database />
          <AlertTitle>Could not load records</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </Shell>
    );
  const rows = toRecords(data);
  return (
    <Shell title={resource.title} description={resource.description}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {resource.fields.map((field) => (
                  <TableHead key={field.key}>{field.label}</TableHead>
                ))}
                {resource.detailBase ? <TableHead>Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={String(row.id ?? row.user_id ?? row.key ?? index)}>
                  {resource.fields.map((field) => (
                    <TableCell
                      key={field.key}
                      className={
                        field.key === "title" ||
                        field.key === "name" ||
                        field.key === "display_name"
                          ? "font-medium"
                          : undefined
                      }
                    >
                      {field.key === "status" ? (
                        <Badge variant="outline">{display(row[field.key])}</Badge>
                      ) : (
                        display(row[field.key])
                      )}
                    </TableCell>
                  ))}
                  {resource.detailBase ? (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`${resource.detailBase}/${String(row.id ?? row.user_id)}`} />
                        }
                        nativeButton={false}
                      >
                        Open
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No records</CardTitle>
            <CardDescription>The operational queue is currently clear.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </Shell>
  );
}

async function ResourceDetail({ resource, id }: { resource: Resource; id: string }) {
  const idColumn =
    resource.table === "service_provider_profiles"
      ? "user_id"
      : resource.table === "notification_templates"
        ? "key"
        : "id";
  const { data, error } = await (
    await createClient()
  )
    .from(resource.table)
    .select(resource.fields.map((field) => field.key).join(","))
    .eq(idColumn, id)
    .maybeSingle();
  if (error || !isRecord(data)) notFound();
  const row = data;
  return (
    <Shell
      title={`${resource.title} record`}
      description="Authorised operational detail. Sensitive evidence is kept in its dedicated access-controlled workflow."
    >
      <Card>
        <CardHeader>
          <CardTitle>{display(row.title ?? row.name ?? row.display_name ?? row.id)}</CardTitle>
          <CardDescription>{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {resource.fields.map((field) => (
              <div key={field.key}>
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 font-medium">{display(row[field.key])}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </Shell>
  );
}

async function CaseDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const [{ data: item }, { data: events }] = await Promise.all([
    supabase
      .from("moderation_cases")
      .select(
        "id, title, category, status, priority, summary, restricted, assigned_to, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("case_events")
      .select("id, action, note, actor_id, created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!item) notFound();
  return (
    <Shell
      title={item.title}
      description={item.summary || "Moderation case review and decision history."}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{item.status}</Badge>
                <Badge variant={item.restricted ? "destructive" : "secondary"}>
                  {item.priority}
                </Badge>
              </div>
              <CardTitle>{item.category.replace(/_/g, " ")}</CardTitle>
              <CardDescription>
                Opened {new Date(item.created_at).toLocaleString("en-MW")}
              </CardDescription>
            </CardHeader>
          </Card>
          <section>
            <h2 className="mb-3 text-xl font-semibold">Case history</h2>
            <div className="flex flex-col gap-2">
              {(events ?? []).map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {event.action.replace(/[._]/g, " ")}
                    </CardTitle>
                    <CardDescription>
                      {new Date(event.created_at).toLocaleString("en-MW")}
                    </CardDescription>
                  </CardHeader>
                  {event.note ? <CardContent>{event.note}</CardContent> : null}
                </Card>
              ))}
            </div>
          </section>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Record decision</CardTitle>
            <CardDescription>All updates are added to the case and audit history.</CardDescription>
          </CardHeader>
          <CardContent>
            <CaseUpdateForm caseId={id} currentStatus={item.status} />
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

async function ContentArea({ section, slug }: { section: string; slug?: string }) {
  const managedSlug = slug ?? `${section}/new`;
  const { data } = await (
    await createClient()
  )
    .from("content_pages")
    .select("slug, title, body, status, updated_at")
    .eq("slug", managedSlug)
    .maybeSingle();
  return (
    <Shell
      title={
        section === "translations"
          ? "Content translations"
          : section === "announcements"
            ? "Announcements"
            : "Help content"
      }
      description="Database-managed public content with draft, publication and audit controls."
    >
      <Card>
        <CardHeader>
          <CardTitle>{data ? `Edit ${data.title}` : `Create ${managedSlug}`}</CardTitle>
          <CardDescription>
            Legal and privacy text must be formally reviewed before publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentPageForm
            slug={managedSlug}
            title={data?.title}
            body={data?.body}
            status={data?.status}
          />
        </CardContent>
      </Card>
    </Shell>
  );
}

async function SettingsArea({ section }: { section: string }) {
  const key = `settings.${section}`;
  const { data } = await (
    await createClient()
  )
    .from("system_settings")
    .select("key, value, description, updated_at")
    .eq("key", key)
    .maybeSingle();
  const defaults: Record<string, unknown> = {
    general: { support_email: "", support_phone: "" },
    listings: { stale_after_days: 30, recheck_after_days: 90 },
    verification: { assignment_due_days: 7, expiry_days: 90 },
    payments: { currency: "MWK", custody_enabled: false },
    privacy: { signed_url_seconds: 60 },
    retention: { audit_years: 7, message_years: 3 },
    "feature-flags": { managed_at: "/admin/flags" },
    roles: { managed_at: "/admin/users" },
  };
  return (
    <Shell
      title={`${section.replace(/-/g, " ")} settings`}
      description="Versioned operational configuration. Protected pilot boundaries cannot be enabled from this screen."
    >
      {section === "feature-flags" || section === "roles" ? (
        <Card>
          <CardHeader>
            <CardTitle>Managed in a dedicated workflow</CardTitle>
            <CardDescription>
              {section === "feature-flags"
                ? "Use the feature flag screen for audited toggles."
                : "Use user administration for audited role changes."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href={section === "feature-flags" ? "/admin/flags" : "/admin/users"} />}
              nativeButton={false}
            >
              Open manager
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{key}</CardTitle>
            <CardDescription>
              Changes require an administrator and a recorded reason.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SystemSettingForm
              settingKey={key}
              value={data?.value ?? defaults[section] ?? {}}
              description={data?.description}
            />
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}

async function SystemHealth() {
  const supabase = await createClient();
  const checks = await Promise.all([
    supabase
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("verifications")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "scheduled"]),
    supabase
      .from("moderation_cases")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "triaged"]),
  ]);
  const values = [
    {
      label: "Database API",
      ok: checks.every((check) => !check.error),
      detail: checks.some((check) => check.error)
        ? "One or more health queries failed"
        : "Operational queries succeeded",
    },
    {
      label: "Notification worker",
      ok: isSupabaseAdminConfigured(),
      detail: isSupabaseAdminConfigured()
        ? `${checks[0].count ?? 0} failed messages`
        : "SUPABASE_SECRET_KEY is not configured",
    },
    {
      label: "Transactional email",
      ok: isEmailConfigured(),
      detail: isEmailConfigured()
        ? "Resend adapter configured"
        : "RESEND_API_KEY or EMAIL_FROM is missing",
    },
  ];
  return (
    <Shell
      title="System health"
      description="Live configuration and operational backlog checks without exposing secret values."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {values.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{item.label}</CardTitle>
                <Badge variant={item.ok ? "default" : "destructive"}>
                  {item.ok ? "Healthy" : "Action required"}
                </Badge>
              </div>
              <CardDescription>{item.detail}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Alert>
        <ShieldCheck />
        <AlertTitle>Backlog snapshot</AlertTitle>
        <AlertDescription>
          {checks[1].count ?? 0} verification assignments and {checks[2].count ?? 0} open cases
          currently require operational attention.
        </AlertDescription>
      </Alert>
    </Shell>
  );
}

async function VerificationOperations() {
  const supabase = await createClient();
  const [{ data: assignments }, { data: listings }, { data: verifiers }] = await Promise.all([
    supabase
      .from("verification_assignments")
      .select(
        "id, listing_id, verifier_id, status, due_at, assigned_at, listings(title), profiles!verification_assignments_verifier_id_fkey(full_name)"
      )
      .order("due_at", { ascending: true })
      .limit(100),
    supabase
      .from("listings")
      .select("id, title, status")
      .in("status", ["submitted", "pending_review", "under_review", "verification_pending"])
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("admin_verifier_directory")
      .select("id, full_name, email")
      .eq("account_status", "active")
      .limit(100),
  ]);
  return (
    <Shell
      title="Verification assignments"
      description="Assign field visits, monitor due dates and keep publication decisions separate from evidence collection."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-3">
          {(assignments ?? []).map((item) => {
            const listingValue = item.listings as unknown as
              { title?: string } | { title?: string }[] | null;
            const profileValue = item.profiles as unknown as
              { full_name?: string } | { full_name?: string }[] | null;
            const listing = Array.isArray(listingValue) ? listingValue[0] : listingValue;
            const profile = Array.isArray(profileValue) ? profileValue[0] : profileValue;
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {listing?.title ?? item.listing_id}
                      </CardTitle>
                      <CardDescription>
                        {profile?.full_name ?? item.verifier_id} · due{" "}
                        {new Date(item.due_at).toLocaleString("en-MW")}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
          {!assignments?.length ? (
            <p className="text-sm text-muted-foreground">No field visits assigned.</p>
          ) : null}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Assign field visit</CardTitle>
            <CardDescription>Only active verifier accounts are listed.</CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationAssignmentForm
              listings={(listings ?? []).map((item) => ({
                value: item.id,
                label: `${item.title} · ${item.status}`,
              }))}
              verifiers={(verifiers ?? []).map((item) => ({
                value: item.id,
                label: item.full_name || item.email || item.id,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
