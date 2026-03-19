"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_STYLE_ICONS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResponsibilityBadge } from "@/components/shared/ResponsibilityBadge";
import { Checkbox } from "@/components/ui/checkbox";
import type { PageNode } from "@/types";

interface TreeNodeProps {
  node: PageNode;
  depth: number;
  expanded: boolean;
  onToggle: (pageId: string) => void;
  onSelect: (pageId: string) => void;
  onOpenDetail: (pageId: string) => void;
  selected: boolean;
  isGhost?: boolean;
  searchMatch?: boolean;
}

export function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  onOpenDetail,
  selected,
  isGhost = false,
  searchMatch = false,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const Icon = node.pageStyle ? PAGE_STYLE_ICONS[node.pageStyle] : null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 py-1 px-2 rounded-sm hover:bg-accent/50 group",
        isGhost && "opacity-40",
        searchMatch && "bg-yellow-50 ring-1 ring-yellow-200"
      )}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
    >
      {/* Expand/collapse toggle */}
      <button
        onClick={() => hasChildren && onToggle(node.pageId)}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm",
          hasChildren
            ? "hover:bg-accent cursor-pointer"
            : "cursor-default"
        )}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )
        ) : (
          <span className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Selection checkbox */}
      <Checkbox
        checked={selected}
        onCheckedChange={() => onSelect(node.pageId)}
        className="h-3.5 w-3.5"
      />

      {/* Page style icon */}
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}

      {/* Page name */}
      <button
        onClick={() => onOpenDetail(node.id)}
        className="truncate text-sm hover:underline text-left"
      >
        {node.name}
      </button>

      {/* Page ID */}
      <span className="shrink-0 text-xs text-muted-foreground ml-1">
        {node.pageId}
      </span>

      {/* Status badge */}
      <StatusBadge status={node.status} />

      {/* Content responsibility badge */}
      <ResponsibilityBadge
        responsibility={node.contentResponsibility}
        label="Content"
      />

      {/* Migration owner badge */}
      <ResponsibilityBadge
        responsibility={node.migrationOwner}
        label="Migration"
        className={
          node.migrationOwner === "MAC"
            ? "bg-purple-100 text-purple-700"
            : node.migrationOwner === "RCC"
            ? "bg-orange-100 text-orange-700"
            : undefined
        }
      />

      {/* Migrator name */}
      {node.migrator && (
        <span className="shrink-0 text-xs text-muted-foreground italic">
          {node.migrator}
        </span>
      )}

      {/* Child count when collapsed */}
      {hasChildren && !expanded && (
        <span className="shrink-0 text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
          {node.childCount}
        </span>
      )}
    </div>
  );
}
