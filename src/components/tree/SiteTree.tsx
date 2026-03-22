"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TreeNode } from "./TreeNode";
import { DraggableTreeNode } from "./DraggableTreeNode";
import { TreeControls } from "./TreeControls";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PageNode, MigrationStatus, ContentResponsibility } from "@/types";

interface SiteTreeProps {
  tree: PageNode[];
  onOpenDetail: (pageId: string) => void;
  onAddPage?: () => void;
  onAddChild?: (parentId: string) => void;
  onDelete?: (id: string, name: string, pageId: string, childCount: number) => void;
  onReorder?: (pageId: string, newParentId: string | null, newSortOrder: number) => void;
  onStatusChange?: (nodeId: string, status: MigrationStatus) => void;
  onResponsibilityChange?: (nodeId: string, value: ContentResponsibility) => void;
  onRename?: (nodeId: string, newName: string) => void;
  projectId?: string;
  enableDnd?: boolean;
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

function flattenNodeIds(nodes: PageNode[]): string[] {
  const ids: string[] = [];
  function walk(node: PageNode) {
    ids.push(node.id);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return ids;
}

function findNodeById(nodes: PageNode[], id: string): PageNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function SiteTree({
  tree,
  onOpenDetail,
  onAddPage,
  onAddChild,
  onDelete,
  onReorder,
  onStatusChange,
  onResponsibilityChange,
  onRename,
  projectId,
  enableDnd = false,
}: SiteTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return collectPageIdsToDepth(tree, 1);
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MigrationStatus[]>([]);
  const [responsibilityFilter, setResponsibilityFilter] = useState<ContentResponsibility[]>([]);
  const [migrationOwnerFilter, setMigrationOwnerFilter] = useState<ContentResponsibility[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const searchResult = useMemo(() => {
    if (!search.trim()) return null;
    return getMatchingIds(tree, search.trim());
  }, [tree, search]);

  const effectiveExpanded = useMemo(() => {
    if (searchResult) {
      const newExpanded = new Set(expanded);
      searchResult.ancestors.forEach((id) => newExpanded.add(id));
      return newExpanded;
    }
    return expanded;
  }, [expanded, searchResult]);

  const flatIds = useMemo(() => flattenNodeIds(tree), [tree]);

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

  const handleExpandAll = useCallback(() => setExpanded(collectAllPageIds(tree)), [tree]);
  const handleCollapseAll = useCallback(() => setExpanded(new Set()), []);
  const handleExpandToDepth = useCallback((depth: number) => setExpanded(collectPageIdsToDepth(tree, depth)), [tree]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "site-tree.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [tree]);

  const handleRenameStart = useCallback((nodeId: string) => {
    setRenamingId(nodeId);
  }, []);

  const handleRenameEnd = useCallback((newName?: string) => {
    if (newName && renamingId && onRename) {
      onRename(renamingId, newName);
    }
    setRenamingId(null);
  }, [renamingId, onRename]);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const overNode = findNodeById(tree, over.id as string);
    // Drop onto a node makes it a child of that node
    onReorder(active.id as string, over.id as string, 0);
  }, [onReorder, tree]);

  // Filter logic
  function shouldShowNode(node: PageNode): boolean {
    if (searchResult) {
      if (!searchResult.matches.has(node.pageId) && !searchResult.ancestors.has(node.pageId)) return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(node.status)) {
      if (!hasDescendantMatchingStatus(node, statusFilter)) return false;
    }
    if (responsibilityFilter.length > 0 && node.contentResponsibility && !responsibilityFilter.includes(node.contentResponsibility)) {
      if (!hasDescendantMatchingResponsibility(node, responsibilityFilter)) return false;
    }
    if (migrationOwnerFilter.length > 0 && node.migrationOwner && !migrationOwnerFilter.includes(node.migrationOwner)) {
      if (!hasDescendantMatchingMigrationOwner(node, migrationOwnerFilter)) return false;
    }
    return true;
  }

  function hasDescendantMatchingStatus(node: PageNode, statuses: MigrationStatus[]): boolean {
    for (const child of node.children) {
      if (statuses.includes(child.status)) return true;
      if (hasDescendantMatchingStatus(child, statuses)) return true;
    }
    return false;
  }

  function hasDescendantMatchingResponsibility(node: PageNode, values: ContentResponsibility[]): boolean {
    for (const child of node.children) {
      if (child.contentResponsibility && values.includes(child.contentResponsibility)) return true;
      if (hasDescendantMatchingResponsibility(child, values)) return true;
    }
    return false;
  }

  function hasDescendantMatchingMigrationOwner(node: PageNode, values: ContentResponsibility[]): boolean {
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

    const treeNode = (
      <TreeNode
        node={node}
        depth={depth}
        expanded={isExpanded}
        onToggle={handleToggle}
        onSelect={handleSelect}
        onOpenDetail={onOpenDetail}
        selected={selected.has(node.pageId)}
        searchMatch={isSearchMatch}
        onAddChild={onAddChild}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onResponsibilityChange={onResponsibilityChange}
        renamingId={renamingId}
        onRenameStart={onRename ? handleRenameStart : undefined}
        onRenameEnd={handleRenameEnd}
        projectId={projectId}
      />
    );

    return (
      <div key={node.id}>
        {enableDnd ? (
          <DraggableTreeNode node={node} depth={depth}>
            {treeNode}
          </DraggableTreeNode>
        ) : (
          treeNode
        )}
        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  const draggingNode = draggingId ? findNodeById(tree, draggingId) : null;

  const treeContent = (
    <>
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
        onAddPage={onAddPage}
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
    </>
  );

  if (enableDnd) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
            {treeContent}
          </SortableContext>
          <DragOverlay>
            {draggingNode && (
              <div className="bg-background shadow-lg rounded border px-3 py-1 text-sm">
                {draggingNode.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {treeContent}
    </div>
  );
}
