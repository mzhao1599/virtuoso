"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessionKudos } from "@/lib/actions/sessions";
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

  useEffect(() => {
    if (isOpen) {
      loadKudos();
    }
  }, [isOpen, sessionId]);

  const loadKudos = async () => {
    setIsLoading(true);
    try {
      const data = await getSessionKudos(sessionId);
      setUsers(data);
    } catch (error) {
      console.error("Error loading kudos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-lg shadow-lg w-full max-w-md max-h-[70vh] flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Kudos ({kudosCount})
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No kudos yet
              </p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={user.avatar_url || undefined}
                        alt={user.username}
                      />
                      <AvatarFallback>
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
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
