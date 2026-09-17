import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCsp, shouldUseNonce } from "@/proxy";

describe("Content Security Policy configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NETLIFY;
    delete process.env.CSP_NONCE_ENABLED;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to strict nonce CSP in standard Node/Render environments", () => {
    expect(shouldUseNonce()).toBe(true);
    const csp = buildCsp("test-nonce-123");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce-123' 'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("https://*.netlify.app");
  });

  it("switches to Netlify-compatible allowlist CSP when NETLIFY=true", () => {
    process.env.NETLIFY = "true";
    expect(shouldUseNonce()).toBe(false);
    const csp = buildCsp("test-nonce-123");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("https://*.netlify.app");
    expect(csp).toContain("https://netlify-cdp.netlify.app");
    expect(csp).not.toContain("strict-dynamic");
    expect(csp).not.toContain("nonce-test-nonce-123");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("allows explicit override with CSP_NONCE_ENABLED=true on Netlify", () => {
    process.env.NETLIFY = "true";
    process.env.CSP_NONCE_ENABLED = "true";
    expect(shouldUseNonce()).toBe(true);
    const csp = buildCsp("override-nonce");
    expect(csp).toContain("nonce-override-nonce");
    expect(csp).toContain("strict-dynamic");
  });

  it("allows explicit override with CSP_NONCE_ENABLED=false off Netlify", () => {
    process.env.CSP_NONCE_ENABLED = "false";
    expect(shouldUseNonce()).toBe(false);
    const csp = buildCsp("any-nonce");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("strict-dynamic");
  });
});
