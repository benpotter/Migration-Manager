"use client";

import { useState, useEffect } from "react";
import type { Project, UserRole } from "@/types";

export interface ProjectWithRole extends Project {
  userRole: UserRole;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error("Failed to fetch projects");
        const json = await res.json();
        setProjects(json.data ?? []);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return { projects, loading };
}
