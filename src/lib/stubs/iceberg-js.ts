// Stub for `iceberg-js`, a hard import in @supabase/storage-js >= 2.110 that is
// only referenced inside the (unused) Iceberg analytics-catalog code path.
// Dzaleka Spaces never touches Iceberg buckets, so this stub keeps the bundle
// resolvable without pulling in the real dependency. If any Iceberg method is
// ever called, it fails loudly rather than silently misbehaving.
export class IcebergRestCatalog {
  constructor() {
    throw new Error(
      "iceberg-js is stubbed out in Dzaleka Spaces; the Iceberg catalog is not used."
    );
  }
}

const stub = { IcebergRestCatalog };
export default stub;
