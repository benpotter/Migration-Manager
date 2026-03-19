import { PageRow, PageNode } from "@/types";

/** Natural sort comparator for page IDs like "1.2" vs "1.10" */
export function naturalSortPageId(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
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
  // Build a sort_order lookup map for O(1) access during sorting
  const sortOrderMap = new Map<string, number>();
  for (const page of pages) {
    sortOrderMap.set(page.page_id, page.sort_order ?? 0);
  }

  // 1. Create a map: pageId -> PageNode
  const nodeMap = new Map<string, PageNode>();

  for (const page of pages) {
    if (page.is_archived) continue;
    nodeMap.set(page.page_id, {
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
    });
  }

  // 2. Build parent-child relationships
  const roots: PageNode[] = [];

  for (const page of pages) {
    if (page.is_archived) continue;
    const node = nodeMap.get(page.page_id)!;
    const parentId = page.parent_page_id;

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
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
