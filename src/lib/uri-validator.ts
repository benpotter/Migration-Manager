import type { PageNode, URIValidation, URIConflict } from "@/types";
import { URI_VALIDATION_CONFIG } from "@/lib/constants";
import { generateAllURIPaths, getURIDepth } from "@/lib/uri-generator";

/** Validate a single URI path against naming rules, length, and depth constraints */
export function validateURI(uri: string): URIValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  const segments = uri.split("/").filter(Boolean);
  const segmentCount = segments.length;
  const maxSegmentLength = Math.max(0, ...segments.map((s) => s.length));

  // Check each segment for allowed characters
  for (const segment of segments) {
    if (!URI_VALIDATION_CONFIG.allowedCharsRegex.test(segment)) {
      errors.push(`Segment "${segment}" contains invalid characters`);
    }

    // Check reserved words
    if ((URI_VALIDATION_CONFIG.reservedSegments as readonly string[]).includes(segment.toLowerCase())) {
      warnings.push(`Segment "${segment}" is a reserved word`);
    }

    // Segment length
    if (segment.length > URI_VALIDATION_CONFIG.maxSegmentLength) {
      errors.push(
        `Segment "${segment}" exceeds max length of ${URI_VALIDATION_CONFIG.maxSegmentLength}`
      );
    } else if (segment.length > URI_VALIDATION_CONFIG.warnSegmentLength) {
      warnings.push(
        `Segment "${segment}" is long (${segment.length} chars)`
      );
    }
  }

  // Total path length
  if (uri.length > URI_VALIDATION_CONFIG.maxPathLength) {
    errors.push(`Total path length ${uri.length} exceeds max of ${URI_VALIDATION_CONFIG.maxPathLength}`);
  }

  // Depth checks
  if (segmentCount > URI_VALIDATION_CONFIG.maxDepth) {
    errors.push(`Depth ${segmentCount} exceeds maximum of ${URI_VALIDATION_CONFIG.maxDepth}`);
  } else if (segmentCount > URI_VALIDATION_CONFIG.warnDepth) {
    warnings.push(`Depth ${segmentCount} exceeds recommended maximum of ${URI_VALIDATION_CONFIG.warnDepth}`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    segmentCount,
    maxSegmentLength,
  };
}

/** Detect duplicate slugs at the same tree level (URI conflicts) */
export function detectURIConflicts(nodes: PageNode[]): URIConflict[] {
  const conflicts: URIConflict[] = [];
  const uriMap = generateAllURIPaths(nodes);

  // Group pages by their full URI to find exact duplicates
  const uriToPages = new Map<string, { pageId: string; name: string }[]>();

  for (const [pageId, uri] of uriMap) {
    const normalized = uri.toLowerCase();
    if (!uriToPages.has(normalized)) {
      uriToPages.set(normalized, []);
    }
    uriToPages.get(normalized)!.push({ pageId, name: findPageName(nodes, pageId) });
  }

  for (const [uri, pages] of uriToPages) {
    if (pages.length > 1) {
      const depth = getURIDepth(uri);
      const segments = uri.split("/").filter(Boolean);
      conflicts.push({
        depth,
        segment: segments[segments.length - 1] || "",
        conflictingPages: pages,
      });
    }
  }

  return conflicts;
}

function findPageName(nodes: PageNode[], pageId: string): string {
  for (const node of nodes) {
    if (node.pageId === pageId) return node.name;
    const found = findPageName(node.children, pageId);
    if (found) return found;
  }
  return "";
}
