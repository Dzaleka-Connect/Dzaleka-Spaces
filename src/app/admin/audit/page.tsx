import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info, ScrollText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Audit log",
};

interface AuditPageProps {
  searchParams: Promise<{ entity?: string }>;
}

const ENTITY_FILTERS = ["listing", "user", "occupancy", "verification"];

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            The audit log is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!hasRole(user, "admin")) redirect("/admin");

  const { entity } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_events")
    .select(
      "id, actor_id, actor_role, action, entity, entity_id, before_state, after_state, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (entity) query = query.eq("entity", entity);

  const { data: events } = await query;

  const actorIds = [
    ...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean)),
  ] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const actorById = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name as string])
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="mt-1 text-muted-foreground">
          Append-only record of significant actions. Showing the latest 100
          events{entity ? ` for ${entity} records` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={!entity ? "default" : "outline"}
          size="sm"
          render={<Link href="/admin/audit" />}
          nativeButton={false}
        >
          All
        </Button>
        {ENTITY_FILTERS.map((e) => (
          <Button
            key={e}
            variant={entity === e ? "default" : "outline"}
            size="sm"
            render={<Link href={`/admin/audit?entity=${e}`} />}
            nativeButton={false}
          >
            {e}
          </Button>
        ))}
      </div>

      {(events ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>No audit events</EmptyTitle>
            <EmptyDescription>
              Actions like publication decisions, role changes and occupancy
              updates appear here as they happen.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(events ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {e.actor_id
                    ? (actorById.get(e.actor_id) ?? "User")
                    : "System"}
                  {e.actor_role ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({e.actor_role})
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">{e.action}</TableCell>
                <TableCell>
                  <Badge variant="outline">{e.entity}</Badge>
                </TableCell>
                <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                  {e.after_state
                    ? JSON.stringify(e.after_state)
                    : e.before_state
                      ? JSON.stringify(e.before_state)
                      : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
