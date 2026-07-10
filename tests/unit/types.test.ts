import { describe, expect, it } from "vitest";
import { categoryLabel, facilityLabel, formatMwk, listingHref } from "@/lib/types";

describe("domain formatting", () => {
  it("formats Malawi kwacha without implying platform custody", () => {
    expect(formatMwk(125000)).toBe("MWK 125,000");
  });

  it("uses the public slug when one exists", () => {
    expect(listingHref({ id: "space-id", slug: "kawale-shop" })).toBe("/spaces/kawale-shop");
    expect(listingHref({ id: "space-id", slug: null })).toBe("/spaces/space-id");
  });

  it("keeps unknown database labels readable instead of failing", () => {
    expect(categoryLabel("future_category")).toBe("future_category");
    expect(facilityLabel("future_facility")).toBe("future_facility");
  });
});
