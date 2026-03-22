/**
 * Generate a page_id for a new page based on its parent and existing siblings.
 *
 * Format: "{parentPageId}.{nextIndex}" or "{nextTopLevelIndex}" for root pages.
 *
 * Examples:
 *   Root pages: "1", "2", "3"
 *   Under "1": "1.1", "1.2", "1.3"
 *   Under "1.2": "1.2.1", "1.2.2"
 */
export function generatePageId(
  parentPageId: string | null,
  existingSiblingPageIds: string[]
): string {
  if (!parentPageId) {
    // Root level — find next top-level index
    const topLevelNums = existingSiblingPageIds
      .filter((id) => !id.includes("."))
      .map((id) => parseInt(id, 10))
      .filter((n) => !isNaN(n));

    const nextNum = topLevelNums.length > 0 ? Math.max(...topLevelNums) + 1 : 1;
    return String(nextNum);
  }

  // Child of parent — find next child index
  const prefix = `${parentPageId}.`;
  const childNums = existingSiblingPageIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const suffix = id.slice(prefix.length);
      // Only direct children (no more dots)
      if (suffix.includes(".")) return NaN;
      return parseInt(suffix, 10);
    })
    .filter((n) => !isNaN(n));

  const nextNum = childNums.length > 0 ? Math.max(...childNums) + 1 : 1;
  return `${parentPageId}.${nextNum}`;
}

/**
 * Compute depth from a page_id string.
 * "1" → 1, "1.2" → 2, "1.2.3" → 3
 */
export function depthFromPageId(pageId: string): number {
  return pageId.split(".").length;
}

/**
 * Slugify a page name into a URL-safe slug.
 */
export function slugifyPageName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
