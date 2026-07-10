import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

// Supabase origins the browser talks to: REST/Auth over https, Realtime over
// wss, Storage images over https. Derived from the public URL when present.
function supabaseOrigins(): { https: string; wss: string } {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw) {
    try {
      const host = new URL(raw).host;
      return { https: `https://${host}`, wss: `wss://${host}` };
    } catch {
      /* fall through to wildcard */
    }
  }
  return { https: "https://*.supabase.co", wss: "wss://*.supabase.co" };
}

function buildCsp(nonce: string): string {
  const sb = supabaseOrigins();
  const directives = [
    `default-src 'self'`,
    // Nonce + strict-dynamic: only Next's nonced bootstrap and what it loads
    // may run. 'unsafe-eval' is dev-only (React debug uses eval).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Base UI components set inline style attributes for positioning, so
    // style-src keeps 'unsafe-inline' (styles are low XSS risk).
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${sb.https}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${sb.https} ${sb.wss}${isDev ? " ws: http://localhost:*" : ""}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `media-src 'self' blob: ${sb.https}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

function applySecurityHeaders(headers: Headers, csp: string) {
  headers.set("Content-Security-Policy", csp);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-DNS-Prefetch-Control", "on");
  // Verifier PWA captures photos and coordinates, so self is allowed there.
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(self), interest-cohort=()"
  );
  if (!isDev) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Forward the nonce so the root layout and Next's script injector can use it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const makeResponse = () => NextResponse.next({ request: { headers: requestHeaders } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = makeResponse();

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = makeResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refreshes the session so server components always see a valid user.
    await supabase.auth.getClaims();
  }

  applySecurityHeaders(response.headers, csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
