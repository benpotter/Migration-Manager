"use client";

import { useEffect, useState } from "react";
import { URIPatternView } from "@/components/uri/URIPatternView";
import { PageDetailPanel } from "@/components/detail/PageDetailPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/contexts/project-context";
import { usePageTitle } from "@/hooks/use-page-title";
import type { PageNode } from "@/types";

export default function ProjectURIPage() {
  const { projectId, project } = useProject();
  usePageTitle("URI View", project.name);
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTree() {
      try {
        const res = await fetch(`/api/p/${projectId}/pages/tree`);
        if (!res.ok) throw new Error("Failed to fetch tree data");
        const json = await res.json();
        setTree(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchTree();
  }, [projectId]);

  if (loading) {
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Error loading URI data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
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
