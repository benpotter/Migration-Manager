"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useCallback } from "react";

interface KeyboardShortcutOptions {
  onCommandK?: () => void;
  onNewPage?: () => void;
  onEscape?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  enabled?: boolean;
}

/**
 * Hook to register keyboard shortcuts.
 * Shortcuts are disabled when dialogs/inputs are focused.
 */
export function useKeyboardShortcuts({
  onCommandK,
  onNewPage,
  onEscape,
  onDelete,
  onRename,
  enabled = true,
}: KeyboardShortcutOptions) {
  const isInputFocused = useCallback(() => {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      (active as HTMLElement).isContentEditable
    );
  }, []);

  // Cmd+K — Command palette
  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      onCommandK?.();
    },
    { enabled: enabled && !!onCommandK, enableOnFormTags: true }
  );

  // Cmd+N — New page
  useHotkeys(
    "mod+n",
    (e) => {
      e.preventDefault();
      if (!isInputFocused()) onNewPage?.();
    },
    { enabled: enabled && !!onNewPage }
  );

  // Escape
  useHotkeys(
    "escape",
    () => {
      onEscape?.();
    },
    { enabled: enabled && !!onEscape }
  );

  // Delete
  useHotkeys(
    "delete, backspace",
    () => {
      if (!isInputFocused()) onDelete?.();
    },
    { enabled: enabled && !!onDelete }
  );

  // F2 — Rename
  useHotkeys(
    "f2",
    () => {
      if (!isInputFocused()) onRename?.();
    },
    { enabled: enabled && !!onRename }
  );
}
