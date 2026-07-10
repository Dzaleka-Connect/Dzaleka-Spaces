#!/usr/bin/env node
/**
 * RLS and workflow-guard test suite.
 *
 * Runs against the live database via DIRECT_URL and the Data API via the
 * publishable key. All mutating checks run inside transactions that are
 * rolled back, so the suite is side-effect free.
 *
 * Skips (exit 0) when DIRECT_URL is absent, so CI without database secrets
 * still passes. Exits non-zero on any failed assertion.
 *
 * Usage: node scripts/test-rls.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));

function readEnv() {
  const env = { ...process.env };
  try {
    const file = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {
    /* no .env.local in CI */
  }
  return env;
}

const env = readEnv();
const directUrl = env.DIRECT_URL;
const apiUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!directUrl) {
  console.log("SKIP: DIRECT_URL not set — skipping RLS suite.");
  process.exit(0);
}

const pg = require("pg");
const client = new pg.Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  query_timeout: 120_000,
});

let passed = 0;
let failed = 0;
function assert(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectError(label, fn) {
  await client.query("savepoint s");
  try {
    await fn();
    await client.query("rollback to savepoint s");
    return null; // no error → caller asserts failure
  } catch (e) {
    await client.query("rollback to savepoint s");
    return e.message.split("\n")[0];
  }
}

async function main() {
  await client.connect();
  console.log("Database workflow guards:");

  const zone = await client.query("select id from zones where active = true order by name limit 1");
  const zoneId = zone.rows[0]?.id;
  assert("an active zone exists for workflow tests", Boolean(zoneId));

  await client.query("begin");

  // 1. Residential publication blocked by feature flag.
  {
    const err = await expectError("residential gate", async () => {
      const s = await client.query(
        "insert into spaces (category, zone_id, landmark, description) values ('room', $1, 't', 't') returning id",
        [zoneId]
      );
      await client.query(
        "insert into space_internal (space_id, authority_basis) values ($1, 'current_recognised_occupier')",
        [s.rows[0].id]
      );
      await client.query(
        "insert into listings (space_id, slug, title, price_mwk, status) values ($1, 'rls-test-' || gen_random_uuid(), 't', 1000, 'published')",
        [s.rows[0].id]
      );
    });
    assert(
      "residential listing cannot be published while gated",
      Boolean(err && /residential/i.test(err)),
      err ?? "no error raised"
    );
  }

  // 2. Publication requires an authority record.
  {
    const err = await expectError("authority gate", async () => {
      const s = await client.query(
        "insert into spaces (category, zone_id, landmark, description) values ('shop', $1, 't', 't') returning id",
        [zoneId]
      );
      await client.query(
        "insert into listings (space_id, slug, title, price_mwk, status) values ($1, 'rls-test-' || gen_random_uuid(), 't', 1000, 'published')",
        [s.rows[0].id]
      );
    });
    assert(
      "listing cannot be published without authority record",
      Boolean(err && /authority/i.test(err)),
      err ?? "no error raised"
    );
  }

  // 3. Protected pilot flags cannot be enabled, even by a direct SQL role.
  {
    for (const flag of [
      "residential_listings",
      "family_accommodation",
      "mobile_money_processing",
      "deposit_processing",
      "sms_notifications",
      "whatsapp_notifications",
      "web_push_notifications",
    ]) {
      const err = await expectError(`protected flag ${flag}`, async () => {
        await client.query("update feature_flags set enabled = true where name = $1", [flag]);
      });
      assert(
        `${flag} remains locked off`,
        Boolean(err && /external operational approval/i.test(err)),
        err ?? "no error raised"
      );
    }
  }

  await client.query("rollback");

  console.log("Database security catalogue:");

  const migrations = await client.query(
    "select version from app_schema_migrations where version in ('00010', '00011', '00012') order by version"
  );
  assert(
    "hardening migrations are recorded",
    migrations.rows.map((row) => row.version).join(",") === "00010,00011,00012"
  );

  const privateTables = [
    "space_internal",
    "occupancies",
    "payment_records",
    "payment_receipts",
    "payment_disputes",
    "payment_adjustments",
    "viewing_private_details",
    "viewing_safety_checkins",
    "verification_assignments",
    "verification_evidence",
    "file_uploads",
    "privacy_requests",
    "audit_events",
    "email_delivery_events",
  ];
  const rls = await client.query(
    "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = any($1)",
    [privateTables]
  );
  const rlsByTable = new Map(rls.rows.map((row) => [row.relname, row.relrowsecurity]));
  for (const table of privateTables) {
    assert(`${table} has RLS enabled`, rlsByTable.get(table) === true);
  }

  const immutableTriggers = await client.query(`
    select tgname from pg_trigger
    where not tgisinternal and tgname in (
      'protect_payment_history',
      'protect_allocation_history',
      'protect_receipt_history',
      'protect_adjustment_history',
      'audit_events_append_only',
      'protected_feature_flags_guard',
      'listing_workflow_guard'
    )
  `);
  assert(
    "immutable ledger and workflow triggers are installed",
    immutableTriggers.rowCount === 7,
    `${immutableTriggers.rowCount} of 7 found`
  );

  const publicColumns = await client.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'public_listings'"
  );
  const publicColumnNames = new Set(publicColumns.rows.map((row) => row.column_name));
  for (const forbidden of [
    "exact_address",
    "latitude",
    "longitude",
    "authority_basis",
    "identity_document",
  ]) {
    assert(`public_listings omits ${forbidden}`, !publicColumnNames.has(forbidden));
  }

  const buckets = await client.query(
    "select id, public from storage.buckets where id in ('listing-public', 'verification-private', 'maintenance-private', 'message-private')"
  );
  assert("all required storage buckets exist", buckets.rowCount === 4);
  for (const bucket of buckets.rows) {
    assert(
      `${bucket.id} visibility is correct`,
      bucket.public === (bucket.id === "listing-public")
    );
  }

  // 4. Data API: anon exposure boundaries.
  if (apiUrl && anonKey) {
    console.log("Data API (anonymous) boundaries:");
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    const pub = await fetch(`${apiUrl}/rest/v1/public_listings?select=id&limit=1`, { headers });
    assert("anon can read public_listings", pub.status === 200);

    for (const table of [
      "space_internal",
      "occupancies",
      "assisted_listing_requests",
      "reports",
      "audit_events",
      "payment_records",
      "payment_receipts",
      "viewing_private_details",
      "viewing_safety_checkins",
      "verification_assignments",
      "verification_evidence",
      "file_uploads",
      "privacy_requests",
      "email_delivery_events",
    ]) {
      const res = await fetch(`${apiUrl}/rest/v1/${table}?select=*`, {
        headers,
      });
      const body = await res.json().catch(() => []);
      const rows = Array.isArray(body) ? body.length : 0;
      const denied = [401, 403, 404].includes(res.status);
      assert(
        `anon sees no ${table} rows`,
        denied || (res.status === 200 && rows === 0),
        `status ${res.status}, ${rows} rows`
      );
    }

    const claim = await fetch(`${apiUrl}/rest/v1/rpc/claim_notification_batch`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ batch_size: 1 }),
    });
    assert(
      "anon cannot claim notification work",
      [401, 403, 404].includes(claim.status),
      `status ${claim.status}`
    );
  } else {
    console.log("Data API checks skipped (no API URL / anon key).");
  }

  await client.end();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("RLS suite crashed:", e.message);
  process.exit(1);
});
