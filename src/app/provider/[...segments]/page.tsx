import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Settings, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProviderExpenseForm } from "@/components/provider-expense-form";
import { listProviderEnquiries } from "@/lib/enquiries";
import { listOccupanciesForProvider } from "@/lib/occupancies";
import { listAllChargesForProvider, listAllPaymentsForProvider } from "@/lib/payments";
import { requireUser } from "@/lib/portal-auth";
import { createClient } from "@/lib/supabase/server";
import { listMyMaintenanceDocuments, listMyMaintenanceThreads } from "@/lib/trades";
import { categoryLabel, formatMwk } from "@/lib/types";
import { updateProviderSpace } from "../operations/actions";

export const metadata: Metadata = { title: "Provider operations" };

export default async function ProviderOperationsPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const user = await requireUser();
  const segments = (await params).segments;
  const [area, id, action] = segments;

  if (area === "profile") redirect("/account/profile");
  if ((area === "spaces" || area === "listings") && id === "new") redirect("/list-a-space");
  if (area === "listings" && id && !action) redirect(`/provider/listings/${id}/preview`);
  if (area === "settings") return <ProviderSettings />;
  if (area === "messages") return <ProviderMessages userId={user.id} />;
  if (area === "reports") return <ProviderReports userId={user.id} />;
  if (area === "documents") return <ProviderDocuments userId={user.id} />;
  if (area === "expenses") return <ProviderExpenses userId={user.id} />;
  if (area === "deposits") return <ProviderDeposits userId={user.id} />;
  if (area === "spaces" && id) return <ProviderSpaceDetail spaceId={id} edit={action === "edit"} />;
  if (area === "verifications" && id) return <ProviderVerificationDetail verificationId={id} />;
  if (area === "work-orders" && id) return <ProviderWorkOrderDetail workOrderId={id} />;
  notFound();
}

function Shell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </header>
      {children}
    </div>
  );
}

function ProviderSettings() {
  return (
    <Shell
      eyebrow="Provider"
      title="Settings"
      description="Manage provider access, profile and account security."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Profile",
            description: "Name, phone and preferred language.",
            href: "/account/profile",
            icon: FileText,
          },
          {
            title: "Team",
            description: "Invite staff and set scoped permissions.",
            href: "/provider/team",
            icon: Settings,
          },
          {
            title: "Security",
            description: "Password, authenticator and devices.",
            href: "/account/security",
            icon: Settings,
          },
        ].map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <item.icon />
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" render={<Link href={item.href} />} nativeButton={false}>
                Open
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

async function ProviderMessages({ userId }: { userId: string }) {
  const [enquiries, maintenance] = await Promise.all([
    listProviderEnquiries(userId),
    listMyMaintenanceThreads(userId),
  ]);
  return (
    <Shell
      eyebrow="Provider"
      title="Messages"
      description="Enquiries and maintenance conversations for spaces you manage."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Enquiries</h2>
          <div className="flex flex-col gap-2">
            {enquiries.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription>
                    {item.status} · {new Date(item.created_at).toLocaleDateString("en-MW")}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/provider/enquiries/${item.id}`} />}
                    nativeButton={false}
                  >
                    Open
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {!enquiries.length ? (
              <p className="text-sm text-muted-foreground">No enquiry conversations.</p>
            ) : null}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Maintenance</h2>
          <div className="flex flex-col gap-2">
            {maintenance.map((item) => (
              <Card key={item.ticketId}>
                <CardHeader>
                  <CardTitle className="text-base">{item.ticketTitle}</CardTitle>
                  <CardDescription>{item.lastBody || item.status}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/provider/maintenance/${item.ticketId}`} />}
                    nativeButton={false}
                  >
                    Open
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {!maintenance.length ? (
              <p className="text-sm text-muted-foreground">No maintenance conversations.</p>
            ) : null}
          </div>
        </section>
      </div>
    </Shell>
  );
}

