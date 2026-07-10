#!/usr/bin/env node
// Apply a SQL file to the Supabase Postgres database via DIRECT_URL.
// Usage: node scripts/db-apply.mjs supabase/migrations/00001_init.sql
// Requires DIRECT_URL in .env.local (session-mode pooler) and `pg`
// (npm install --no-save pg).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { basename, dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const pg = require("pg");

const file = process.argv[2];
const checkOnly = process.argv.includes("--check");
if (!file) {
  console.error("Usage: node scripts/db-apply.mjs <file.sql> [--check]");
  process.exit(1);
}

const env = readFileSync(join(root, ".env.local"), "utf8");
const directUrl = env.match(/DIRECT_URL="?([^"\n]+)"?/)?.[1];
if (!directUrl) throw new Error("DIRECT_URL not found in .env.local");

const sql = readFileSync(file, "utf8");
const migrationName = basename(file);
const version =
  migrationName.match(/^(\d+)/)?.[1] ?? (migrationName === "seed.sql" ? "seed" : undefined);
if (!version) throw new Error("Migration filename must begin with a numeric version");
const checksum = createHash("sha256").update(sql).digest("hex");
const client = new pg.Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
  query_timeout: 120_000,
});

await client.connect();
try {
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(hashtext('dzaleka_spaces_migrations'))");
  await client.query(`
    create table if not exists public.app_schema_migrations (
      version text primary key,
      name text not null,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  const existing = await client.query(
    "select checksum from public.app_schema_migrations where version = $1",
    [version]
  );
  if (existing.rows[0]) {
    if (existing.rows[0].checksum !== checksum) {
      throw new Error(`Migration ${version} was already applied with a different checksum`);
    }
    await client.query("rollback");
    console.log(`Migration ${migrationName} is already applied`);
  } else {
    await client.query(sql);
    if (checkOnly) {
      await client.query("rollback");
      console.log(`Validated ${file} (rolled back)`);
    } else {
      await client.query(
        "insert into public.app_schema_migrations (version, name, checksum) values ($1, $2, $3)",
        [version, migrationName, checksum]
      );
      await client.query("commit");
      console.log(`Applied ${file}`);
    }
  }
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
