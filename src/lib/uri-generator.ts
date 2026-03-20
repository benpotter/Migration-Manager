import type { PageNode } from "@/types";

/**
 * Recursively generates full URI paths from ancestor slugs for all pages in the tree.
 * Returns a Map of pageId -> full URI path (e.g., "/admissions/graduate/apply")
 */
export function generateAllURIPaths(nodes: PageNode[]): Map<string, string> {
  const uriMap = new Map<string, string>();

  function walk(node: PageNode, parentPath: string) {
    const segment = node.slug || slugify(node.name);
    const fullPath = parentPath === "/" ? `/${segment}` : `${parentPath}/${segment}`;
    uriMap.set(node.pageId, fullPath);
    for (const child of node.children) {
      walk(child, fullPath);
    }
  }

  for (const root of nodes) {
    walk(root, "");
  }

  return uriMap;
}

/** Count the number of path segments in a URI */
export function getURIDepth(uri: string): number {
  if (!uri || uri === "/") return 0;
  return uri.split("/").filter(Boolean).length;
}

/** Extract the last path segment from a URI */
export function getURISegment(uri: string): string {
  const segments = uri.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

/**
 * Truncate a deep URI for display, showing only the last N ancestor segments
 * with a `/.../` prefix. E.g., "/.../graduate/apply" for maxAncestors=2
 */
export function truncateURI(uri: string, maxAncestors: number = 3): string {
  const segments = uri.split("/").filter(Boolean);
  if (segments.length <= maxAncestors + 1) return uri;
  const kept = segments.slice(-(maxAncestors + 1));
  return `/.../${kept.join("/")}`;
}

/** Generate a URL-safe slug from a page name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
