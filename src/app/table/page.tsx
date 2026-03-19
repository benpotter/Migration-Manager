"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTable } from "@/components/table/PageTable";
import { PageDetailPanel } from "@/components/detail/PageDetailPanel";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageRow } from "@/types";

export default function TablePage() {
  const [data, setData] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch all pages by paginating through the API
      const allPages: PageRow[] = [];
      let page = 1;
      const pageSize = 200;
      let keepFetching = true;

      while (keepFetching) {
        const res = await fetch(`/api/pages?page=${page}&pageSize=${pageSize}`);
        if (!res.ok) throw new Error("Failed to fetch pages");
        const json = await res.json();
        const batch = json.data ?? [];
        allPages.push(...batch);

        if (batch.length < pageSize || allPages.length >= (json.pagination?.total ?? 0)) {
          keepFetching = false;
        } else {
          page++;
        }
      }

      setData(allPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Error loading data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageTable
        data={data}
        onOpenDetail={setDetailPageId}
        onDataChange={fetchData}
      />
      <PageDetailPanel
        pageId={detailPageId}
        open={detailPageId !== null}
        onClose={() => setDetailPageId(null)}
      />
    </div>
  );
}
