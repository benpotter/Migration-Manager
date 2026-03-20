"use client";

import { useState, useMemo, useCallback } from "react";
import { URINode } from "./URINode";
import { URIFilters, type ValidationFilter } from "./URIFilters";
import { URIConflictBanner } from "./URIConflictBanner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAllURIPaths } from "@/lib/uri-generator";
import { validateURI, detectURIConflicts } from "@/lib/uri-validator";
import type { PageNode, MigrationStatus, ContentResponsibility, URIValidation } from "@/types";

interface URIPatternViewProps {
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

function getMatchingIds(
  nodes: PageNode[],
  search: string,
  uriMap: Map<string, string>
): { matches: Set<string>; ancestors: Set<string> } {
  const matches = new Set<string>();
  const ancestors = new Set<string>();
  const lower = search.toLowerCase();

  function walk(node: PageNode, path: string[]) {
    const uri = uriMap.get(node.pageId) || "";
    const isMatch =
      node.name.toLowerCase().includes(lower) ||
      node.pageId.toLowerCase().includes(lower) ||
      uri.toLowerCase().includes(lower);

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

export function URIPatternView({ tree, onOpenDetail }: URIPatternViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectPageIdsToDepth(tree, 1)
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MigrationStatus[]>([]);
  const [responsibilityFilter, setResponsibilityFilter] = useState<ContentResponsibility[]>([]);
  const [migrationOwnerFilter, setMigrationOwnerFilter] = useState<ContentResponsibility[]>([]);
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>("all");

  // Memoized derived state
  const uriMap = useMemo(() => generateAllURIPaths(tree), [tree]);

  const conflicts = useMemo(() => detectURIConflicts(tree), [tree]);

  const conflictPageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conflict of conflicts) {
      for (const page of conflict.conflictingPages) {
        ids.add(page.pageId);
      }
    }
    return ids;
  }, [conflicts]);

  const validationMap = useMemo(() => {
    const map = new Map<string, URIValidation>();
    for (const [pageId, uri] of uriMap) {
      map.set(pageId, validateURI(uri));
    }
    return map;
  }, [uriMap]);

  // Search matching
  const searchResult = useMemo(() => {
    if (!search.trim()) return null;
    return getMatchingIds(tree, search.trim(), uriMap);
  }, [tree, search, uriMap]);

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
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  const handleSelect = useCallback((pageId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
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

  const handleSegmentClick = useCallback((segment: string) => {
    setSearch(segment);
  }, []);

  // Filter logic
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

    // Conflicts only filter
    if (showConflictsOnly && !conflictPageIds.has(node.pageId)) {
      if (!hasDescendantInSet(node, conflictPageIds)) return false;
    }

    // Validation filter
    if (validationFilter !== "all") {
      const v = validationMap.get(node.pageId);
      if (v) {
        if (validationFilter === "valid" && (!v.isValid || v.warnings.length > 0)) {
          if (!hasDescendantMatchingValidation(node, validationFilter)) return false;
        }
        if (validationFilter === "warnings" && v.warnings.length === 0) {
          if (!hasDescendantMatchingValidation(node, validationFilter)) return false;
        }
        if (validationFilter === "errors" && v.isValid) {
          if (!hasDescendantMatchingValidation(node, validationFilter)) return false;
        }
      }
    }

    // Status filter
    if (statusFilter.length > 0 && !statusFilter.includes(node.status)) {
      if (!hasDescendantMatchingStatus(node, statusFilter)) return false;
    }

    // Content Responsibility filter
    if (
      responsibilityFilter.length > 0 &&
      node.contentResponsibility &&
      !responsibilityFilter.includes(node.contentResponsibility)
    ) {
      if (!hasDescendantMatchingResponsibility(node, responsibilityFilter)) return false;
    }

    // Migration Owner filter
    if (
      migrationOwnerFilter.length > 0 &&
      node.migrationOwner &&
      !migrationOwnerFilter.includes(node.migrationOwner)
    ) {
      if (!hasDescendantMatchingMigrationOwner(node, migrationOwnerFilter)) return false;
    }

    return true;
  }

  function hasDescendantInSet(node: PageNode, ids: Set<string>): boolean {
    for (const child of node.children) {
      if (ids.has(child.pageId)) return true;
      if (hasDescendantInSet(child, ids)) return true;
    }
    return false;
  }

  function hasDescendantMatchingValidation(node: PageNode, filter: ValidationFilter): boolean {
    for (const child of node.children) {
      const v = validationMap.get(child.pageId);
      if (v) {
        if (filter === "valid" && v.isValid && v.warnings.length === 0) return true;
        if (filter === "warnings" && v.warnings.length > 0) return true;
        if (filter === "errors" && !v.isValid) return true;
      }
      if (hasDescendantMatchingValidation(child, filter)) return true;
    }
    return false;
  }

  function hasDescendantMatchingStatus(node: PageNode, statuses: MigrationStatus[]): boolean {
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
      if (child.contentResponsibility && values.includes(child.contentResponsibility)) return true;
      if (hasDescendantMatchingResponsibility(child, values)) return true;
    }
    return false;
  }

  function hasDescendantMatchingMigrationOwner(
    node: PageNode,
    values: ContentResponsibility[]
  ): boolean {
    for (const child of node.children) {
      if (child.migrationOwner && values.includes(child.migrationOwner)) return true;
      if (hasDescendantMatchingMigrationOwner(child, values)) return true;
    }
    return false;
  }

  function renderNode(node: PageNode, depth: number) {
    if (!shouldShowNode(node)) return null;

    const isExpanded = effectiveExpanded.has(node.pageId);
    const isSearchMatch = searchResult !== null && searchResult.matches.has(node.pageId);
    const uri = uriMap.get(node.pageId) || "";
    const validation = validationMap.get(node.pageId) || null;
    const hasConflict = conflictPageIds.has(node.pageId);

    return (
      <div key={node.pageId}>
        <URINode
          node={node}
          depth={depth}
          uri={uri}
          validation={validation}
          hasConflict={hasConflict}
          expanded={isExpanded}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onOpenDetail={onOpenDetail}
          onSegmentClick={handleSegmentClick}
          selected={selected.has(node.pageId)}
          searchMatch={isSearchMatch}
        />
        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <URIFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        responsibilityFilter={responsibilityFilter}
        onResponsibilityFilterChange={setResponsibilityFilter}
        migrationOwnerFilter={migrationOwnerFilter}
        onMigrationOwnerFilterChange={setMigrationOwnerFilter}
        validationFilter={validationFilter}
        onValidationFilterChange={setValidationFilter}
        showConflictsOnly={showConflictsOnly}
        onToggleConflictsOnly={() => setShowConflictsOnly((prev) => !prev)}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onExpandToDepth={handleExpandToDepth}
        tree={tree}
        uriMap={uriMap}
      />

      {conflicts.length > 0 && (
        <URIConflictBanner
          conflicts={conflicts}
          showConflictsOnly={showConflictsOnly}
          onToggleConflictsOnly={() => setShowConflictsOnly((prev) => !prev)}
        />
      )}

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
