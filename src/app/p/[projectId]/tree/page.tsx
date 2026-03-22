"use client";

import { useEffect, useState, useCallback } from "react";
import { SiteTree } from "@/components/tree/SiteTree";
import { PageDetailPanel } from "@/components/detail/PageDetailPanel";
import { CreatePageDialog } from "@/components/pages/CreatePageDialog";
import { BatchCreateDialog } from "@/components/pages/BatchCreateDialog";
import { DeletePageDialog } from "@/components/pages/DeletePageDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import { useProject } from "@/contexts/project-context";
import { usePageTitle } from "@/hooks/use-page-title";
import { toast } from "sonner";
import type { PageNode, MigrationStatus, ContentResponsibility } from "@/types";

export default function ProjectTreePage() {
  const { projectId, project, canEdit, dataMode, isProjectAdmin } = useProject();
  usePageTitle("Tree View", project.name);
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    page_id: string;
    childCount: number;
  } | null>(null);

  const showCreateActions = canEdit && dataMode !== "import";
  const showDeleteActions = isProjectAdmin && dataMode !== "import";
  const enableDnd = canEdit && dataMode !== "import";

  const fetchTree = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleAddPage = () => {
    setCreateParentId(null);
    setCreateOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setCreateParentId(parentId);
    setCreateOpen(true);
  };

  const handleDeleteRequest = (id: string, name: string, pageIdStr: string, childCount: number) => {
    setDeleteTarget({ id, name, page_id: pageIdStr, childCount });
  };

  const handleReorder = async (pageId: string, newParentId: string | null, newSortOrder: number) => {
    try {
      const res = await fetch(`/api/p/${projectId}/pages/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, newParentPageId: newParentId, newSortOrder }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reorder");
      }
      fetchTree();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const handleStatusChange = async (nodeId: string, status: MigrationStatus) => {
    try {
      const res = await fetch(`/api/p/${projectId}/pages/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchTree();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleResponsibilityChange = async (nodeId: string, value: ContentResponsibility) => {
    try {
      const res = await fetch(`/api/p/${projectId}/pages/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_responsibility: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchTree();
    } catch {
      toast.error("Failed to update responsibility");
    }
  };

  const handleRename = useCallback(() => {
    fetchTree();
  }, [fetchTree]);

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
          <p className="text-destructive font-medium">Error loading tree</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showCreateActions && (
        <div className="absolute top-20 right-6 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBatchCreateOpen(true)}
            className="gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            Batch Create
          </Button>
        </div>
      )}
      <SiteTree
        tree={tree}
        onOpenDetail={setDetailPageId}
        onAddPage={showCreateActions ? handleAddPage : undefined}
        onAddChild={showCreateActions ? handleAddChild : undefined}
        onDelete={showDeleteActions ? handleDeleteRequest : undefined}
        onReorder={enableDnd ? handleReorder : undefined}
        onStatusChange={canEdit ? handleStatusChange : undefined}
        onResponsibilityChange={canEdit ? handleResponsibilityChange : undefined}
        onRename={canEdit ? handleRename : undefined}
        projectId={projectId}
        enableDnd={enableDnd}
      />
      <PageDetailPanel
        pageId={detailPageId}
        open={detailPageId !== null}
        onClose={() => setDetailPageId(null)}
        projectId={projectId}
        onDelete={showDeleteActions ? handleDeleteRequest : undefined}
        onPageChange={fetchTree}
      />
      {showCreateActions && (
        <>
          <CreatePageDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={projectId}
            tree={tree}
            defaultParentId={createParentId}
            onCreated={fetchTree}
          />
          <BatchCreateDialog
            open={batchCreateOpen}
            onOpenChange={setBatchCreateOpen}
            projectId={projectId}
            tree={tree}
            defaultParentId={createParentId}
            onCreated={fetchTree}
          />
        </>
      )}
      {deleteTarget && (
        <DeletePageDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          projectId={projectId}
          page={deleteTarget}
          childCount={deleteTarget.childCount}
          onDeleted={() => {
            setDetailPageId(null);
            setDeleteTarget(null);
            fetchTree();
          }}
        />
      )}
    </>
  );
}
