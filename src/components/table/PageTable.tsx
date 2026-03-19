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
import { QUICK_FILTERS, MIGRATION_STATUSES, STATUS_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import type { PageRow, MigrationStatus, PageStyle, ContentResponsibility } from "@/types";

interface PageTableProps {
  data: PageRow[];
  onOpenDetail: (pageId: string) => void;
  onDataChange?: () => void;
}

export function PageTable({ data, onOpenDetail, onDataChange }: PageTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Filter state for custom multi-select filters
  const [statusFilter, setStatusFilter] = useState<MigrationStatus[]>([]);
  const [pageStyleFilter, setPageStyleFilter] = useState<PageStyle[]>([]);
  const [responsibilityFilter, setResponsibilityFilter] = useState<ContentResponsibility[]>([]);

  const columns = useMemo(() => createColumns(onOpenDetail), [onOpenDetail]);

  // Apply custom filters
  const filteredData = useMemo(() => {
    let result = data;

    if (statusFilter.length > 0) {
      result = result.filter((row) => statusFilter.includes(row.status));
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
  }, [data, statusFilter, pageStyleFilter, responsibilityFilter]);

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

      if ("status" in filter.filter) {
        setStatusFilter([...filter.filter.status] as MigrationStatus[]);
      }
      if ("contentResponsibility" in filter.filter) {
        setResponsibilityFilter(
          [...filter.filter.contentResponsibility] as ContentResponsibility[]
        );
      }
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setStatusFilter([]);
    setPageStyleFilter([]);
    setResponsibilityFilter([]);
    setGlobalFilter("");
    setColumnFilters([]);
  }, []);

  const handleBatchStatusUpdate = async (newStatus: MigrationStatus) => {
    const pageIds = selectedRows.map((row) => row.original.page_id);
    try {
      const res = await fetch("/api/pages/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds, updates: { status: newStatus } }),
      });
      if (!res.ok) throw new Error("Batch update failed");
      toast.success(`Updated ${pageIds.length} pages to ${STATUS_CONFIG[newStatus]?.label}`);
      setRowSelection({});
      onDataChange?.();
    } catch {
      toast.error("Failed to update pages");
    }
  };

  const hasActiveFilters =
    statusFilter.length > 0 ||
    pageStyleFilter.length > 0 ||
    responsibilityFilter.length > 0 ||
    globalFilter.length > 0;

  return (
    <div className="flex flex-col gap-4">
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
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
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
        <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
          <span className="font-medium">{selectedCount} row(s) selected</span>
          <Select
            onValueChange={(val) =>
              handleBatchStatusUpdate(val as MigrationStatus)
            }
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Batch update status..." />
            </SelectTrigger>
            <SelectContent>
              {MIGRATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_CONFIG[status]?.label ?? status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
