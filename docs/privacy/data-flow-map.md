# Data Flow Map

## Personal data by flow

| Data | Collected at | Stored in | Exposed to |
| --- | --- | --- | --- |
| Email, name, phone, WhatsApp, language | sign-up, `/account/profile` | `profiles` | self; name public only on published listings |
| Roles | admin grant | `user_roles` | self + staff |
| Space details, photos | `/list-a-space`, provider portal | `spaces`, `space_media`, `listing-public` bucket | public when published |
| Exact location, authority evidence | submission, verifier visit | `space_internal`, `verification-private` bucket | staff only |
| Enquiry contact + messages + attachments | listing enquiry, threads | `enquiries`, `enquiry_messages`, `enquiry-private` bucket | thread participants + staff |
| Viewing details | viewing workflow | `viewings` | enquiry participants + staff |
| Occupancy terms + parties | provider portal | `occupancies`, `occupancy_parties` | parties + staff |
| Maintenance ticket + media | account/provider portal | `maintenance_*`, `maintenance-private` bucket | ticket parties, assigned trade, staff |
| Reports / cases | report action | `reports`, `moderation_cases`, `case_events` | staff only; reporter hidden from reported |
| Audit trail | server actions | `audit_events` | admin only |
| Analytics | page/events | `analytics_events` | aggregate only, no PII/locations |
| Notifications | workflow triggers | `notification_*`; email via Resend | recipient |

## External processors

- **Supabase** — database, auth, storage, realtime (data controller's
  infrastructure).
- **Resend** — transactional email only; recipient address + message body.
  Disabled unless `RESEND_API_KEY` + `EMAIL_FROM` are set.

## Never collected / never public

- Refugee ID numbers; no connection to UNHCR registration.
- Exact household coordinates on any public surface (view, map, analytics).
- Identity documents as a condition of use.
