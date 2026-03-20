"use client";

import { ChevronRight, ChevronDown, Copy, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_STYLE_ICONS, URI_DEPTH_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResponsibilityBadge } from "@/components/shared/ResponsibilityBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { URISegment } from "./URISegment";
import type { PageNode, URIValidation } from "@/types";
import { toast } from "sonner";

interface URINodeProps {
  node: PageNode;
  depth: number;
  uri: string;
  validation: URIValidation | null;
  hasConflict: boolean;
  expanded: boolean;
  onToggle: (pageId: string) => void;
  onSelect: (pageId: string) => void;
  onOpenDetail: (pageId: string) => void;
  onSegmentClick: (segment: string) => void;
  selected: boolean;
  searchMatch?: boolean;
}

export function URINode({
  node,
  depth,
  uri,
  validation,
  hasConflict,
  expanded,
  onToggle,
  onSelect,
  onOpenDetail,
  onSegmentClick,
  selected,
  searchMatch = false,
}: URINodeProps) {
  const hasChildren = node.children.length > 0;
  const Icon = node.pageStyle ? PAGE_STYLE_ICONS[node.pageStyle] : null;
  const depthColor = URI_DEPTH_COLORS[depth] || URI_DEPTH_COLORS[7];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(uri).then(() => {
      toast.success("URI copied to clipboard", {
        description: uri,
        duration: 2000,
      });
    });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 py-1 px-2 rounded-sm hover:bg-accent/50 group border-l-2",
        depthColor,
        searchMatch && "bg-yellow-50 dark:bg-yellow-950/30 ring-1 ring-yellow-200 dark:ring-yellow-800"
      )}
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
    >
      {/* Expand/collapse toggle */}
      <button
        onClick={() => hasChildren && onToggle(node.pageId)}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm",
          hasChildren ? "hover:bg-accent cursor-pointer" : "cursor-default"
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

      {/* URI path (monospace) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetail(node.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDetail(node.id); }}
        className="truncate text-left hover:underline min-w-0 cursor-pointer"
      >
        <URISegment uri={uri} onSegmentClick={onSegmentClick} />
      </div>

      {/* Page ID */}
      <span className="shrink-0 text-xs text-muted-foreground ml-1">
        {node.pageId}
      </span>

      {/* Status badge */}
      <StatusBadge status={node.status} />

      {/* Content responsibility badge */}
      <ResponsibilityBadge responsibility={node.contentResponsibility} label="Content" />

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

      {/* Validation indicator */}
      {validation && !validation.isValid && (
        <span title={validation.errors.join(", ")} className="shrink-0 flex items-center">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        </span>
      )}
      {validation && validation.isValid && validation.warnings.length > 0 && (
        <span title={validation.warnings.join(", ")} className="shrink-0 flex items-center">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
        </span>
      )}

      {/* Conflict indicator */}
      {hasConflict && (
        <span className="shrink-0 text-xs font-medium text-orange-600 bg-orange-100 rounded-full px-1.5 py-0.5">
          Conflict
        </span>
      )}

      {/* Copy button (visible on hover) */}
      <button
        onClick={handleCopy}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent"
        title="Copy URI"
      >
        <Copy className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* Child count when collapsed */}
      {hasChildren && !expanded && (
        <span className="shrink-0 text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
          {node.childCount}
        </span>
      )}
    </div>
  );
}
