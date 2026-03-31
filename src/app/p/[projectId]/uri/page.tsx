"use client";

import { useState } from "react";
import { URIPatternView } from "@/components/uri/URIPatternView";
import { PageDetailPanel } from "@/components/detail/PageDetailPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/contexts/project-context";
import { useProjectData } from "@/hooks/use-project-data";
import { usePageTitle } from "@/hooks/use-page-title";

export default function ProjectURIPage() {
  const { projectId, project } = useProject();
  const { tree, pagesLoading, pagesError } = useProjectData();
  usePageTitle("URI View", project.name);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);

  if (pagesLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-8 w-1/3" />
      </div>
    );
  }

  if (pagesError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Error loading URI data</p>
          <p className="text-sm text-muted-foreground">{pagesError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <URIPatternView tree={tree} onOpenDetail={setDetailPageId} />
      <PageDetailPanel
        pageId={detailPageId}
        open={detailPageId !== null}
        onClose={() => setDetailPageId(null)}
        projectId={projectId}
      />
    </>
  );
}
