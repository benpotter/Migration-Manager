import { PageRow, PageNode } from "@/types";

/**
 * Infer candidate parent page_ids from a page_id string.
 * Returns candidates in priority order (most specific first).
 * Two conventions exist:
 *   ".0" section roots:  "1.1" → parent "1.0",  "1.2.0" → parent "1.0"
 *   Simple hierarchy:    "1.1.1.20.1" → parent "1.1.1.20"
 */
export function inferParentCandidates(pageId: string): string[] {
  const segments = pageId.split(".");
  if (segments.length <= 1) return [];
  const candidates: string[] = [];
  const lastSegment = segments[segments.length - 1];

  if (lastSegment === "0") {
    // Section root: e.g. "1.0" → root, "1.2.0" → "1.0" or "1.2"
    if (segments.length === 2) return []; // top-level section root
    candidates.push(segments.slice(0, -2).join(".") + ".0"); // ".0" convention
    candidates.push(segments.slice(0, -2).join("."));         // simple convention
  } else {
    candidates.push(segments.slice(0, -1).join(".") + ".0"); // ".0" convention
    candidates.push(segments.slice(0, -1).join("."));         // simple convention
  }

  // Deduplicate (e.g. "1.0" appears in both when parent prefix is "1")
  return [...new Set(candidates)];
}

/** Infer parent page_id from a page_id string. Returns null for roots.
 *  Uses ".0" convention by default. For smarter resolution with an existing
 *  page set, use inferParentCandidates() instead. */
export function inferParentPageId(pageId: string): string | null {
  const candidates = inferParentCandidates(pageId);
  return candidates.length > 0 ? candidates[0] : null;
}

/** Infer parent page_id, preferring candidates that exist in the given set. */
export function inferParentFromSet(pageId: string, existingIds: Set<string>): string | null {
  const candidates = inferParentCandidates(pageId);
  for (const c of candidates) {
    if (existingIds.has(c)) return c;
  }
  return candidates.length > 0 ? candidates[0] : null;
}

/** Natural sort comparator for page IDs like "1.2" vs "1.10" */
export function naturalSortPageId(a: string, b: string): number {
  const aParts = a.split(".").filter(s => s !== "").map(Number);
  const bParts = b.split(".").filter(s => s !== "").map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] ?? -1;
    const bVal = bParts[i] ?? -1;
    if (aVal !== bVal) return aVal - bVal;
  }
  return 0;
}

function countDescendants(node: PageNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

export function buildTree(pages: PageRow[]): PageNode[] {
  // Deduplicate pages by normalized page_id (strip trailing dots).
  // If a DB has both "3.2." and "3.2", keep the one without the trailing dot.
  const deduped = new Map<string, PageRow>();
  for (const page of pages) {
    const normalizedId = page.page_id.replace(/\.+$/, "");
    const existing = deduped.get(normalizedId);
    // Prefer the row whose page_id is already clean (no trailing dot)
    if (!existing || existing.page_id !== normalizedId) {
      deduped.set(normalizedId, { ...page, page_id: normalizedId });
    }
  }
  const cleanPages = Array.from(deduped.values());

  // Build a sort_order lookup map for O(1) access during sorting
  const sortOrderMap = new Map<string, number>();
  for (const page of cleanPages) {
    sortOrderMap.set(page.page_id, page.sort_order ?? 0);
  }

  // 1. Create maps: uuid -> PageNode and page_id string -> PageNode
  const nodeMap = new Map<string, PageNode>();
  const pageIdToNode = new Map<string, PageNode>();

  for (const page of cleanPages) {
    if (page.is_archived) continue;
    const node: PageNode = {
      id: page.id,
      pageId: page.page_id,
      name: page.name,
      slug: page.slug,
      pageStyle: page.page_style,
      status: page.status,
      contentResponsibility: page.content_responsibility,
      migrationOwner: page.migration_owner,
      migrator: page.migrator,
      mcTemplate: page.mc_template,
      childCount: 0,
      children: [],
    };
    nodeMap.set(page.id, node);
    pageIdToNode.set(page.page_id, node);
  }

  // 2. Build parent-child relationships
  //    parent_page_id may be a UUID (manual creation) or a text page_id (Excel import)
  const roots: PageNode[] = [];

  for (const page of cleanPages) {
    if (page.is_archived) continue;
    const node = nodeMap.get(page.id)!;
    // Resolve parent: try stored parent_page_id first, then infer from page_id structure
    let parentNode: PageNode | undefined = undefined;
    if (page.parent_page_id) {
      const normalizedParent = page.parent_page_id.replace(/\.+$/, "");
      parentNode = nodeMap.get(page.parent_page_id) ?? pageIdToNode.get(normalizedParent);
    }
    if (!parentNode) {
      // Try all inferred parent candidates (both ".0" convention and simple hierarchy)
      for (const candidate of inferParentCandidates(page.page_id)) {
        parentNode = pageIdToNode.get(candidate);
        if (parentNode) break;
      }
    }

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 3. Sort children by sort_order ASC, then page_id natural sort
  function sortChildren(nodes: PageNode[]) {
    nodes.sort((a, b) => {
      const sortA = sortOrderMap.get(a.pageId) ?? 0;
      const sortB = sortOrderMap.get(b.pageId) ?? 0;
      if (sortA !== sortB) return sortA - sortB;
      return naturalSortPageId(a.pageId, b.pageId);
    });
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }

  sortChildren(roots);

  // 4. Compute childCount (total descendants)
  function setChildCounts(node: PageNode) {
    for (const child of node.children) {
      setChildCounts(child);
    }
    node.childCount = countDescendants(node);
  }

  for (const root of roots) {
    setChildCounts(root);
  }

  return roots;
}
