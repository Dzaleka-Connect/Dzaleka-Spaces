import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = [
  { path: "/", heading: "Find a shop, workspace or community venue" },
  { path: "/spaces", heading: "Browse spaces" },
  { path: "/services", heading: "Find help for repairs and maintenance" },
  { path: "/sign-in", heading: "Sign in" },
];

for (const entry of publicPages) {
  test(`${entry.path} is responsive and has no serious accessibility violations`, async ({
    page,
  }) => {
    await page.goto(entry.path);
    await expect(page.getByRole("heading", { level: 1, name: entry.heading })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      )
      .toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    );
    expect(serious).toEqual([]);
  });
}

test("public pages never expose exact-location language as listing data", async ({ page }) => {
  await page.goto("/spaces");
  await expect(page.getByText(/exact household coordinates/i)).toHaveCount(0);
  await expect(page.getByText(/zone and landmark/i).first()).toBeVisible();
});
