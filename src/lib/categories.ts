import "server-only";

import { featureEnabled } from "./features";
import { FAMILY_CATEGORY_VALUES, RESIDENTIAL_CATEGORY_VALUES, SPACE_CATEGORIES } from "./types";

export interface CategoryOption {
  value: string;
  label: string;
}

/**
 * The category catalogue filtered by the residential feature flags, so
 * turning a flag off removes the category from every public surface (home
 * grid, filters, submission form, category pages) without code changes.
 */
export async function getAvailableCategories(): Promise<CategoryOption[]> {
  const [residential, family] = await Promise.all([
    featureEnabled("residential_listings"),
    featureEnabled("family_accommodation"),
  ]);

  return SPACE_CATEGORIES.filter((c) => {
    if ((RESIDENTIAL_CATEGORY_VALUES as readonly string[]).includes(c.value)) {
      return residential;
    }
    if ((FAMILY_CATEGORY_VALUES as readonly string[]).includes(c.value)) {
      return family;
    }
    return true;
  }).map((c) => ({ value: c.value, label: c.label }));
}

export async function categoryAvailable(value: string): Promise<boolean> {
  const categories = await getAvailableCategories();
  return categories.some((c) => c.value === value);
}
