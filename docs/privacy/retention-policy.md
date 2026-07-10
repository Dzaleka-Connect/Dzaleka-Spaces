# Retention Policy

Aligned with the Malawi Data Protection Act 2024: collect the minimum, keep it
only as long as needed, delete on request where no obligation requires keeping.

## Schedule (pilot defaults — confirm in formal review)

| Record                       | Retention                                                |
| ---------------------------- | -------------------------------------------------------- |
| Public listing media         | Until listing removal + limited archive                  |
| Rejected listing evidence    | 12 months                                                |
| Identity documents           | Not stored by default; delete after any verification use |
| Verification decisions       | While the space remains active                           |
| Enquiries and messages       | 24 months                                                |
| Viewings                     | 24 months                                                |
| Occupancy records            | Arrangement period + operational retention               |
| Payment records (when added) | Per applicable financial obligations                     |
| Reports / cases              | By category and legal requirement                        |
| Exact coordinates            | While necessary for active verification                  |
| Notification delivery logs   | 90–180 days                                              |
| Analytics events             | Aggregated; raw events pruned on a rolling window        |
| Audit events                 | Longer, restricted retention                             |

## Subject rights

- Access, correction and deletion requests via the Contact page or support
  desk. Deletion honoured except where a record must be retained (e.g. a
  confirmed occupancy under dispute).
- Deletion cascades follow foreign keys (`on delete cascade`) so removing a
  profile removes its owned rows; shared records are anonymised
  (`on delete set null`) rather than deleted.

## Implementation notes

- Time-boxed pruning (notification logs, raw analytics) is a scheduled
  `pg_cron` job. Verify the job exists before relying on it.
- Never bulk-export case records; protection-sensitive cases are excluded from
  general analytics and exports.
