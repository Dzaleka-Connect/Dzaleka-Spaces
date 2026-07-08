#!/usr/bin/env node
// Apply a SQL file to the Supabase Postgres database via DIRECT_URL.
// Usage: node scripts/db-apply.mjs supabase/migrations/00001_init.sql
// Requires DIRECT_URL in .env.local (session-mode pooler) and `pg`
// (npm install --no-save pg).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const pg = require("pg");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/db-apply.mjs <file.sql>");
  process.exit(1);
}

const env = readFileSync(join(root, ".env.local"), "utf8");
const directUrl = env.match(/DIRECT_URL="?([^"\n]+)"?/)?.[1];
if (!directUrl) throw new Error("DIRECT_URL not found in .env.local");

const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`Applied ${file}`);
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
