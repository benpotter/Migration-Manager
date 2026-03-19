"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Comment } from "@/types";

interface CommentThreadProps {
  pageId: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CommentThread({ pageId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [pageId]);

  async function fetchComments() {
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      setComments(data);
    } catch {
      // Silently handle — comments are non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {getInitials(comment.user?.name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {comment.user?.name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(comment.created_at)}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {comment.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* New comment */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write a comment... (supports Markdown, use @ to mention)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handlePost}
            disabled={posting || !newComment.trim()}
          >
            {posting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
