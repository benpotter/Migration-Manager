import { useContext } from "react";
import { ProjectDataContext } from "@/contexts/project-data-context";
import type { ProjectDataContextValue } from "@/contexts/project-data-context";

export function useProjectData(): ProjectDataContextValue {
  const ctx = useContext(ProjectDataContext);
  if (!ctx) {
    throw new Error("useProjectData must be used within a ProjectDataProvider");
  }
  return ctx;
}
