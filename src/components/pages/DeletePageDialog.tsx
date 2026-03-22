"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface PageInfo {
  id: string;
  name: string;
  page_id: string;
}

interface DeletePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  page: PageInfo;
  childCount: number;
  onDeleted: () => void;
}

export function DeletePageDialog({
  open,
  onOpenChange,
  projectId,
  page,
  childCount,
  onDeleted,
}: DeletePageDialogProps) {
  const [cascade, setCascade] = useState(false);
  const [descendants, setDescendants] = useState<PageInfo[]>([]);
  const [loadingDescendants, setLoadingDescendants] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch descendants when cascade is selected
  useEffect(() => {
    if (!cascade || !open || childCount === 0) {
      setDescendants([]);
      return;
    }

    async function fetchDescendants() {
      setLoadingDescendants(true);
      try {
        // Fetch all pages and filter client-side for descendants
        const res = await fetch(
          `/api/p/${projectId}/pages?pageSize=200`
        );
        if (!res.ok) return;
        const json = await res.json();
        const allPages = json.data as PageInfo[];

        // Build a map of parent → children
        const childMap = new Map<string, PageInfo[]>();
        for (const p of allPages) {
          const parentId = (p as unknown as { parent_page_id: string | null }).parent_page_id;
          if (parentId) {
            if (!childMap.has(parentId)) childMap.set(parentId, []);
            childMap.get(parentId)!.push(p);
          }
        }

        // Collect all descendants
        const result: PageInfo[] = [];
        const queue = [page.id];
        while (queue.length > 0) {
          const pid = queue.shift()!;
          const children = childMap.get(pid) ?? [];
          for (const child of children) {
            result.push(child);
            queue.push(child.id);
          }
        }
        setDescendants(result);
      } catch {
        // Non-critical
      } finally {
        setLoadingDescendants(false);
      }
    }

    fetchDescendants();
  }, [cascade, open, childCount, projectId, page.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const url = `/api/p/${projectId}/pages/${page.id}${cascade ? "?cascade=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      const result = await res.json();
      toast.success(
        `Deleted ${result.deleted} page${result.deleted > 1 ? "s" : ""}`
      );
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const totalToDelete = cascade ? 1 + descendants.length : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Page</DialogTitle>
          <DialogDescription>
            Delete &quot;{page.name}&quot; ({page.page_id})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {childCount > 0 && (
            <div className="space-y-3">
              <p className="text-sm">
                This page has {childCount} direct child{childCount !== 1 ? "ren" : ""}.
                How should they be handled?
              </p>

              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    !cascade ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    checked={!cascade}
                    onChange={() => setCascade(false)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium">Delete page only</p>
                    <p className="text-xs text-muted-foreground">
                      Children will be moved to the deleted page&apos;s parent
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    cascade ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    checked={cascade}
                    onChange={() => setCascade(true)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium">Delete page and all descendants</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently removes this page and all nested children
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {cascade && descendants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-destructive font-medium">
                {totalToDelete} page{totalToDelete > 1 ? "s" : ""} will be deleted:
              </p>
              <ScrollArea className="h-32 rounded-md border">
                <div className="p-2 space-y-1">
                  <div className="text-sm font-medium">
                    {page.name} ({page.page_id})
                  </div>
                  {descendants.map((d) => (
                    <div key={d.id} className="text-sm text-muted-foreground pl-3">
                      {d.name} ({d.page_id})
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {cascade && loadingDescendants && (
            <p className="text-sm text-muted-foreground">Loading descendants...</p>
          )}

          {childCount === 0 && (
            <p className="text-sm text-muted-foreground">
              This page has no children. It will be permanently deleted.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? "Deleting..."
              : `Delete ${totalToDelete} page${totalToDelete > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
