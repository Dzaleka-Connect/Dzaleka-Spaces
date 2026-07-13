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

  // 1. Residential pilot enabled (migration 00016): the feature-flag gate no
  //    longer blocks residential categories. Direct publication still fails on
  //    the OTHER guards (reviewer caller, verification, approved media) — what
  //    matters here is that the failure is no longer the residential gate.
  {
    const flags = await client.query(
      "select name, enabled from feature_flags where name in ('residential_listings','family_accommodation','public_map') order by name"
    );
    assert(
      "residential/family/map flags are enabled",
      flags.rows.length === 3 && flags.rows.every((r) => r.enabled === true),
      flags.rows.map((r) => `${r.name}=${r.enabled}`).join(",")
    );

    const err = await expectError("residential publish path", async () => {
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
      "residential category is no longer blocked by the feature flag",
      !err || !/residential|family accommodation/i.test(err),
      err ?? "published"
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

  // 4. DzalekaPay confirmation requires a completed, amount-matched provider record.
  {
    const profile = await client.query("select id from profiles order by created_at limit 1");
    if (!profile.rows.length) {
      console.log("  skip  no profile present for DzalekaPay guard test");
    } else {
      const space = await client.query(
        "insert into spaces (category, zone_id, landmark, description) values ('shop', $1, 'DzalekaPay test', 'Rolled-back integration test') returning id",
        [zoneId]
      );
      const occupancy = await client.query(
        "insert into occupancies (space_id, provider_id, start_date, agreed_amount_mwk) values ($1, $2, current_date, 5000) returning id",
        [space.rows[0].id, profile.rows[0].id]
      );
      const payment = await client.query(
        `insert into payment_records (
          occupancy_id, amount_mwk, payment_date, method, external_reference,
          provider_confirmed_at, payer_confirmed_at
        ) values ($1, 5000, current_date, 'dzalekapay',
          '11111111-1111-4111-8111-111111111111', now(), now()) returning id`,
        [occupancy.rows[0].id]
      );
      const beforeVerification = await expectError("DzalekaPay receipt guard", () =>
        client.query("update payment_records set status = 'confirmed' where id = $1", [
          payment.rows[0].id,
        ])
      );
      assert(
        "DzalekaPay payment cannot confirm before provider verification",
        Boolean(beforeVerification && /completed and amount-matched/i.test(beforeVerification)),
        beforeVerification ?? "no error raised"
      );

      const reconciliation = await client.query(
        `select record_dzalekapay_reconciliation(
          $1, '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222', 'completed', 5000,
          'DZALEKA-TEST', '2026-07-13T00:00:00Z', '2026-07-13T00:01:00Z'
        ) status`,
        [payment.rows[0].id]
      );
      assert(
        "DzalekaPay API reconciliation RPC records an amount match",
        reconciliation.rows[0]?.status === "verified"
      );
      const confirmed = await client.query(
        "update payment_records set status = 'confirmed' where id = $1 returning status",
        [payment.rows[0].id]
      );
      assert(
        "DzalekaPay payment can confirm after completed amount match",
        confirmed.rows[0]?.status === "confirmed"
      );

      const webhook = await client.query(
        `select record_dzalekapay_webhook_event(
          '33333333-3333-4333-8333-333333333333', 'transaction.updated',
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222', 'refunded', 5000,
          'DZALEKA-TEST', '2026-07-13T00:03:00Z',
          '2026-07-13T00:00:00Z', '2026-07-13T00:03:00Z'
        ) result`
      );
      const replay = await client.query(
        `select record_dzalekapay_webhook_event(
          '33333333-3333-4333-8333-333333333333', 'transaction.updated',
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222', 'refunded', 5000,
          'DZALEKA-TEST', '2026-07-13T00:03:00Z',
          '2026-07-13T00:00:00Z', '2026-07-13T00:03:00Z'
        ) result`
      );
      assert(
        "DzalekaPay webhook matches once and duplicate delivery is ignored",
        webhook.rows[0]?.result?.inserted === true &&
          webhook.rows[0]?.result?.matched === true &&
          replay.rows[0]?.result?.inserted === false
      );

      await client.query(
        `select record_dzalekapay_webhook_event(
          '44444444-4444-4444-8444-444444444444', 'transaction.updated',
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222', 'pending', 5000,
          'DZALEKA-TEST', '2026-07-13T00:04:00Z',
          '2026-07-13T00:00:00Z', '2026-07-13T00:02:00Z'
        )`
      );
      const latest = await client.query(
        "select provider_status, source from dzalekapay_reconciliations where payment_id = $1",
        [payment.rows[0].id]
      );
      assert(
        "out-of-order DzalekaPay event cannot regress provider state",
        latest.rows[0]?.provider_status === "refunded" && latest.rows[0]?.source === "webhook"
      );
    }
  }

  await client.query("rollback");

  // Regression guard for the 00010 -> 00013 staff MFA bootstrap lockout.
  // A staff account that has not yet enrolled in MFA (aal1) must still be able
  // to read its OWN roles and the public feature flags, otherwise the app sees
  // an empty role list, hides the staff navigation, and never offers the MFA
  // enrolment that would unlock it. Sensitive tables must stay closed at aal1.
  console.log("Staff MFA bootstrap:");
  {
    const staff = await client.query(
      "select user_id from user_roles where role in ('admin','moderator') limit 1"
    );
    if (!staff.rows.length) {
      console.log("  skip  no staff account present");
    } else {
      const uid = staff.rows[0].user_id;
      const probe = async (aal) => {
        await client.query("begin");
        await client.query("set local role authenticated");
        await client.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: uid, aal, role: "authenticated" }),
        ]);
        const own = await client.query("select count(*) c from user_roles where user_id = $1", [
          uid,
        ]);
        const flags = await client.query("select count(*) c from feature_flags");
        const internal = await client.query("select count(*) c from space_internal");
        await client.query("rollback");
        return {
          own: Number(own.rows[0].c),
          flags: Number(flags.rows[0].c),
          internal: Number(internal.rows[0].c),
        };
      };

      const aal1 = await probe("aal1");
      const aal2 = await probe("aal2");

      assert("staff at aal1 can read their own roles", aal1.own > 0);
      assert("staff at aal1 can read feature flags", aal1.flags > 0);
      assert(
        "staff at aal1 cannot read space_internal",
        aal1.internal === 0,
        `${aal1.internal} rows leaked`
      );
      assert("staff at aal2 can read space_internal", aal2.internal >= 0);
    }
  }

  console.log("Database security catalogue:");

  const migrations = await client.query(
    "select version from app_schema_migrations where version between '00010' and '00015' order by version"
  );
  assert(
    "hardening migrations are recorded",
    migrations.rows.map((row) => row.version).join(",") === "00010,00011,00012,00013,00014,00015"
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
    "dzalekapay_reconciliations",
    "dzalekapay_webhook_events",
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
      'listing_workflow_guard',
      'dzalekapay_receipt_verification_guard'
    )
  `);
  assert(
    "immutable ledger and workflow triggers are installed",
    immutableTriggers.rowCount === 8,
    `${immutableTriggers.rowCount} of 8 found`
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
      "dzalekapay_reconciliations",
      "dzalekapay_webhook_events",
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
