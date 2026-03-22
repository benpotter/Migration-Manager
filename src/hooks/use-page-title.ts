"use client";

import { useEffect } from "react";

/**
 * Set the browser tab title. Format: "[View] | [Project Name]" or just "[View]".
 */
export function usePageTitle(view: string, projectName?: string) {
  useEffect(() => {
    const parts = [view];
    if (projectName) parts.push(projectName);
    document.title = parts.join(" | ");

    return () => {
      document.title = "Migration Manager";
    };
  }, [view, projectName]);
}
