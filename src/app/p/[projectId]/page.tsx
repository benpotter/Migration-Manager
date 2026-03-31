"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Users, AlertCircle, Upload, Pencil, Ban } from "lucide-react";
import Link from "next/link";
import { useProject } from "@/contexts/project-context";
import { useProjectData } from "@/hooks/use-project-data";
import { usePageTitle } from "@/hooks/use-page-title";
import { TemplatePickerDialog } from "@/components/pages/TemplatePickerDialog";
import { getStagesByPhase, isFinalStage } from "@/lib/workflow";
import type { MigrationStats } from "@/types";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

export default function ProjectDashboardPage() {
  const { projectId, project, dataMode, workflowStages } = useProject();
  const { stats, recentEdits, pagesLoading } = useProjectData();
  usePageTitle("Dashboard", project.name);
  const [templateOpen, setTemplateOpen] = useState(false);

  if (pagesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalPages = stats?.totalPages ?? 0;
  const byStatus = stats?.byStatus ?? {};
  const blockedCount = stats?.blockedCount ?? 0;

  // Use workflow stages for dynamic phase groupings
  const sortedStages = [...workflowStages].sort((a, b) => a.order - b.order);
  const finalStageId = sortedStages[sortedStages.length - 1]?.id;
  const publishedCount = byStatus[finalStageId] ?? 0;
  const completionPercent =
    totalPages > 0 ? Math.round((publishedCount / totalPages) * 100) : 0;

  // Phase-based groupings
  const phaseGroups = getStagesByPhase(workflowStages);
  const qaStages = phaseGroups["qa"] ?? [];
  const qaCount = qaStages.reduce((sum, s) => sum + (byStatus[s.id] ?? 0), 0);

  const macCount = stats?.byResponsibility?.MAC ?? 0;
  const rccCount = stats?.byResponsibility?.RCC ?? 0;

  return (
    <>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground">
          {project.client_name ? `${project.client_name} — ` : ""}Migration progress overview
        </p>
      </div>

      {/* Empty State */}
      {totalPages === 0 && !pagesLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {dataMode === "import" ? (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">Ready to import</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Upload your content inventory spreadsheet to get started.
                </p>
                <Button asChild>
                  <Link href={`/p/${projectId}/admin/import`}>Upload Excel File</Link>
                </Button>
              </>
            ) : dataMode === "direct_entry" ? (
              <>
                <Pencil className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">Start building</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Create your first page to begin building your site architecture.
                </p>
                <div className="flex gap-2">
                  <Button asChild>
                    <Link href={`/p/${projectId}/tree`}>Create Page</Link>
                  </Button>
                  <Button variant="outline" onClick={() => setTemplateOpen(true)}>
                    Use Template
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Import</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/p/${projectId}/admin/import`}>Upload</Link>
                    </Button>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border">
                    <Pencil className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Create</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/p/${projectId}/tree`}>Build</Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{sortedStages[sortedStages.length - 1]?.label ?? "Published"}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
            <p className="text-xs text-muted-foreground">
              {completionPercent}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In QA</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qaCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {blockedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress and Responsibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Migration Progress</CardTitle>
            <CardDescription>
              {completionPercent}% of pages have been published
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            {/* Dynamic status breakdown */}
            <div className="space-y-2">
              {sortedStages.map((stage) => {
                const count = byStatus[stage.id] ?? 0;
                const pct =
                  totalPages > 0
                    ? Math.round((count / totalPages) * 100)
                    : 0;
                return (
                  <div key={stage.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{stage.label}</span>
                      <span className="text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Responsibility</CardTitle>
            <CardDescription>MAC vs RCC content ownership</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">MAC</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {macCount} pages
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{
                    width: `${totalPages > 0 ? (macCount / totalPages) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">RCC</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {rccCount} pages
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{
                    width: `${totalPages > 0 ? (rccCount / totalPages) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest edits and comments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEdits && recentEdits.length > 0 ? (
            <div className="space-y-3">
              {recentEdits.slice(0, 20).map((edit) => (
                <div
                  key={edit.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px]">
                      {getInitials(edit.user?.name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">
                      {edit.user?.name ?? "Unknown"}
                    </span>{" "}
                    updated{" "}
                    <span className="font-medium">
                      {edit.field.replace(/_/g, " ")}
                    </span>{" "}
                    on{" "}
                    <span className="font-medium">{edit.page_name ?? edit.page_id}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(edit.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
    {templateOpen && (
      <TemplatePickerDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        projectId={projectId}
        onCreated={() => window.location.reload()}
      />
    )}
    </>
  );
}
