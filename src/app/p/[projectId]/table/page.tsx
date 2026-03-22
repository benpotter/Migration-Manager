"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTable } from "@/components/table/PageTable";
import { PageDetailPanel } from "@/components/detail/PageDetailPanel";
import { CreatePageDialog } from "@/components/pages/CreatePageDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useProject } from "@/contexts/project-context";
import { usePageTitle } from "@/hooks/use-page-title";
import type { PageRow, PageNode } from "@/types";

export default function ProjectTablePage() {
  const { projectId, project, canEdit, dataMode } = useProject();
  usePageTitle("Table View", project.name);
  const [data, setData] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tree, setTree] = useState<PageNode[]>([]);

  const showCreateActions = canEdit && dataMode !== "import";

  const fetchData = useCallback(async () => {
    try {
      const allPages: PageRow[] = [];
      let page = 1;
      const pageSize = 200;
      let keepFetching = true;

      while (keepFetching) {
        const res = await fetch(
          `/api/p/${projectId}/pages?page=${page}&pageSize=${pageSize}`
        );
        if (!res.ok) throw new Error("Failed to fetch pages");
        const json = await res.json();
        const batch = json.data ?? [];
        allPages.push(...batch);

        if (batch.length < pageSize || allPages.length >= (json.pagination?.total ?? 0)) {
          keepFetching = false;
        } else {
          page++;
        }
      }

      setData(allPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch tree for the create dialog's parent selector
  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/p/${projectId}/pages/tree`);
      if (res.ok) {
        const json = await res.json();
        setTree(json.data ?? []);
      }
    } catch {
      // Non-critical
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
    if (showCreateActions) fetchTree();
  }, [fetchData, fetchTree, showCreateActions]);

  const handleCreated = () => {
    fetchData();
    fetchTree();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Error loading data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
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
        data={data}
        onOpenDetail={setDetailPageId}
        onDataChange={fetchData}
        projectId={projectId}
      />
      <PageDetailPanel
        pageId={detailPageId}
        open={detailPageId !== null}
        onClose={() => setDetailPageId(null)}
        projectId={projectId}
      />
      {showCreateActions && (
        <CreatePageDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          tree={tree}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
