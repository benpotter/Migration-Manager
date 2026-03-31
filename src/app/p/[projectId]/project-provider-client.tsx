"use client";

import { useMemo } from "react";
import { ProjectContext } from "@/contexts/project-context";
import { ProjectDataProvider } from "@/contexts/project-data-context";
import { useRecentProjects } from "@/hooks/use-recent-projects";
import { getWorkflowStages } from "@/lib/workflow";
import type { Project, UserRole } from "@/types";

export function ProjectProviderClient({
  project,
  userRole,
  children,
}: {
  project: Project;
  userRole: UserRole;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const isReadOnly = project.status !== "active";
    const canEdit = !isReadOnly && (userRole === "admin" || userRole === "editor");
    const isProjectAdmin = userRole === "admin";
    const workflowStages = getWorkflowStages(project.settings);

    return {
      projectId: project.id,
      project,
      userRole,
      dataMode: project.data_mode,
      isReadOnly,
      canEdit,
      isProjectAdmin,
      workflowStages,
    };
  }, [project, userRole]);

  const isReadOnly = project.status !== "active";

  // Track recent project access
  useRecentProjects(project.id, project.name);

  return (
    <ProjectContext.Provider value={value}>
      {isReadOnly && (
        <div className={`px-4 py-2 text-center text-sm ${
          project.status === "completed"
            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
            : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
        }`}>
          {project.status === "completed"
            ? "This project is marked as complete. All data is read-only."
            : "This project is archived. All data is read-only."}
        </div>
      )}
      <ProjectDataProvider>
        {children}
      </ProjectDataProvider>
    </ProjectContext.Provider>
  );
}
