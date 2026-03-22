"use client";

import { useEffect, useCallback } from "react";

interface RecentProject {
  id: string;
  name: string;
  lastAccessed: number;
}

const STORAGE_KEY = "mm_recent_projects";
const MAX_ENTRIES = 5;

export function trackProjectAccess(id: string, name: string) {
  try {
    const recent: RecentProject[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    const filtered = recent.filter((p) => p.id !== id);
    filtered.unshift({ id, name, lastAccessed: Date.now() });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(filtered.slice(0, MAX_ENTRIES))
    );
  } catch {
    // localStorage unavailable
  }
}

export function getRecentProjects(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Hook to track project access. Call in project layout.
 */
export function useRecentProjects(projectId: string, projectName: string) {
  useEffect(() => {
    trackProjectAccess(projectId, projectName);
  }, [projectId, projectName]);
}
