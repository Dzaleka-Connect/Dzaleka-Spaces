# Mechanical checks (copy-paste)

Run from the repo root. These are tuned for this repo's `src/app` layout.

## Stubs, debug, TODOs

```bash
# TODO / FIXME / stray "coming soon" in shipped paths
grep -rn "TODO\|FIXME\|not implemented\|coming soon" src/ | grep -v "stubs/iceberg"

# Debug logs left behind (console.error in catch blocks is fine; console.log usually isn't)
grep -rn "console.log" src/

# Empty handlers / placeholder links
grep -rn 'onClick={() => {}}\|href="#"\|action={}' src/
```

## Dead internal links

Checks every literal `href="/..."` against an actual route file (handles dynamic
`[param]` segments):

```bash
node -e '
const fs=require("fs"), path=require("path");
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):[p]})}
const files=walk("src").filter(f=>/\.(tsx|ts)$/.test(f));
const hrefs=new Set();
for(const f of files){const s=fs.readFileSync(f,"utf8");
  for(const m of s.matchAll(/href="(\/[a-zA-Z0-9\/_-]*)"/g)) hrefs.add(m[1]);
}
function routeExists(url){
  const seg=url.split("/").filter(Boolean); let dir="src/app";
  for(const s of seg){
    const dyn=fs.existsSync(dir)?fs.readdirSync(dir).find(n=>n.startsWith("[")):null;
    if(fs.existsSync(path.join(dir,s))) dir=path.join(dir,s);
    else if(dyn) dir=path.join(dir,dyn); else return false;
  }
  return fs.existsSync(path.join(dir,"page.tsx"))||fs.existsSync(path.join(dir,"route.ts"));
}
const bad=[...hrefs].filter(h=>h!=="/"&&!routeExists(h)).sort();
console.log("static hrefs:",hrefs.size,"| DEAD:",bad.length?bad.join(", "):"none");
'
```

## redirect()/notFound() possibly inside try/catch

Flags files that contain a `try {`, a `catch`, and a `redirect(`/`notFound()` —
then read each to confirm the navigation call is OUTSIDE the try:

```bash
for f in $(grep -rl "redirect(\|notFound()" src/); do
  grep -q "try {" "$f" && grep -q "catch" "$f" && echo "REVIEW: $f"
done
```

## Stub-page detector

Short pages that never touch data are suspects. Compare line counts and whether
they query anything (directly or via a `lib/*` helper):

```bash
for f in $(find src/app -name page.tsx); do
  lines=$(wc -l < "$f")
  q=$(grep -c 'from("\|@/lib/' "$f")
  [ "$lines" -lt 40 ] && [ "$q" -eq 0 ] && echo "STUB? $f ($lines lines, no data)"
done
```

## New-migration RLS trio

For any new table in a migration, confirm all three are present:

```bash
# Replace 000NN with the migration number
grep -nE "create table|enable row level security|grant|create policy" supabase/migrations/000NN_*.sql
```

Every `create table` in `public` should be matched by an `enable row level
security`, at least one `create policy`, and appropriate `grant`s. Then add an
anon-exposure assertion to `scripts/test-rls.mjs` and run `npm run test:rls`.

## Secrets never public

```bash
# Only URL + publishable key may be NEXT_PUBLIC_. Anything else here is a leak.
grep -rn "NEXT_PUBLIC_" src/ | grep -iv "SUPABASE_URL\|SUPABASE_PUBLISHABLE_KEY\|SUPABASE_ANON_KEY"
```

## Raw Tailwind colors (palette discipline)

Should return nothing — the app uses semantic tokens
(`primary`, `success`, `featured`, `muted`, `destructive`), not raw hues:

```bash
grep -rnE "(bg|text|border|ring)-(red|green|blue|amber|emerald|teal|indigo|slate|zinc|gray|neutral)-[0-9]" src/ | grep -v "components/ui/"
```
