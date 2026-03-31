"use client";

import { useEffect, useState } from "react";
import { Filter, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MIGRATION_STATUSES,
  STATUS_CONFIG,
  PAGE_STYLES,
  CONTENT_RESPONSIBILITIES,
} from "@/lib/constants";
import type { ContentResponsibility, PageStyle } from "@/types";
import type { WorkflowStage } from "@/lib/workflow";

interface StatusFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  showBlockedFilter?: boolean;
  blockedActive?: boolean;
  onBlockedToggle?: (val: boolean) => void;
  /** Dynamic stages from project context */
  stages?: WorkflowStage[];
}

export function StatusFilter({
  value,
  onChange,
  showBlockedFilter,
  blockedActive,
  onBlockedToggle,
  stages,
}: StatusFilterProps) {
  const statusList = stages ? stages.map((s) => s.id) : MIGRATION_STATUSES;
  const getLabel = (id: string) => {
    if (stages) {
      return stages.find((s) => s.id === id)?.label ?? id;
    }
    return STATUS_CONFIG[id]?.label ?? id;
  };

  const toggle = (status: string) => {
    if (value.includes(status)) {
      onChange(value.filter((s) => s !== status));
    } else {
      onChange([...value, status]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Status
          {(value.length > 0 || blockedActive) && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px]">
              {value.length + (blockedActive ? 1 : 0)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {statusList.map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={value.includes(status)}
            onCheckedChange={() => toggle(status)}
          >
            {getLabel(status)}
          </DropdownMenuCheckboxItem>
        ))}
        {showBlockedFilter && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={blockedActive ?? false}
              onCheckedChange={() => onBlockedToggle?.(!blockedActive)}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5 text-red-500" />
              Blocked
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PageStyleFilterProps {
  value: PageStyle[];
  onChange: (value: PageStyle[]) => void;
}

export function PageStyleFilter({ value, onChange }: PageStyleFilterProps) {
  const toggle = (style: PageStyle) => {
    if (value.includes(style)) {
      onChange(value.filter((s) => s !== style));
    } else {
      onChange([...value, style]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Page Style
          {value.length > 0 && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px]">
              {value.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {PAGE_STYLES.map((style) => (
          <DropdownMenuCheckboxItem
            key={style}
            checked={value.includes(style)}
            onCheckedChange={() => toggle(style)}
          >
            {style}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ResponsibilityFilterProps {
  value: ContentResponsibility[];
  onChange: (value: ContentResponsibility[]) => void;
}

export function ResponsibilityFilter({
  value,
  onChange,
}: ResponsibilityFilterProps) {
  const toggle = (r: ContentResponsibility) => {
    if (value.includes(r)) {
      onChange(value.filter((v) => v !== r));
    } else {
      onChange([...value, r]);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {CONTENT_RESPONSIBILITIES.map((r) => (
        <Button
          key={r}
          variant={value.includes(r) ? "default" : "outline"}
          size="sm"
          onClick={() => toggle(r)}
          className="h-7 px-2.5 text-xs"
        >
          {r}
        </Button>
      ))}
    </div>
  );
}

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchFilter({
  value,
  onChange,
  placeholder = "Search pages...",
}: SearchFilterProps) {
  const [internal, setInternal] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(internal);
    }, 300);
    return () => clearTimeout(timeout);
  }, [internal, onChange]);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  return (
    <Input
      placeholder={placeholder}
      value={internal}
      onChange={(e) => setInternal(e.target.value)}
      className="h-9 max-w-sm"
    />
  );
}
