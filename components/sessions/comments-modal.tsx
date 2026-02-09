"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessionComments, addComment } from "@/lib/actions/sessions";
import { formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/src/types";

interface CommentWithAuthor {
  id: string;
  content: string;
  created_at: string;
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
}

interface CommentsModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsModal({ sessionId, isOpen, onClose }: CommentsModalProps) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, sessionId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getSessionComments(sessionId);
      setComments(data);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addComment(sessionId, newComment.trim());
      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      showToast("Failed to add comment. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Comments
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/profile/${comment.author.username}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={comment.author.avatar_url || undefined}
                        alt={comment.author.username}
                      />
                      <AvatarFallback>
                        {comment.author.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/profile/${comment.author.username}`}
                        className="font-semibold text-sm hover:underline"
                      >
                        {comment.author.display_name || comment.author.username}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Form */}
          <div className="p-6 border-t">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                maxLength={500}
              />
              <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
