#!/usr/bin/env node
// Grant the admin role to an existing user by email.
// Usage: node scripts/grant-admin.mjs someone@example.com
// The user must have signed in at least once (profile row exists).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const pg = require("pg");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email>");
  process.exit(1);
}

const env = readFileSync(join(root, ".env.local"), "utf8");
const directUrl = env.match(/DIRECT_URL="?([^"\n]+)"?/)?.[1];
if (!directUrl) throw new Error("DIRECT_URL not found in .env.local");

const client = new pg.Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const user = await client.query(
    "select id from auth.users where email = $1",
    [email]
  );
  if (!user.rows.length) {
    console.error(`No user with email ${email}. Sign in once first.`);
    process.exitCode = 1;
  } else {
    await client.query(
      `insert into user_roles (user_id, role) values ($1, 'admin')
       on conflict do nothing`,
      [user.rows[0].id]
    );
    console.log(`Granted admin to ${email}`);
  }
} finally {
  await client.end();
}
