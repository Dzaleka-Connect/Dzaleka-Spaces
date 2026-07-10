#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const roots = [join(root, "src", "app"), join(root, "src", "components")];
const extensions = new Set([".ts", ".tsx"]);
const failures = [];

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const rules = [
  {
    name: "legacy legal-role vocabulary",
    pattern: /\b(?:tenant|tenants|landlord|landlords)\b/i,
  },
  {
    name: "raw select outside the UI primitive",
    pattern: /<select\b/,
  },
  {
    name: "disallowed letter-spacing utility",
    pattern: /tracking-(?:tight|wide|wider|widest)/,
  },
  {
    name: "oversized rounded surface",
    pattern: /rounded-(?:xl|2xl|3xl|4xl)/,
  },
  {
    name: "fabricated payment processing result",
    pattern: /(?:payment initiated|transaction verified successfully)/i,
  },
];

for (const file of roots.flatMap(filesUnder).filter((path) => extensions.has(extname(path)))) {
  if (file.includes(`${join("components", "ui")}`)) continue;
  const content = readFileSync(file, "utf8");
  for (const rule of rules) {
    const match = content.match(rule.pattern);
    if (!match || match.index === undefined) continue;
    const line = content.slice(0, match.index).split("\n").length;
    failures.push(`${relative(root, file)}:${line} ${rule.name}: ${match[0]}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Content and UI guard checks passed.");
