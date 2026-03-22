"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Archive,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import type { Project, UserRole, ProjectStatus } from "@/types";

interface ProjectWithRole extends Project {
  userRole: UserRole;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  archived: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

type SortOption = "name" | "updated_at" | "status";

export default function ProjectsPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const json = await res.json();
      setProjects(json.data ?? []);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(projectId: string, status: ProjectStatus) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(
        status === "archived"
          ? "Project archived"
          : status === "completed"
          ? "Project completed"
          : "Project reopened"
      );
      fetchProjects();
    } catch {
      toast.error("Failed to update project");
    }
  }

  async function handleDelete(projectId: string, projectName: string) {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Project deleted");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  }

  const filtered = useMemo(() => {
    let result = projects;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Show/hide archived
    if (!showArchived && statusFilter === "all") {
      result = result.filter((p) => p.status !== "archived");
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.client_name?.toLowerCase().includes(q) ?? false) ||
          (p.description?.toLowerCase().includes(q) ?? false)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "updated_at")
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

    return result;
  }, [projects, search, statusFilter, showArchived, sortBy]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Select a project to manage its migration
          </p>
        </div>
        {user?.is_superadmin && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Link>
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="updated_at">Last Updated</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        {statusFilter === "all" && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(v) => setShowArchived(!!v)}
            />
            Show archived
          </label>
        )}
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          {projects.length === 0 ? (
            <>
              <p className="text-muted-foreground">No projects yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first project to get started managing content migrations.
              </p>
              {user?.is_superadmin && (
                <Button className="mt-4" asChild>
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No projects match your filters.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className={`hover:shadow-md transition-shadow cursor-pointer h-full relative group ${
                project.status === "archived" ? "opacity-70" : ""
              }`}
            >
              {/* Color accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={{ backgroundColor: project.color || "#6b7280" }}
              />

              <Link href={`/p/${project.id}`} className="block">
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || "#6b7280" }}
                      />
                      <CardTitle className="text-base truncate">
                        {project.name}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[project.status]}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  {project.client_name && (
                    <CardDescription className="truncate">
                      {project.client_name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[project.userRole]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {project.data_mode === "import"
                        ? "Import"
                        : project.data_mode === "direct_entry"
                        ? "Direct Entry"
                        : "Hybrid"}
                    </span>
                  </div>
                </CardContent>
              </Link>

              {/* Three-dot menu */}
              {project.userRole === "admin" && (
                <div className="absolute top-4 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/p/${project.id}/settings`);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {project.status === "active" && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              handleStatusChange(project.id, "completed");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Complete
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              handleStatusChange(project.id, "archived");
                            }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </>
                      )}
                      {(project.status === "completed" || project.status === "archived") && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange(project.id, "active");
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reopen
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(project.id, project.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
