"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PageNode } from "@/types";

interface FlatPage {
  id: string;
  pageId: string;
  name: string;
  path: string;
  depth: number;
}

function flattenTree(nodes: PageNode[], parentPath = ""): FlatPage[] {
  const result: FlatPage[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    result.push({ id: node.id, pageId: node.pageId, name: node.name, path, depth: parentPath.split(" / ").length });
    result.push(...flattenTree(node.children, path));
  }
  return result;
}

interface ParentPageComboboxProps {
  tree: PageNode[];
  value: string | null;
  onChange: (pageId: string | null) => void;
  excludeId?: string;
}

export function ParentPageCombobox({
  tree,
  value,
  onChange,
  excludeId,
}: ParentPageComboboxProps) {
  const [open, setOpen] = useState(false);

  const pages = useMemo(() => {
    const flat = flattenTree(tree);
    return excludeId ? flat.filter((p) => p.id !== excludeId) : flat;
  }, [tree, excludeId]);

  const selected = pages.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          <span className="truncate">
            {selected ? selected.path : "None (root level)"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search pages..." />
          <CommandList>
            <CommandEmpty>No pages found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground">None (root level)</span>
              </CommandItem>
              {pages.map((page) => (
                <CommandItem
                  key={page.id}
                  value={`${page.name} ${page.pageId}`}
                  onSelect={() => {
                    onChange(page.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === page.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{page.path}</p>
                    <p className="text-xs text-muted-foreground">{page.pageId}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
