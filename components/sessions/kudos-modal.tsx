"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSessionKudos } from "@/lib/actions/sessions";
import { getAvatarInitials } from "@/lib/utils/avatar";
import type { Profile } from "@/src/types";

type KudoUser = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

interface KudosModalProps {
  sessionId: string;
  kudosCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function KudosModal({ sessionId, kudosCount, isOpen, onClose }: KudosModalProps) {
  const [users, setUsers] = useState<KudoUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadKudos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSessionKudos(sessionId);
      setUsers(data);
    } catch (error) {
      console.error("Error loading kudos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      loadKudos();
    }
  }, [isOpen, loadKudos]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-card-hover w-full max-w-md max-h-[70vh] flex flex-col z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <Dialog.Title className="text-lg font-semibold tracking-tight">
              Kudos ({kudosCount})
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground text-sm">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No kudos yet
              </p>
            ) : (
              <div className="space-y-1">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 transition-all"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.username}
                      />
                      <AvatarFallback>
                        {getAvatarInitials(user.display_name, user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
