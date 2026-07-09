# File Upload Security

## Buckets

| Bucket | Public | Contents |
| --- | --- | --- |
| `listing-public` | yes (read) | Moderated listing photos |
| `verification-private` | no | Field-verification evidence |
| `enquiry-private` | no | Enquiry-thread attachments |
| `maintenance-private` | no | Maintenance ticket / work-order media |

Private buckets are served only through short-lived signed URLs issued by
authenticated API routes (`/api/enquiry-attachments/[id]`,
`/api/maintenance-documents/[id]`) after an RLS-backed access check.

## Controls

- **Storage RLS**: `storage.objects` policies mirror the owning record's
  access. Upload to `listing-public` requires `owns_space()` on the path's
  space id; private buckets require the matching participant or `is_staff()`.
- **Type and size limits** are set on each bucket
  (`allowed_mime_types`, `file_size_limit`) and re-checked client-side before
  upload.
- **EXIF/GPS stripping**: public images are re-encoded client-side
  (`src/lib/strip-image-client.ts`) before upload, removing location metadata.
- **Upsert needs INSERT + SELECT + UPDATE** — all three are granted where file
  replacement is allowed, none elsewhere.
- **Signed URLs expire**; never embed a private object path in a public view.
- **Backups are separate**: database backups do not include Storage. See
  `docs/operations/backup-and-restore.md`.

## Residual work before production

- Integrate malware scanning on upload (adapter placeholder).
- Moderator approval gate before a `listing-public` image becomes visible.
