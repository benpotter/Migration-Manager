import type { PageRow } from "@/types";

export interface ComputedStats {
  totalPages: number;
  byStatus: Record<string, number>;
  byResponsibility: Record<string, number>;
  byPageStyle: Record<string, number>;
  byMigrationOwner: Record<string, number>;
  blockedCount: number;
}

export function computeStats(pages: PageRow[]): ComputedStats {
  const byStatus: Record<string, number> = {};
  const byResponsibility: Record<string, number> = {};
  const byPageStyle: Record<string, number> = {};
  const byMigrationOwner: Record<string, number> = {};
  let blockedCount = 0;

  for (const page of pages) {
    byStatus[page.status] = (byStatus[page.status] || 0) + 1;

    if (page.is_blocked) blockedCount++;

    const resp = page.content_responsibility || "Unassigned";
    byResponsibility[resp] = (byResponsibility[resp] || 0) + 1;

    const style = page.page_style || "Unassigned";
    byPageStyle[style] = (byPageStyle[style] || 0) + 1;

    const owner = page.migration_owner || "Unassigned";
    byMigrationOwner[owner] = (byMigrationOwner[owner] || 0) + 1;
  }

  return {
    totalPages: pages.length,
    byStatus,
    byResponsibility,
    byPageStyle,
    byMigrationOwner,
    blockedCount,
  };
}
