"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MIGRATION_STATUSES, STATUS_CONFIG, CONTENT_RESPONSIBILITIES } from "@/lib/constants";
import type { PageNode, MigrationStatus, ContentResponsibility } from "@/types";

interface TreeNodeContextMenuProps {
  node: PageNode;
  onOpenDetail: (pageId: string) => void;
  onAddChild?: (parentId: string) => void;
  onAddSibling?: (siblingId: string) => void;
  onRename?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onDelete?: (nodeId: string, name: string, pageId: string, childCount: number) => void;
  onStatusChange?: (nodeId: string, status: MigrationStatus) => void;
  onResponsibilityChange?: (nodeId: string, value: ContentResponsibility) => void;
}

export function TreeNodeContextMenu({
  node,
  onOpenDetail,
  onAddChild,
  onAddSibling,
  onRename,
  onDuplicate,
  onDelete,
  onStatusChange,
  onResponsibilityChange,
}: TreeNodeContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="shrink-0 h-5 w-5 rounded-sm items-center justify-center hover:bg-accent hidden group-hover:flex">
          <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => onOpenDetail(node.id)}>
          <FileText className="h-4 w-4 mr-2" />
          Edit Details
        </DropdownMenuItem>

        {onRename && (
          <DropdownMenuItem onClick={() => onRename(node.id)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onAddChild && (
          <DropdownMenuItem onClick={() => onAddChild(node.id)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Child
          </DropdownMenuItem>
        )}

        {onAddSibling && (
          <DropdownMenuItem onClick={() => onAddSibling(node.id)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Sibling
          </DropdownMenuItem>
        )}

        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(node.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
        )}

        {onStatusChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {MIGRATION_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange(node.id, status)}
                    disabled={node.status === status}
                  >
                    <StatusBadge status={status} />
                    <span className="ml-2 text-xs">
                      {STATUS_CONFIG[status]?.label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {onResponsibilityChange && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Content Responsibility</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {CONTENT_RESPONSIBILITIES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onResponsibilityChange(node.id, r)}
                  disabled={node.contentResponsibility === r}
                >
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(node.id, node.name, node.pageId, node.childCount)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
