"use client";

import { createContext, useContext } from "react";
import type { Project, UserRole, DataMode } from "@/types";

interface ProjectContextValue {
  projectId: string;
  project: Project;
  userRole: UserRole;
  dataMode: DataMode;
  isReadOnly: boolean;
  canEdit: boolean;
  isProjectAdmin: boolean;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
