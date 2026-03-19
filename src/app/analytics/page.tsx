"use client";

import { useEffect, useState } from "react";
import { StatusDistribution } from "@/components/analytics/StatusDistribution";
import { WorkloadChart } from "@/components/analytics/WorkloadChart";
import { ProgressChart } from "@/components/analytics/ProgressChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { MigrationStats, MigrationStatus, PageRow } from "@/types";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, pagesRes] = await Promise.all([
          fetch("/api/pages/stats"),
          fetch("/api/pages"),
        ]);

        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStats(statsJson.data ?? null);
        }
        if (pagesRes.ok) {
          const pagesJson = await pagesRes.json();
          setPages(pagesJson.data ?? []);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[380px]" />
          <Skeleton className="h-[380px]" />
        </div>
        <Skeleton className="h-[380px] w-full" />
      </div>
    );
  }

  const byStatus = (stats?.byStatus ?? {}) as Record<MigrationStatus, number>;
  const totalPages = stats?.totalPages ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Migration progress and workload analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistribution byStatus={byStatus} />
        <ProgressChart byStatus={byStatus} totalPages={totalPages} />
      </div>

      <WorkloadChart pages={pages} />
    </div>
  );
}
