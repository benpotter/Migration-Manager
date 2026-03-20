"use client";

import { cn } from "@/lib/utils";
import { truncateURI } from "@/lib/uri-generator";

interface URISegmentProps {
  uri: string;
  maxAncestors?: number;
  className?: string;
  onSegmentClick?: (segment: string) => void;
}

export function URISegment({
  uri,
  maxAncestors = 3,
  className,
  onSegmentClick,
}: URISegmentProps) {
  const displayURI = truncateURI(uri, maxAncestors);
  const segments = displayURI.split("/").filter(Boolean);

  return (
    <span className={cn("font-mono text-sm", className)}>
      <span className="text-muted-foreground">/</span>
      {segments.map((segment, i) => (
        <span key={i}>
          {segment === "..." ? (
            <span className="text-muted-foreground">...</span>
          ) : (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSegmentClick?.(segment);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onSegmentClick?.(segment);
                }
              }}
              className="hover:text-primary hover:underline transition-colors cursor-pointer"
            >
              {segment}
            </span>
          )}
          {i < segments.length - 1 && (
            <span className="text-muted-foreground">/</span>
          )}
        </span>
      ))}
    </span>
  );
}
