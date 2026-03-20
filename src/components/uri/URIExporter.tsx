"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportURIAsCSV,
  exportURIAsJSON,
  exportAsHtaccess,
  buildExportData,
  downloadFile,
} from "@/lib/uri-exporter";
import type { PageNode } from "@/types";

interface URIExporterProps {
  tree: PageNode[];
  uriMap: Map<string, string>;
}

export function URIExporter({ tree, uriMap }: URIExporterProps) {
  const handleExport = (format: "csv" | "json" | "htaccess") => {
    const data = buildExportData(tree, uriMap);

    switch (format) {
      case "csv":
        downloadFile(exportURIAsCSV(data), "uri-patterns.csv", "text/csv");
        break;
      case "json":
        downloadFile(exportURIAsJSON(data), "uri-patterns.json", "application/json");
        break;
      case "htaccess":
        downloadFile(exportAsHtaccess(data), ".htaccess", "text/plain");
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("htaccess")}>
          Export as .htaccess
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
