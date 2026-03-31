"use client";

import {
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Download,
  Filter,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MIGRATION_STATUSES, STATUS_CONFIG, CONTENT_RESPONSIBILITIES } from "@/lib/constants";
import type { MigrationStatus, ContentResponsibility } from "@/types";

interface TreeControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: MigrationStatus[];
  onStatusFilterChange: (statuses: MigrationStatus[]) => void;
  responsibilityFilter: ContentResponsibility[];
  onResponsibilityFilterChange: (values: ContentResponsibility[]) => void;
  migrationOwnerFilter: ContentResponsibility[];
  onMigrationOwnerFilterChange: (values: ContentResponsibility[]) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExport: () => void;
  onAddPage?: () => void;
}

export function TreeControls({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  responsibilityFilter,
  onResponsibilityFilterChange,
  migrationOwnerFilter,
  onMigrationOwnerFilterChange,
  onExpandAll,
  onCollapseAll,
  onExport,
  onAddPage,
}: TreeControlsProps) {
  const toggleStatus = (status: MigrationStatus) => {
    if (statusFilter.includes(status)) {
      onStatusFilterChange(statusFilter.filter((s) => s !== status));
    } else {
      onStatusFilterChange([...statusFilter, status]);
    }
  };

  const toggleResponsibility = (value: ContentResponsibility) => {
    if (responsibilityFilter.includes(value)) {
      onResponsibilityFilterChange(
        responsibilityFilter.filter((r) => r !== value)
      );
    } else {
      onResponsibilityFilterChange([...responsibilityFilter, value]);
    }
  };

  const toggleMigrationOwner = (value: ContentResponsibility) => {
    if (migrationOwnerFilter.includes(value)) {
      onMigrationOwnerFilterChange(
        migrationOwnerFilter.filter((r) => r !== value)
      );
    } else {
      onMigrationOwnerFilterChange([...migrationOwnerFilter, value]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 border-b bg-background">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or page ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Status filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Status
            {statusFilter.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px]">
                {statusFilter.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {MIGRATION_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={statusFilter.includes(status)}
              onCheckedChange={() => toggleStatus(status)}
            >
              {STATUS_CONFIG[status]?.label ?? status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Content Responsibility filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Content Responsibility
            {responsibilityFilter.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px]">
                {responsibilityFilter.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CONTENT_RESPONSIBILITIES.map((r) => (
            <DropdownMenuCheckboxItem
              key={r}
              checked={responsibilityFilter.includes(r)}
              onCheckedChange={() => toggleResponsibility(r)}
            >
              {r}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Migration Owner filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Migration Owner
            {migrationOwnerFilter.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px]">
                {migrationOwnerFilter.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CONTENT_RESPONSIBILITIES.map((r) => (
            <DropdownMenuCheckboxItem
              key={r}
              checked={migrationOwnerFilter.includes(r)}
              onCheckedChange={() => toggleMigrationOwner(r)}
            >
              {r}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Expand/Collapse */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onExpandAll} className="gap-1.5">
          <ChevronsUpDown className="h-3.5 w-3.5" />
          Expand All
        </Button>
        <Button variant="outline" size="sm" onClick={onCollapseAll} className="gap-1.5">
          <ChevronsDownUp className="h-3.5 w-3.5" />
          Collapse
        </Button>
      </div>

      {/* Export */}
      <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>

      {/* Add Page */}
      {onAddPage && (
        <Button size="sm" onClick={onAddPage} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Page
        </Button>
      )}
    </div>
  );
}
