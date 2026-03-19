"use client";

import { useState, useMemo, useCallback } from "react";
import { TreeNode } from "./TreeNode";
import { TreeControls } from "./TreeControls";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PageNode, MigrationStatus, ContentResponsibility } from "@/types";

interface SiteTreeProps {
  tree: PageNode[];
  onOpenDetail: (pageId: string) => void;
}

function collectAllPageIds(nodes: PageNode[]): Set<string> {
  const ids = new Set<string>();
  function walk(node: PageNode) {
    ids.add(node.pageId);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return ids;
}

function collectPageIdsToDepth(nodes: PageNode[], maxDepth: number): Set<string> {
  const ids = new Set<string>();
  function walk(node: PageNode, depth: number) {
    if (depth < maxDepth) {
      ids.add(node.pageId);
      node.children.forEach((child) => walk(child, depth + 1));
    }
  }
  nodes.forEach((n) => walk(n, 0));
  return ids;
}

function nodeMatchesSearch(node: PageNode, search: string): boolean {
  const lower = search.toLowerCase();
  return (
    node.name.toLowerCase().includes(lower) ||
    node.pageId.toLowerCase().includes(lower)
  );
}

function getMatchingIds(
  nodes: PageNode[],
  search: string
): { matches: Set<string>; ancestors: Set<string> } {
  const matches = new Set<string>();
  const ancestors = new Set<string>();

  function walk(node: PageNode, path: string[]) {
    const isMatch = nodeMatchesSearch(node, search);
    let hasMatchingDescendant = false;

    for (const child of node.children) {
      walk(child, [...path, node.pageId]);
      if (matches.has(child.pageId) || ancestors.has(child.pageId)) {
        hasMatchingDescendant = true;
      }
    }

    if (isMatch) {
      matches.add(node.pageId);
      path.forEach((id) => ancestors.add(id));
    } else if (hasMatchingDescendant) {
      ancestors.add(node.pageId);
    }
  }

  nodes.forEach((n) => walk(n, []));
  return { matches, ancestors };
}

export function SiteTree({ tree, onOpenDetail }: SiteTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Default: expand to depth 1
    return collectPageIdsToDepth(tree, 1);
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MigrationStatus[]>([]);
  const [responsibilityFilter, setResponsibilityFilter] = useState<
    ContentResponsibility[]
  >([]);
  const [migrationOwnerFilter, setMigrationOwnerFilter] = useState<
    ContentResponsibility[]
  >([]);

  // Search matching
  const searchResult = useMemo(() => {
    if (!search.trim()) return null;
    return getMatchingIds(tree, search.trim());
  }, [tree, search]);

  // Auto-expand parents of search matches
  const effectiveExpanded = useMemo(() => {
    if (searchResult) {
      const newExpanded = new Set(expanded);
      searchResult.ancestors.forEach((id) => newExpanded.add(id));
      return newExpanded;
    }
    return expanded;
  }, [expanded, searchResult]);

  const handleToggle = useCallback((pageId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((pageId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpanded(collectAllPageIds(tree));
  }, [tree]);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleExpandToDepth = useCallback(
    (depth: number) => {
      setExpanded(collectPageIdsToDepth(tree, depth));
    },
    [tree]
  );

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(tree, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "site-tree.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [tree]);

  // Determines whether a node should be rendered
  function shouldShowNode(node: PageNode): boolean {
    // Search filter
    if (searchResult) {
      if (
        !searchResult.matches.has(node.pageId) &&
        !searchResult.ancestors.has(node.pageId)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter.length > 0 && !statusFilter.includes(node.status)) {
      if (!hasDescendantMatchingStatus(node, statusFilter)) {
        return false;
      }
    }

    // Content Responsibility filter
    if (
      responsibilityFilter.length > 0 &&
      node.contentResponsibility &&
      !responsibilityFilter.includes(node.contentResponsibility)
    ) {
      if (!hasDescendantMatchingResponsibility(node, responsibilityFilter)) {
        return false;
      }
    }

    // Migration Owner filter
    if (
      migrationOwnerFilter.length > 0 &&
      node.migrationOwner &&
      !migrationOwnerFilter.includes(node.migrationOwner)
    ) {
      if (!hasDescendantMatchingMigrationOwner(node, migrationOwnerFilter)) {
        return false;
      }
    }

    return true;
  }

  function hasDescendantMatchingStatus(
    node: PageNode,
    statuses: MigrationStatus[]
  ): boolean {
    for (const child of node.children) {
      if (statuses.includes(child.status)) return true;
      if (hasDescendantMatchingStatus(child, statuses)) return true;
    }
    return false;
  }

  function hasDescendantMatchingResponsibility(
    node: PageNode,
    values: ContentResponsibility[]
  ): boolean {
    for (const child of node.children) {
      if (child.contentResponsibility && values.includes(child.contentResponsibility))
        return true;
      if (hasDescendantMatchingResponsibility(child, values)) return true;
    }
    return false;
  }

  function hasDescendantMatchingMigrationOwner(
    node: PageNode,
    values: ContentResponsibility[]
  ): boolean {
    for (const child of node.children) {
      if (child.migrationOwner && values.includes(child.migrationOwner))
        return true;
      if (hasDescendantMatchingMigrationOwner(child, values)) return true;
    }
    return false;
  }

  function renderNode(node: PageNode, depth: number) {
    if (!shouldShowNode(node)) return null;

    const isExpanded = effectiveExpanded.has(node.pageId);
    const isSearchMatch =
      searchResult !== null && searchResult.matches.has(node.pageId);

    return (
      <div key={node.pageId}>
        <TreeNode
          node={node}
          depth={depth}
          expanded={isExpanded}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onOpenDetail={onOpenDetail}
          selected={selected.has(node.pageId)}
          searchMatch={isSearchMatch}
        />
        {isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <TreeControls
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        responsibilityFilter={responsibilityFilter}
        onResponsibilityFilterChange={setResponsibilityFilter}
        migrationOwnerFilter={migrationOwnerFilter}
        onMigrationOwnerFilterChange={setMigrationOwnerFilter}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onExpandToDepth={handleExpandToDepth}
        onExport={handleExport}
      />
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-muted-foreground hover:text-foreground underline text-xs"
          >
            Clear selection
          </button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {tree.map((root) => renderNode(root, 0))}
        </div>
      </ScrollArea>
    </div>
  );
}
