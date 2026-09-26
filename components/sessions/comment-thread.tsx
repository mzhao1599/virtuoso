"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { addComment, deleteComment, updateComment } from "@/lib/actions/sessions";
import { formatRelativeTime } from "@/lib/utils";
import { getAvatarInitials } from "@/lib/utils/avatar";
import type { SessionComment } from "@/src/types";

const MAX_LENGTH = 1000;

interface CommentThreadProps {
  sessionId: string;
  initialComments: SessionComment[];
  /** Signed-in viewer; null shows a sign-in prompt instead of the form */
  currentUserId: string | null;
  /** Demo mode: show comments, no form or actions */
  readOnly?: boolean;
  /** Where author links point (the demo has its own profile route) */
  profileHref?: (username: string) => string;
}

export function CommentThread({
  sessionId,
  initialComments,
  currentUserId,
  readOnly = false,
  profileHref = (username) => `/profile/${username}`,
}: CommentThreadProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formId = useId();
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SessionComment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canPost = !readOnly && !!currentUserId;

  const handlePost = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const comment = await addComment(sessionId, text);
      setComments((prev) => [...prev, comment]);
      setDraft("");
      router.refresh(); // update the comment count on the card
    } catch {
      showToast("Failed to add comment. Please try again.", "error");
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (comment: SessionComment) => {
    setEditingId(comment.id);
    setEditDraft(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    const text = editDraft.trim();
    if (!text || savingEdit) return;
    setSavingEdit(true);
    try {
      const updated = await updateComment(commentId, text);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch {
      showToast("Failed to save your edit. Please try again.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteComment(pendingDelete.id);
      setComments((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      setPendingDelete(null);
      router.refresh();
    } catch {
      showToast("Failed to delete comment. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section id="comments" aria-labelledby={`${formId}-heading`} className="scroll-mt-24">
      <h2 id={`${formId}-heading`} className="text-lg font-semibold tracking-tight mb-4">
        Comments{comments.length > 0 && <span className="text-muted-foreground font-normal"> · {comments.length}</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {readOnly ? "No comments on this session." : "No comments yet."}
        </p>
      ) : (
        <ol className="space-y-5">
          {comments.map((comment) => {
            const isAuthor = !readOnly && currentUserId === comment.user_id;
            const edited = comment.updated_at !== comment.created_at;
            return (
              <li key={comment.id} className="flex gap-3">
                <Link href={profileHref(comment.author.username)} className="shrink-0">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={comment.author.avatar_url || undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {getAvatarInitials(comment.author.display_name, comment.author.username)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link
                      href={profileHref(comment.author.username)}
                      className="font-medium text-sm hover:underline"
                    >
                      {comment.author.display_name || comment.author.username}
                    </Link>
                    <time dateTime={comment.created_at} className="text-xs text-muted-foreground">
                      {formatRelativeTime(comment.created_at)}
                    </time>
                    {edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <label htmlFor={`${formId}-edit-${comment.id}`} className="sr-only">
                        Edit comment
                      </label>
                      <textarea
                        id={`${formId}-edit-${comment.id}`}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingId(null);
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit(comment.id);
                        }}
                        maxLength={MAX_LENGTH}
                        rows={3}
                        autoFocus
                        className="input-base resize-y"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={savingEdit || !editDraft.trim()}
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={savingEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words text-foreground/85 leading-relaxed">
                      {comment.content}
                    </p>
                  )}

                  {isAuthor && editingId !== comment.id && (
                    <div className="flex gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(comment)}
                        className="text-xs font-medium text-muted-foreground hover:text-destructive rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canPost && (
        <form onSubmit={handlePost} className="mt-6 space-y-2">
          <label htmlFor={`${formId}-new`} className="sr-only">
            Write a comment
          </label>
          <textarea
            id={`${formId}-new`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(e);
            }}
            placeholder="Write a comment…"
            maxLength={MAX_LENGTH}
            rows={2}
            disabled={posting}
            className="input-base resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              {draft.length > MAX_LENGTH - 100 ? `${MAX_LENGTH - draft.length} characters left` : ""}
            </span>
            <Button type="submit" size="sm" disabled={posting || !draft.trim()}>
              {posting ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </form>
      )}

      {!readOnly && !currentUserId && (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this comment?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
