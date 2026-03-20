import type { PageNode, URIExportData } from "@/types";
import { generateAllURIPaths, getURIDepth } from "@/lib/uri-generator";
import { detectURIConflicts } from "@/lib/uri-validator";

/** Build flattened export data from the page tree */
export function buildExportData(
  nodes: PageNode[],
  uriMap: Map<string, string>
): URIExportData[] {
  const conflicts = detectURIConflicts(nodes);
  const conflictsByPageId = new Map<string, string[]>();

  for (const conflict of conflicts) {
    for (const page of conflict.conflictingPages) {
      if (!conflictsByPageId.has(page.pageId)) {
        conflictsByPageId.set(page.pageId, []);
      }
      conflictsByPageId.get(page.pageId)!.push(conflict.segment);
    }
  }

  const data: URIExportData[] = [];

  function walk(node: PageNode, parentId?: string) {
    const uri = uriMap.get(node.pageId) || "";
    data.push({
      pageId: node.pageId,
      pageName: node.name,
      currentURI: uri,
      status: node.status,
      depth: getURIDepth(uri),
      parentId: parentId || undefined,
      slug: node.slug || "",
      conflicts: conflictsByPageId.get(node.pageId) || [],
      contentResponsibility: node.contentResponsibility,
      migrationOwner: node.migrationOwner,
    });
    for (const child of node.children) {
      walk(child, node.pageId);
    }
  }

  for (const root of nodes) {
    walk(root);
  }

  return data;
}

/** Export URI data as CSV */
export function exportURIAsCSV(data: URIExportData[]): string {
  const headers = [
    "Page ID",
    "Page Name",
    "URI",
    "Status",
    "Depth",
    "Slug",
    "Content Responsibility",
    "Migration Owner",
    "Conflicts",
  ];

  const rows = data.map((d) => [
    d.pageId,
    `"${d.pageName.replace(/"/g, '""')}"`,
    d.currentURI,
    d.status,
    d.depth.toString(),
    d.slug,
    d.contentResponsibility || "",
    d.migrationOwner || "",
    d.conflicts.join("; "),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/** Export URI data as structured JSON */
export function exportURIAsJSON(data: URIExportData[]): string {
  return JSON.stringify(data, null, 2);
}

/** Export as .htaccess redirect rules (source_url -> new URI) */
export function exportAsHtaccess(data: URIExportData[]): string {
  const lines = [
    "# Generated URI redirect rules",
    "# Format: Redirect 301 /old-path /new-path",
    "",
  ];

  for (const d of data) {
    if (d.currentURI) {
      lines.push(`# ${d.pageName} (${d.pageId})`);
      lines.push(`Redirect 301 /old-path/${d.slug || d.pageId} ${d.currentURI}`);
    }
  }

  return lines.join("\n");
}

/** Trigger a file download in the browser */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
