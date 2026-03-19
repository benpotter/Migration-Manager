"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResponsibilityBadge } from "@/components/shared/ResponsibilityBadge";
import { PAGE_STYLE_ICONS } from "@/lib/constants";
import type { PageRow } from "@/types";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function createColumns(
  onOpenDetail: (pageId: string) => void
): ColumnDef<PageRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="h-4 w-4"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: "page_id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Page ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("page_id")}</span>
      ),
      size: 80,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Page Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <button
          onClick={() => onOpenDetail(row.original.id)}
          className="text-left text-sm hover:underline font-medium truncate max-w-[250px] block"
        >
          {row.getValue("name")}
        </button>
      ),
      size: 250,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue("type") || "-"}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">
          {row.getValue("slug") || "-"}
        </span>
      ),
      size: 200,
    },
    {
      accessorKey: "page_style",
      header: "Page Style",
      cell: ({ row }) => {
        const style = row.getValue("page_style") as string | null;
        if (!style) return <span className="text-muted-foreground">-</span>;
        const Icon = PAGE_STYLE_ICONS[style];
        return (
          <div className="flex items-center gap-1.5 text-xs">
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="truncate">{style}</span>
          </div>
        );
      },
      filterFn: (row, id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.getValue(id) as string);
      },
      size: 180,
    },
    {
      accessorKey: "content_responsibility",
      header: "Responsibility",
      cell: ({ row }) => (
        <ResponsibilityBadge
          responsibility={row.getValue("content_responsibility")}
        />
      ),
      filterFn: (row, id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.getValue(id) as string);
      },
      size: 110,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
      filterFn: (row, id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.getValue(id) as string);
      },
      size: 130,
    },
    {
      accessorKey: "migration_owner",
      header: "Migration Owner",
      cell: ({ row }) => (
        <ResponsibilityBadge responsibility={row.getValue("migration_owner")} />
      ),
      size: 120,
    },
    {
      accessorKey: "migrator",
      header: "Migrator",
      cell: ({ row }) => (
        <span className="text-xs">{row.getValue("migrator") || "-"}</span>
      ),
      size: 120,
    },
    {
      accessorKey: "content_author",
      header: "Content Author",
      cell: ({ row }) => (
        <span className="text-xs">{row.getValue("content_author") || "-"}</span>
      ),
      size: 120,
    },
    {
      accessorKey: "content_approver",
      header: "Content Approver",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.getValue("content_approver") || "-"}
        </span>
      ),
      size: 130,
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Updated
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(row.getValue("updated_at"))}
        </span>
      ),
      size: 100,
    },
  ];
}