async function ProviderReports({ userId }: { userId: string }) {
  const [occupancies, charges, payments] = await Promise.all([
    listOccupanciesForProvider(userId),
    listAllChargesForProvider(userId),
    listAllPaymentsForProvider(userId),
  ]);
  const charged = charges
    .filter((item) => item.status !== "void")
    .reduce((sum, item) => sum + item.amountMwk, 0);
  const confirmed = payments
    .filter((item) => item.status === "confirmed")
    .reduce((sum, item) => sum + item.amountMwk, 0);
  return (
    <Shell
      eyebrow="Provider"
      title="Reports"
      description="Operational totals calculated from your current records."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Active occupancies",
            value: String(occupancies.filter((item) => item.status === "active").length),
          },
          { label: "Charges recorded", value: formatMwk(charged) },
          { label: "Confirmed payments", value: formatMwk(confirmed) },
          { label: "Outstanding", value: formatMwk(Math.max(charged - confirmed, 0)) },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle>{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Export boundary</CardTitle>
          <CardDescription>
            Reports display ledger records only. Dzaleka Spaces does not hold or settle funds.
          </CardDescription>
        </CardHeader>
      </Card>
    </Shell>
  );
}

async function ProviderDocuments({ userId }: { userId: string }) {
  const [payments, maintenance] = await Promise.all([
    listAllPaymentsForProvider(userId),
    listMyMaintenanceDocuments(userId),
  ]);
  return (
    <Shell
      eyebrow="Provider"
      title="Documents"
      description="Confirmed receipts and maintenance files available to your provider account."
    >
      <div className="flex flex-col gap-3">
        {payments
          .filter((item) => item.receiptNumber)
          .map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{item.receiptNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.spaceTitle} · {item.paymentDate}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/provider/payments/${item.id}`} />}
                  nativeButton={false}
                >
                  Open receipt
                </Button>
              </CardContent>
            </Card>
          ))}
        {maintenance.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{item.fileName}</p>
                <p className="text-sm text-muted-foreground">{item.ticketTitle}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/api/maintenance-documents/${item.id}`} />}
                nativeButton={false}
              >
                Open file
              </Button>
            </CardContent>
          </Card>
        ))}
        {!payments.some((item) => item.receiptNumber) && !maintenance.length ? (
          <p className="text-sm text-muted-foreground">No provider documents are available yet.</p>
        ) : null}
      </div>
    </Shell>
  );
}

async function ProviderExpenses({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("provider_expenses")
    .select("id, amount_mwk, occurred_on, category, description")
    .eq("provider_id", userId)
    .order("occurred_on", { ascending: false })
    .limit(100);
  return (
    <Shell
      eyebrow="Provider"
      title="Expenses"
      description="Record operating costs for your own reports. These are private ledger notes, not platform-held funds."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="flex flex-col gap-2">
          {(data ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{item.category}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.occurred_on}
                    {item.description ? ` · ${item.description}` : ""}
                  </p>
                </div>
                <strong>{formatMwk(item.amount_mwk)}</strong>
              </CardContent>
            </Card>
          ))}
          {!data?.length ? (
            <p className="text-sm text-muted-foreground">No expenses recorded.</p>
          ) : null}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Record expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderExpenseForm />
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

async function ProviderDeposits({ userId }: { userId: string }) {
  const charges = (await listAllChargesForProvider(userId)).filter((item) =>
    item.description?.toLowerCase().includes("deposit")
  );
  return (
    <Shell
      eyebrow="Provider"
      title="Deposit records"
      description="Deposit charges and confirmations are records only. The platform never holds deposits."
    >
      <div className="flex flex-col gap-2">
        {charges.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{item.spaceTitle}</p>
                <p className="text-sm text-muted-foreground">
                  Due {item.dueDate} · {item.status}
                </p>
              </div>
              <strong>{formatMwk(item.amountMwk)}</strong>
            </CardContent>
          </Card>
        ))}
        {!charges.length ? (
          <p className="text-sm text-muted-foreground">No deposit charges recorded.</p>
        ) : null}
      </div>
    </Shell>
  );
}

