"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  FileText,
  TrendingUp,
  Ban,
  ArrowRight,
  Plus,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ProjectSummary } from "@/types";

function formatTime(dateStr: string): string {
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

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useCurrentUser();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    async function fetchSummary() {
      try {
        const res = await fetch("/api/projects/summary");
        if (res.status === 401) {
          router.replace("/auth/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setProjects(json.data ?? []);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [user, authLoading, router]);

  const isSuperAdmin = user?.is_superadmin;

  if (loading || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // No projects → onboarding
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            {isSuperAdmin ? (
              <>
                <h2 className="text-xl font-semibold mb-2">Create your first project</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Projects organize your migration work by client. Each project has its own pages, workflow stages, and team members.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-left text-sm">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                    <span>Create a project and choose a workflow template</span>
                  </div>
                  <div className="flex items-start gap-3 text-left text-sm">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                    <span>Import your content inventory or create pages manually</span>
                  </div>
                  <div className="flex items-start gap-3 text-left text-sm">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                    <span>Track progress through your custom workflow stages</span>
                  </div>
                </div>
                <Button asChild className="mt-6">
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Ask your administrator to invite you to a project to get started.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 1+ projects → project portfolio cards
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Your active migration projects
          </p>
        </div>
        {isSuperAdmin && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        )}
      </div>

      {/* Project cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const completionPct =
            project.totalPages > 0
              ? Math.round((project.publishedCount / project.totalPages) * 100)
              : 0;

          return (
            <Link key={project.id} href={`/p/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
                {/* Color accent bar */}
                <div
                  className="h-1.5 rounded-t-lg"
                  style={{ backgroundColor: project.color }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base group-hover:underline">
                        {project.name}
                      </CardTitle>
                      {project.client_name && (
                        <CardDescription className="text-xs mt-0.5">
                          {project.client_name}
                        </CardDescription>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{completionPct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${completionPct}%`,
                          backgroundColor: project.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{project.totalPages} pages</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span>{project.publishedCount} published</span>
                    </div>
                    {project.blockedCount > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <Ban className="h-3 w-3" />
                        <span>{project.blockedCount} blocked</span>
                      </div>
                    )}
                  </div>

                  {/* Last activity */}
                  {project.lastActivityAt && (
                    <p className="text-[10px] text-muted-foreground">
                      Last activity: {formatTime(project.lastActivityAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Link to all projects (including archived) */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects" className="text-muted-foreground">
            View all projects (including completed & archived)
          </Link>
        </Button>
      </div>
    </div>
  );
}
