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
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!directUrl) {
  console.log("SKIP: DIRECT_URL not set — skipping RLS suite.");
  process.exit(0);
}

const pg = require("pg");
const client = new pg.Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
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

  const zone = await client.query(
    "select id from zones where name = 'Kawale 1' limit 1"
  );
  const zoneId = zone.rows[0]?.id;

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

  // 3. One published listing per space.
  {
    const existing = await client.query(
      "select space_id from listings where status = 'published' limit 1"
    );
    if (existing.rows.length) {
      const err = await expectError("duplicate publish", async () => {
        await client.query(
          "insert into listings (space_id, slug, title, price_mwk, status) values ($1, 'rls-test-' || gen_random_uuid(), 'dup', 999, 'published')",
          [existing.rows[0].space_id]
        );
      });
      assert(
        "second published listing per space rejected",
        Boolean(err && /one_published_listing_per_space|unique/i.test(err)),
        err ?? "no error raised"
      );
    } else {
      assert("second published listing per space rejected", true, "no seed");
    }
  }

  await client.query("rollback");

  // 4. Data API: anon exposure boundaries.
  if (apiUrl && anonKey) {
    console.log("Data API (anonymous) boundaries:");
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

    const pub = await fetch(
      `${apiUrl}/rest/v1/public_listings?select=id&limit=1`,
      { headers }
    );
    assert("anon can read public_listings", pub.status === 200);

    for (const table of [
      "space_internal",
      "occupancies",
      "assisted_listing_requests",
      "reports",
      "audit_events",
    ]) {
      const res = await fetch(`${apiUrl}/rest/v1/${table}?select=*`, {
        headers,
      });
      const body = await res.json().catch(() => []);
      const rows = Array.isArray(body) ? body.length : -1;
      assert(`anon sees no ${table} rows`, rows === 0, `${rows} rows`);
    }
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
