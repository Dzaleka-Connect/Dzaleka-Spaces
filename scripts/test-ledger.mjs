#!/usr/bin/env node
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

if (!directUrl) {
  console.log("SKIP: DIRECT_URL not set — skipping ledger suite.");
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
    return null; // no error
  } catch (e) {
    await client.query("rollback to savepoint s");
    return e.message.split("\n")[0];
  }
}

async function main() {
  await client.connect();
  console.log("Payment Ledger Workflow & Trigger checks:");

  await client.query("begin");

  try {
    // 1. Get mock entities
    const zone = await client.query("select id from zones limit 1");
    const zoneId = zone.rows[0]?.id;

    // Create space & occupancy for testing
    const s = await client.query(
      "insert into spaces (category, zone_id, landmark, description) values ('shop', $1, 't', 't') returning id",
      [zoneId]
    );
    const spaceId = s.rows[0].id;

    // Create a mock provider and tenant user (triggers profile creation)
    const prov = await client.query(
      "insert into auth.users (id, email, aud, role) values (gen_random_uuid(), 'provider@test.com', 'authenticated', 'authenticated') returning id"
    );
    const providerId = prov.rows[0].id;

    const ten = await client.query(
      "insert into auth.users (id, email, aud, role) values (gen_random_uuid(), 'tenant@test.com', 'authenticated', 'authenticated') returning id"
    );
    const tenantId = ten.rows[0].id;

    // Link provider to space
    await client.query("update spaces set provider_id = $1 where id = $2", [providerId, spaceId]);

    const occ = await client.query(
      "insert into occupancies (space_id, provider_id, start_date, agreed_amount_mwk, status) values ($1, $2, current_date, 50000, 'active') returning id",
      [spaceId, providerId]
    );
    const occupancyId = occ.rows[0].id;

    // 2. Schedule Charge
    const chg = await client.query(
      "insert into charges (occupancy_id, amount_mwk, due_date, status, description) values ($1, 20000, current_date, 'unpaid', 'Rent Aug') returning id",
      [occupancyId]
    );
    const chargeId = chg.rows[0].id;
    assert("charge successfully created", !!chargeId);

    // 3. Record Payment (awaiting confirmation)
    const pay = await client.query(
      "insert into payment_records (occupancy_id, payer_id, amount_mwk, payment_date, method, status, external_reference) values ($1, $2, 20000, current_date, 'airtel_money', 'pending_confirmation', 'REF123') returning id",
      [occupancyId, tenantId]
    );
    const paymentId = pay.rows[0].id;
    assert("payment record successfully created", !!paymentId);

    // 4. Test unique external reference constraint
    const dupErr = await expectError("duplicate reference", async () => {
      await client.query(
        "insert into payment_records (occupancy_id, payer_id, amount_mwk, payment_date, method, status, external_reference) values ($1, $2, 10000, current_date, 'airtel_money', 'pending_confirmation', 'REF123')",
        [occupancyId, tenantId]
      );
    });
    assert(
      "duplicate external reference rejected for same provider",
      Boolean(dupErr && /duplicate/i.test(dupErr)),
      dupErr ?? "no error raised"
    );

    // 5. Test auto allocation status update
    // Add manual allocation first (auto allocation is triggered on confirm in app code)
    await client.query(
      "insert into payment_allocations (payment_id, charge_id, amount_mwk) values ($1, $2, 20000)",
      [paymentId, chargeId]
    );

    const updatedCharge = await client.query("select status from charges where id = $1", [
      chargeId,
    ]);
    assert(
      "charge status auto-updated to paid on full allocation",
      updatedCharge.rows[0].status === "paid",
      `status is ${updatedCharge.rows[0].status}`
    );
  } catch (e) {
    console.error("Test execution failed:", e);
    failed++;
  } finally {
    await client.query("rollback");
    await client.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Ledger suite crashed:", e.message);
  process.exit(1);
});
