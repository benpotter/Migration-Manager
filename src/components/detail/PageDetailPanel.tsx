"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusStepper } from "./StatusStepper";
import { CommentThread } from "./CommentThread";
import { EditHistory } from "./EditHistory";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ResponsibilityBadge } from "@/components/shared/ResponsibilityBadge";
import { MC_TEMPLATES, CONTENT_RESPONSIBILITIES, STATUS_CONFIG } from "@/lib/constants";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ExternalLink, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PageRow, ContentResponsibility } from "@/types";

interface PageDetailPanelProps {
  pageId: string | null;
  open: boolean;
  onClose: () => void;
  projectId?: string;
  onDelete?: (pageId: string, pageName: string, pageIdStr: string, childCount: number) => void;
  onPageChange?: () => void;
}

export function PageDetailPanel({ pageId, open, onClose, projectId, onDelete, onPageChange }: PageDetailPanelProps) {
  const buildUrl = (path: string) => projectId ? `/api/p/${projectId}${path}` : `/api${path}`;

  const [page, setPage] = useState<PageRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedFields, setEditedFields] = useState<Partial<PageRow>>({});

  useEffect(() => {
    if (!pageId || !open) {
      setPage(null);
      setEditedFields({});
      return;
    }

    async function fetchPage() {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(`/pages/${pageId}`));
        if (!res.ok) throw new Error("Failed to fetch page");
        const { data } = await res.json();
        setPage(data);
      } catch {
        toast.error("Failed to load page details");
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [pageId, open]);

  const currentValue = <K extends keyof PageRow>(field: K): PageRow[K] => {
    if (field in editedFields) return editedFields[field] as PageRow[K];
    return page?.[field] as PageRow[K];
  };

  const updateField = (field: keyof PageRow, value: string | null) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!pageId || Object.keys(editedFields).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(buildUrl(`/pages/${pageId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedFields),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { data: updated } = await res.json();
      setPage(updated);
      setEditedFields({});
      toast.success("Page updated successfully");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!pageId) return;
    try {
      const res = await fetch(buildUrl(`/pages/${pageId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const { data: updated } = await res.json();
      setPage(updated);
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label ?? status}`);
      onPageChange?.();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleBlockToggle = async (blocked: boolean, reason?: string) => {
    if (!pageId) return;
    try {
      const updates: Record<string, unknown> = {
        is_blocked: blocked,
        blocked_reason: blocked ? (reason ?? null) : null,
        blocked_at: blocked ? new Date().toISOString() : null,
      };
      const res = await fetch(buildUrl(`/pages/${pageId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      const { data: updated } = await res.json();
      setPage(updated);
      toast.success(blocked ? "Page blocked" : "Page unblocked");
      onPageChange?.();
    } catch {
      toast.error("Failed to update blocked status");
    }
  };

  const hasChanges = Object.keys(editedFields).length > 0;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col"
      >
        {loading ? (
          <div className="p-6 space-y-4">
            <VisuallyHidden><SheetTitle>Loading page details</SheetTitle></VisuallyHidden>
            <VisuallyHidden><SheetDescription>Loading page details</SheetDescription></VisuallyHidden>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : page ? (
          <>
            {/* Header */}
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="text-lg">{page.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span className="font-mono text-xs">{page.page_id}</span>
                <StatusBadge status={page.status} isBlocked={page.is_blocked} />
                <ResponsibilityBadge
                  responsibility={page.content_responsibility}
                />
              </SheetDescription>
            </SheetHeader>

            {/* Status Stepper */}
            <div className="px-6 pb-4">
              <StatusStepper
                currentStatus={currentValue("status")}
                isBlocked={page.is_blocked ?? false}
                blockedReason={page.blocked_reason}
                onStatusChange={handleStatusChange}
                onBlockToggle={handleBlockToggle}
              />
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 w-fit">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* Details Tab */}
                <TabsContent value="details" className="p-6 space-y-6 mt-0">
                  {/* Links Section */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Links</h4>
                    <div className="grid gap-2">
                      {page.source_url && (
                        <a
                          href={page.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Source URL
                        </a>
                      )}
                      {page.content_draft_url && (
                        <a
                          href={page.content_draft_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Content Draft
                        </a>
                      )}
                      {page.design_file_url && (
                        <a
                          href={page.design_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Design File
                        </a>
                      )}
                      {!page.source_url && !page.content_draft_url && !page.design_file_url && (
                        <p className="text-sm text-muted-foreground">No links available</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Editable Fields */}
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Input
                          value={currentValue("type") ?? ""}
                          onChange={(e) =>
                            updateField("type", e.target.value || null)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Slug</Label>
                        <Input
                          value={currentValue("slug") ?? ""}
                          onChange={(e) =>
                            updateField("slug", e.target.value || null)
                          }
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Page Style</Label>
                        <p className="text-sm">{page.page_style ?? "-"}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">MC Template</Label>
                        <Select
                          value={currentValue("mc_template") ?? ""}
                          onValueChange={(val) =>
                            updateField("mc_template", val || null)
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MC_TEMPLATES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Content Responsibility</Label>
                        <Select
                          value={currentValue("content_responsibility") ?? ""}
                          onValueChange={(val) =>
                            updateField(
                              "content_responsibility",
                              val as ContentResponsibility
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_RESPONSIBILITIES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Migration Owner</Label>
                        <Select
                          value={currentValue("migration_owner") ?? ""}
                          onValueChange={(val) =>
                            updateField(
                              "migration_owner",
                              val as ContentResponsibility
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_RESPONSIBILITIES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Migrator</Label>
                        <Input
                          value={currentValue("migrator") ?? ""}
                          onChange={(e) =>
                            updateField("migrator", e.target.value || null)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Content Author</Label>
                        <Input
                          value={currentValue("content_author") ?? ""}
                          onChange={(e) =>
                            updateField("content_author", e.target.value || null)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Content Approver</Label>
                      <Input
                        value={currentValue("content_approver") ?? ""}
                        onChange={(e) =>
                          updateField("content_approver", e.target.value || null)
                        }
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Content Notes</Label>
                      <Textarea
                        value={currentValue("content_notes") ?? ""}
                        onChange={(e) =>
                          updateField("content_notes", e.target.value || null)
                        }
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  {hasChanges && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditedFields({})}
                      >
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}

                  <Separator />

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      Created: {new Date(page.created_at).toLocaleString()}
                    </p>
                    <p>
                      Updated: {new Date(page.updated_at).toLocaleString()}
                    </p>
                    <p>Depth: {page.depth}</p>
                    {page.parent_page_id && (
                      <p>Parent: {page.parent_page_id}</p>
                    )}
                  </div>

                  {/* Delete action */}
                  {onDelete && (
                    <>
                      <Separator />
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive gap-1.5"
                          onClick={() => onDelete(page.id, page.name, page.page_id, 0)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Page
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-0">
                  <CommentThread pageId={page.id} projectId={projectId} />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-0">
                  <EditHistory pageId={page.id} projectId={projectId} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <VisuallyHidden><SheetTitle>No page selected</SheetTitle></VisuallyHidden>
            No page selected
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
