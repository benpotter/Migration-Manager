"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderOpen,
  LayoutDashboard,
  Network,
  Table2,
  Globe,
  Settings,
  Upload,
  Plus,
} from "lucide-react";
import { useProjects, type ProjectWithRole } from "@/hooks/use-projects";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectId?: string | null;
}

export function CommandPalette({
  open,
  onOpenChange,
  currentProjectId,
}: CommandPaletteProps) {
  const router = useRouter();
  const { projects } = useProjects();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mm_recent_projects") || "[]");
      setRecentIds(stored.map((r: { id: string }) => r.id));
    } catch {
      // ignore
    }
  }, [open]);

  const navigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  const recentProjects = recentIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean) as ProjectWithRole[];

  const otherProjects = projects.filter(
    (p) => !recentIds.includes(p.id) && p.id !== currentProjectId
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command Palette">
      <CommandInput placeholder="Search projects, pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick actions */}
        {currentProjectId && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => navigate(`/p/${currentProjectId}`)}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/p/${currentProjectId}/tree`)}>
              <Network className="mr-2 h-4 w-4" />
              Tree View
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/p/${currentProjectId}/table`)}>
              <Table2 className="mr-2 h-4 w-4" />
              Table View
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/p/${currentProjectId}/uri`)}>
              <Globe className="mr-2 h-4 w-4" />
              URI View
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/p/${currentProjectId}/admin/import`)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/p/${currentProjectId}/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              Project Settings
            </CommandItem>
          </CommandGroup>
        )}

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Projects">
              {recentProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => navigate(`/p/${project.id}`)}
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color || "#6b7280" }}
                  />
                  <span>{project.name}</span>
                  {project.client_name && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {project.client_name}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* All projects */}
        {otherProjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="All Projects">
              {otherProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => navigate(`/p/${project.id}`)}
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color || "#6b7280" }}
                  />
                  <span>{project.name}</span>
                  {project.client_name && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {project.client_name}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate("/projects/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Project
          </CommandItem>
          <CommandItem onSelect={() => navigate("/projects")}>
            <FolderOpen className="mr-2 h-4 w-4" />
            View All Projects
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
