"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function DangerZoneSettingsPage() {
  const { project, projectId, isProjectAdmin } = useProject();
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = async (status: string) => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success(
        status === "archived"
          ? "Project archived"
          : status === "completed"
          ? "Project marked as complete"
          : "Project reopened"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== project.name) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Project deleted");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (!isProjectAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Only project admins can access danger zone settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Status */}
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="text-base text-amber-700 dark:text-amber-400">
            Project Status
          </CardTitle>
          <CardDescription>
            Current status: <span className="font-medium capitalize">{project.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.status === "active" && (
            <>
              <div>
                <p className="text-sm font-medium">Complete Project</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Mark as complete. Project becomes read-only with a completion banner.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("completed")}
                  disabled={archiving}
                >
                  Mark as Complete
                </Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium">Archive Project</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Project will be read-only and hidden from the main project list.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("archived")}
                  disabled={archiving}
                >
                  Archive Project
                </Button>
              </div>
            </>
          )}

          {project.status === "completed" && (
            <>
              <div>
                <p className="text-sm font-medium">Reopen Project</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Return project to active status with full read/write access.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("active")}
                  disabled={archiving}
                >
                  Reopen Project
                </Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium">Archive Project</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Hide project from the main list.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("archived")}
                  disabled={archiving}
                >
                  Archive Project
                </Button>
              </div>
            </>
          )}

          {project.status === "archived" && (
            <div>
              <p className="text-sm font-medium">Reopen Project</p>
              <p className="text-xs text-muted-foreground mb-2">
                Return project to active status with full read/write access.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("active")}
                disabled={archiving}
              >
                Reopen Project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Project */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Delete Project
          </CardTitle>
          <CardDescription>
            Permanently delete this project and all its data. This action cannot
            be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm">
              Type <span className="font-mono font-medium">{project.name}</span>{" "}
              to confirm:
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={project.name}
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || deleteConfirm !== project.name}
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
