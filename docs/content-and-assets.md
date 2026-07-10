# Content and image assets

## Production photography

The public interface uses photography supplied by the Dzaleka Spaces product owner on 10 July 2026. Keep the source files outside the repository; commit only the web-ready files listed below.

| Asset                                    | Use                                                               | Required description                                                  |
| ---------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `public/dzaleka-marketplace.jpeg`        | Homepage hero and default Open Graph/Twitter image                | Shops, services and people along a commercial street in Dzaleka       |
| `public/dzaleka-community-overview.webp` | Clearly labelled fallback when a listing has no public photograph | Dzaleka community overview; this listing has no public photograph yet |

The marketplace image is the site-wide social preview. Listing pages replace it with the listing's
own public cover image when available. Social metadata resolves against `NEXT_PUBLIC_APP_URL`, which
must be `https://spaces.dzaleka.com` in production.

## Editorial safeguards

- Confirm publication rights and consent before replacing or adding identifiable photography.
- Do not use photographs of children as generic marketplace promotion without documented informed
  consent for that exact use.
- Do not publish identity documents, exact household coordinates, or evidence from private storage.
- A fallback image must say that it is a community overview and that the listing photograph is not
  yet available; it must never imply that it depicts the listed space.
- Alt text describes the visible scene and does not infer identity, legal status, ownership, or
  vulnerability.
- Remove obsolete assets and all code references together, then bump the service-worker cache name.

## Replacement checklist

1. Add the optimized image under `public/` with a descriptive, stable filename.
2. Update root metadata, relevant page metadata, visible image references, and `public/sw.js`.
3. Verify desktop and mobile crops, keyboard focus visibility, text contrast, and meaningful alt
   text.
4. Run `npm run check`, `npm run build`, and `npm run test:e2e` before release.
