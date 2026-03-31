"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Search,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createColumns } from "./columns";
import { StatusFilter, PageStyleFilter, ResponsibilityFilter } from "./filters";
import { PipelineSummary } from "./PipelineSummary";
import { QUICK_FILTERS, MIGRATION_STATUSES, STATUS_CONFIG, CONTENT_RESPONSIBILITIES, PAGE_STYLES } from "@/lib/constants";
import { getNextStage } from "@/lib/workflow";
import type { WorkflowStage } from "@/lib/workflow";
import { toast } from "sonner";
import type { PageRow, PageStyle, ContentResponsibility } from "@/types";

interface PageTableProps {
  data: PageRow[];
  onOpenDetail: (pageId: string) => void;
  onDataChange?: () => void;
  projectId?: string;
  /** Dynamic workflow stages from project context */
  stages?: WorkflowStage[];
}

export function PageTable({ data, onOpenDetail, onDataChange, projectId, stages }: PageTableProps) {
  const buildUrl = (path: string) => projectId ? `/api/p/${projectId}${path}` : `/api${path}`;

  const statusList = stages ? stages.map((s) => s.id) : MIGRATION_STATUSES;
  const getStatusLabel = (id: string) => {
    if (stages) return stages.find((s) => s.id === id)?.label ?? id;
    return STATUS_CONFIG[id]?.label ?? id;
  };

  const [sorting, setSorting] = useState<SortingState>([{ id: "page_id", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Filter state for custom multi-select filters
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [pageStyleFilter, setPageStyleFilter] = useState<PageStyle[]>([]);
  const [responsibilityFilter, setResponsibilityFilter] = useState<ContentResponsibility[]>([]);
  const [blockedFilter, setBlockedFilter] = useState(false);

  const columns = useMemo(() => createColumns(onOpenDetail, projectId), [onOpenDetail, projectId]);

  // Apply custom filters
  const filteredData = useMemo(() => {
    let result = data;

    if (statusFilter.length > 0) {
      result = result.filter((row) => statusFilter.includes(row.status));
    }
    if (blockedFilter) {
      result = result.filter((row) => row.is_blocked);
    }
    if (pageStyleFilter.length > 0) {
      result = result.filter(
        (row) => row.page_style && pageStyleFilter.includes(row.page_style)
      );
    }
    if (responsibilityFilter.length > 0) {
      result = result.filter(
        (row) =>
          row.content_responsibility &&
          responsibilityFilter.includes(row.content_responsibility)
      );
    }

    return result;
  }, [data, statusFilter, blockedFilter, pageStyleFilter, responsibilityFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    initialState: {
      pagination: { pageSize: 50 },
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const applyQuickFilter = useCallback(
    (filter: (typeof QUICK_FILTERS)[number]) => {
      // Reset existing filters
      setStatusFilter([]);
      setResponsibilityFilter([]);
      setBlockedFilter(false);

      if ("status" in filter.filter) {
        setStatusFilter([...filter.filter.status] as string[]);
      }
      if ("contentResponsibility" in filter.filter) {
        setResponsibilityFilter(
          [...filter.filter.contentResponsibility] as ContentResponsibility[]
        );
      }
      if ("showBlocked" in filter.filter) {
        setBlockedFilter(true);
      }
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter([]);
    setPageStyleFilter([]);
    setResponsibilityFilter([]);
    setBlockedFilter(false);
    setGlobalFilter("");
    setColumnFilters([]);
  }, []);

  const handleBatchUpdate = async (updates: Record<string, unknown>, label: string) => {
    const pageIds = selectedRows.map((row) => row.original.id);
    try {
      const res = await fetch(buildUrl("/pages/batch"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds, updates }),
      });
      if (!res.ok) throw new Error("Batch update failed");
      toast.success(`Updated ${pageIds.length} pages: ${label}`);
      setRowSelection({});
      onDataChange?.();
    } catch {
      toast.error("Failed to update pages");
    }
  };

  const handleBatchStatusUpdate = async (newStatus: string) => {
    await handleBatchUpdate({ status: newStatus }, getStatusLabel(newStatus));
  };

  const handleAdvanceSelected = async () => {
    if (!stages) {
      toast.error("Workflow stages not available");
      return;
    }
    const pageIds: string[] = [];
    const updates: { id: string; status: string }[] = [];
    let skippedBlocked = 0;
    let skippedFinal = 0;

    for (const row of selectedRows) {
      const page = row.original;
      if (page.is_blocked) {
        skippedBlocked++;
        continue;
      }
      const next = getNextStage(stages, page.status);
      if (!next) {
        skippedFinal++;
        continue;
      }
      pageIds.push(page.id);
      updates.push({ id: page.id, status: next.id });
    }

    if (updates.length === 0) {
      const reasons: string[] = [];
      if (skippedBlocked > 0) reasons.push(`${skippedBlocked} blocked`);
      if (skippedFinal > 0) reasons.push(`${skippedFinal} at final stage`);
      toast.info(`No pages to advance: ${reasons.join(", ")}`);
      return;
    }

    // Batch advance: group by target status
    const byTarget: Record<string, string[]> = {};
    for (const u of updates) {
      if (!byTarget[u.status]) byTarget[u.status] = [];
      byTarget[u.status].push(u.id);
    }

    try {
      for (const [status, ids] of Object.entries(byTarget)) {
        const res = await fetch(buildUrl("/pages/batch"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageIds: ids, updates: { status } }),
        });
        if (!res.ok) throw new Error("Batch update failed");
      }

      let msg = `Advanced ${updates.length} page(s)`;
      if (skippedBlocked > 0) msg += `, ${skippedBlocked} skipped (blocked)`;
      if (skippedFinal > 0) msg += `, ${skippedFinal} skipped (final stage)`;
      toast.success(msg);
      setRowSelection({});
      onDataChange?.();
    } catch {
      toast.error("Failed to advance pages");
    }
  };

  const handleBatchDelete = async () => {
    if (!projectId) return;
    const ids = selectedRows.map((row) => row.original.id);
    if (!confirm(`Delete ${ids.length} selected page(s)? This cannot be undone.`)) return;
    try {
      let deleted = 0;
      for (const id of ids) {
        const res = await fetch(buildUrl(`/pages/${id}`), { method: "DELETE" });
        if (res.ok) deleted++;
      }
      toast.success(`Deleted ${deleted} page(s)`);
      setRowSelection({});
      onDataChange?.();
    } catch {
      toast.error("Failed to delete pages");
    }
  };

  const hasActiveFilters =
    statusFilter.length > 0 ||
    pageStyleFilter.length > 0 ||
    responsibilityFilter.length > 0 ||
    blockedFilter ||
    globalFilter.length > 0;

  // Pipeline summary data
  const pipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    let blocked = 0;
    for (const row of data) {
      counts[row.status] = (counts[row.status] || 0) + 1;
      if (row.is_blocked) blocked++;
    }
    return { counts, blocked, total: data.length };
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      {/* Pipeline Summary Bar */}
      {stages && data.length > 0 && (
        <PipelineSummary
          stages={stages}
          counts={pipelineData.counts}
          blockedCount={pipelineData.blocked}
          total={pipelineData.total}
          onFilterStatus={(status) => {
            setStatusFilter([status]);
            setBlockedFilter(false);
          }}
          onFilterBlocked={() => {
            setStatusFilter([]);
            setBlockedFilter(true);
          }}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Global search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-1">
          {QUICK_FILTERS.map((qf) => (
            <Button
              key={qf.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => applyQuickFilter(qf)}
            >
              {qf.label}
            </Button>
          ))}
        </div>

        {/* Column-level filters */}
        <StatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          showBlockedFilter
          blockedActive={blockedFilter}
          onBlockedToggle={setBlockedFilter}
          stages={stages}
        />
        <PageStyleFilter value={pageStyleFilter} onChange={setPageStyleFilter} />
        <ResponsibilityFilter
          value={responsibilityFilter}
          onChange={setResponsibilityFilter}
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            Clear filters
          </Button>
        )}

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto gap-1.5">
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk actions bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm flex-wrap">
          <span className="font-medium">{selectedCount} row(s) selected</span>
          {stages && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleAdvanceSelected}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Advance Selected
            </Button>
          )}
          <Select
            onValueChange={(val) => handleBatchStatusUpdate(val)}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Set Status..." />
            </SelectTrigger>
            <SelectContent>
              {statusList.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(val) =>
              handleBatchUpdate({ content_responsibility: val }, `Responsibility → ${val}`)
            }
          >
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Set Responsibility..." />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_RESPONSIBILITIES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(val) =>
              handleBatchUpdate({ migration_owner: val }, `Owner → ${val}`)
            }
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Set Owner..." />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_RESPONSIBILITIES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(val) =>
              handleBatchUpdate({ page_style: val }, `Style → ${val}`)
            }
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Set Style..." />
            </SelectTrigger>
            <SelectContent>
              {PAGE_STYLES.map((style) => (
                <SelectItem key={style} value={style}>{style}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={handleBatchDelete}
            >
              Delete Selected
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {data.length} row(s)
          {selectedCount > 0 && ` | ${selectedCount} selected`}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <span>Rows per page</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(val) => table.setPageSize(Number(val))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
