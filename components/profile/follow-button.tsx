"use client";

import { Button } from "@/components/ui/button";
import { toggleFollow, acceptFollowRequest, rejectFollowRequest } from "@/lib/actions/profile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Check, X, UserPlus, Clock } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  followStatus: 'none' | 'pending' | 'accepted' | 'requested';
  disabled?: boolean;
}

export function FollowButton({ userId, followStatus, disabled }: FollowButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      await toggleFollow(userId);
      router.refresh();
    } catch (error) {
      console.error("Error toggling follow:", error);
      showToast("Failed to update follow status. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setIsLoading(true);
    try {
      await acceptFollowRequest(userId);
      showToast("Follow request accepted!", "success");
      router.refresh();
    } catch (error) {
      console.error("Error accepting request:", error);
      showToast("Failed to accept request. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    setIsLoading(true);
    try {
      await rejectFollowRequest(userId);
      showToast("Follow request rejected", "success");
      router.refresh();
    } catch (error) {
      console.error("Error rejecting request:", error);
      showToast("Failed to reject request. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // If they requested to follow you, show accept/reject buttons
  if (followStatus === 'requested') {
    return (
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleAcceptRequest}
          disabled={disabled || isLoading}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRejectRequest}
          disabled={disabled || isLoading}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Reject
        </Button>
      </div>
    );
  }

  // Regular follow button
  return (
    <Button
      variant={followStatus === 'accepted' ? "outline" : followStatus === 'pending' ? "outline" : "default"}
      onClick={handleFollow}
      disabled={disabled || isLoading}
      className="gap-2"
    >
      {isLoading ? (
        "Loading..."
      ) : followStatus === 'accepted' ? (
        "Following"
      ) : followStatus === 'pending' ? (
        <>
          <Clock className="w-4 h-4" />
          Requested
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </Button>
  );
}
