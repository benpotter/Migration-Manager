"use client";

import { StatusDistribution } from "@/components/analytics/StatusDistribution";
import { WorkloadChart } from "@/components/analytics/WorkloadChart";
import { ProgressChart } from "@/components/analytics/ProgressChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/contexts/project-context";
import { useProjectData } from "@/hooks/use-project-data";

export default function ProjectAnalyticsPage() {
  const { project, workflowStages } = useProject();
  const { pages, stats, pagesLoading } = useProjectData();

  if (pagesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
        <Skeleton className="h-[380px] w-full" />
      </div>
    );
  }

  const byStatus = (stats?.byStatus ?? {}) as Record<string, number>;
  const totalPages = stats?.totalPages ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          {project.name} — Migration progress and workload analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistribution byStatus={byStatus} stages={workflowStages} />
        <ProgressChart byStatus={byStatus} totalPages={totalPages} stages={workflowStages} />
      </div>

      <WorkloadChart pages={pages} />
    </div>
  );
}
