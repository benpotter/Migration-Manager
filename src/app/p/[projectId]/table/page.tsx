"use client";

import { useState } from "react";
import { PageTable } from "@/components/table/PageTable";
import { PageDetailPanel } from "@/components/detail/PageDetailPanel";
import { CreatePageDialog } from "@/components/pages/CreatePageDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useProject } from "@/contexts/project-context";
import { useProjectData } from "@/hooks/use-project-data";
import { usePageTitle } from "@/hooks/use-page-title";

export default function ProjectTablePage() {
  const { projectId, project, canEdit, dataMode, workflowStages } = useProject();
  const { pages, tree, pagesLoading, pagesError, refreshPages } = useProjectData();
  usePageTitle("Table View", project.name);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const showCreateActions = canEdit && dataMode !== "import";

  if (pagesLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (pagesError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Error loading data</p>
          <p className="text-sm text-muted-foreground">{pagesError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {showCreateActions && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Page
          </Button>
        </div>
      )}
      <PageTable
        data={pages}
        onOpenDetail={setDetailPageId}
        onDataChange={refreshPages}
        projectId={projectId}
        stages={workflowStages}
      />
      <PageDetailPanel
        pageId={detailPageId}
        open={detailPageId !== null}
        onClose={() => setDetailPageId(null)}
        projectId={projectId}
        onPageChange={refreshPages}
      />
      {showCreateActions && (
        <CreatePageDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          tree={tree}
          onCreated={refreshPages}
        />
      )}
    </div>
  );
}
