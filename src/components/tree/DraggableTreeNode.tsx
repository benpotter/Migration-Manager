"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageNode } from "@/types";

interface DraggableTreeNodeProps {
  node: PageNode;
  depth: number;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DraggableTreeNode({
  node,
  depth,
  children,
  disabled = false,
}: DraggableTreeNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: node.id,
    data: { node, depth },
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/drag",
        isDragging && "opacity-50 z-50",
        isOver && "bg-primary/5"
      )}
    >
      {/* Drop indicator */}
      {isOver && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
      )}

      <div className="flex items-center">
        {/* Drag handle */}
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 h-6 w-4 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-30 group-hover/drag:opacity-100 transition-opacity"
            style={{ marginLeft: `${depth * 20}px` }}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