async function ProviderSpaceDetail({ spaceId, edit }: { spaceId: string; edit: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spaces")
    .select(
      "id, category, landmark, description, capacity, facilities, zones(name), listings(id, title, status)"
    )
    .eq("id", spaceId)
    .maybeSingle();
  if (!data) notFound();
  if (edit) {
    const action = updateProviderSpace.bind(null, spaceId);
    return (
      <Shell
        eyebrow="Provider space"
        title={`Edit ${categoryLabel(data.category)}`}
        description="Update public approximate details. Exact locations remain restricted."
      >
        <Card>
          <CardContent className="pt-4">
            <form action={action}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="space-landmark">Approximate landmark</FieldLabel>
                  <Input
                    id="space-landmark"
                    name="landmark"
                    defaultValue={data.landmark}
                    minLength={3}
                    required
                  />
                  <FieldDescription>
                    Use a general landmark. Do not enter household coordinates or a precise door
                    location.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="space-description">Description</FieldLabel>
                  <Textarea
                    id="space-description"
                    name="description"
                    defaultValue={data.description}
                    minLength={20}
                    maxLength={3000}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="space-capacity">Capacity</FieldLabel>
                  <Input
                    id="space-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    defaultValue={data.capacity ?? ""}
                  />
                </Field>
                <Field orientation="horizontal">
                  <Button type="submit">Save space</Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </Shell>
    );
  }
  const zoneValue = data.zones as unknown as { name?: string } | { name?: string }[] | null;
  const zone = Array.isArray(zoneValue) ? zoneValue[0]?.name : zoneValue?.name;
  const facilities = Array.isArray(data.facilities)
    ? data.facilities.filter((facility): facility is string => typeof facility === "string")
    : [];
  return (
    <Shell
      eyebrow="Provider space"
      title={categoryLabel(data.category)}
      description={`${zone ?? "Zone not set"} · ${data.landmark}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>Space record</CardTitle>
          <CardDescription>{data.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {facilities.map((facility) => (
            <Badge key={facility} variant="secondary">
              {facility.replace(/_/g, " ")}
            </Badge>
          ))}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button render={<Link href={`/provider/spaces/${spaceId}/edit`} />} nativeButton={false}>
            Edit
          </Button>
          <Button
            variant="outline"
            render={<Link href="/provider/listings" />}
            nativeButton={false}
          >
            Listings
          </Button>
        </CardFooter>
      </Card>
    </Shell>
  );
}

async function ProviderVerificationDetail({ verificationId }: { verificationId: string }) {
  const { data } = await (
    await createClient()
  )
    .from("verifications")
    .select("id, status, verified_at, reverify_by, created_at, listings(title)")
    .eq("id", verificationId)
    .maybeSingle();
  if (!data) notFound();
  const listingValue = data.listings as unknown as { title?: string } | { title?: string }[] | null;
  const title = Array.isArray(listingValue) ? listingValue[0]?.title : listingValue?.title;
  return (
    <Shell
      eyebrow="Verification"
      title={title ?? "Listing verification"}
      description="Evidence remains private to assigned verifiers and authorised reviewers."
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Status</CardTitle>
            <Badge variant="outline">{data.status}</Badge>
          </div>
          <CardDescription>
            Created {new Date(data.created_at).toLocaleDateString("en-MW")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {data.verified_at
              ? `Checked ${new Date(data.verified_at).toLocaleDateString("en-MW")}`
              : "Field verification is not complete."}
          </p>
          {data.reverify_by ? (
            <p className="mt-2 text-sm text-muted-foreground">Recheck by {data.reverify_by}</p>
          ) : null}
        </CardContent>
      </Card>
    </Shell>
  );
}

async function ProviderWorkOrderDetail({ workOrderId }: { workOrderId: string }) {
  const { data } = await (
    await createClient()
  )
    .from("maintenance_work_orders")
    .select(
      "id, status, scheduled_for, completion_notes, created_at, maintenance_tickets(id, title, category)"
    )
    .eq("id", workOrderId)
    .maybeSingle();
  if (!data) notFound();
  const ticketValue = data.maintenance_tickets as unknown as
    | { id?: string; title?: string; category?: string }
    | { id?: string; title?: string; category?: string }[]
    | null;
  const ticket = Array.isArray(ticketValue) ? ticketValue[0] : ticketValue;
  return (
    <Shell
      eyebrow="Work order"
      title={ticket?.title ?? "Maintenance work order"}
      description={ticket?.category ?? "Maintenance assignment"}
    >
      <Card>
        <CardHeader>
          <div className="flex justify-between gap-3">
            <CardTitle>Work status</CardTitle>
            <Badge variant="outline">{data.status}</Badge>
          </div>
          <CardDescription>
            {data.scheduled_for
              ? `Scheduled ${new Date(data.scheduled_for).toLocaleString("en-MW")}`
              : "Schedule not set"}
          </CardDescription>
        </CardHeader>
        <CardContent>{data.completion_notes || "No completion notes recorded."}</CardContent>
        <CardFooter>
          <Button
            variant="outline"
            render={<Link href={`/provider/maintenance/${ticket?.id}`} />}
            nativeButton={false}
          >
            <Wrench data-icon="inline-start" />
            Open maintenance request
          </Button>
        </CardFooter>
      </Card>
    </Shell>
  );
}
