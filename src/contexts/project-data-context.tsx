"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { buildTree } from "@/lib/tree-builder";
import { computeStats } from "@/lib/compute-stats";
import type { ComputedStats } from "@/lib/compute-stats";
import type { PageRow, PageNode, PageEdit, Comment, MigrationStats } from "@/types";

export interface ProjectDataContextValue {
  pages: PageRow[];
  tree: PageNode[];
  stats: ComputedStats | null;
  recentEdits: MigrationStats["recentEdits"];
  recentComments: MigrationStats["recentComments"];
  pagesLoading: boolean;
  pagesError: string | null;
  refreshPages: () => Promise<void>;
  refreshActivity: () => Promise<void>;
}

export const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

export function ProjectDataProvider({ children }: { children: React.ReactNode }) {
  const { projectId } = useProject();

  const [pages, setPages] = useState<PageRow[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState<string | null>(null);

  const [recentEdits, setRecentEdits] = useState<MigrationStats["recentEdits"]>([]);
  const [recentComments, setRecentComments] = useState<MigrationStats["recentComments"]>([]);

  const fetchPages = useCallback(async () => {
    try {
      setPagesError(null);
      const res = await fetch(`/api/p/${projectId}/pages?all=true`);
      if (!res.ok) throw new Error("Failed to fetch pages");
      const json = await res.json();
      setPages(json.data ?? []);
    } catch (err) {
      setPagesError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [projectId]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/p/${projectId}/pages/stats`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data as MigrationStats | undefined;
      if (data) {
        setRecentEdits(data.recentEdits ?? []);
        setRecentComments(data.recentComments ?? []);
      }
    } catch {
      // Activity is non-critical
    }
  }, [projectId]);

  const refreshPages = useCallback(async () => {
    await fetchPages();
  }, [fetchPages]);

  const refreshActivity = useCallback(async () => {
    await fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPagesLoading(true);
      await Promise.all([fetchPages(), fetchActivity()]);
      if (!cancelled) setPagesLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [fetchPages, fetchActivity]);

  const tree = useMemo(() => buildTree(pages), [pages]);
  const stats = useMemo(() => (pages.length > 0 ? computeStats(pages) : null), [pages]);

  const value = useMemo<ProjectDataContextValue>(
    () => ({
      pages,
      tree,
      stats,
      recentEdits,
      recentComments,
      pagesLoading,
      pagesError,
      refreshPages,
      refreshActivity,
    }),
    [pages, tree, stats, recentEdits, recentComments, pagesLoading, pagesError, refreshPages, refreshActivity]
  );

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
}
