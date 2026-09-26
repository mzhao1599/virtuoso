import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { FollowButton } from "@/components/profile/follow-button";
import { getCurrentUser } from "@/lib/actions/auth";
import { getNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";
import { formatTimeAgo } from "@/lib/utils";
import { getAvatarInitials } from "@/lib/utils/avatar";
import type { NotificationItem } from "@/src/types";
import { Bell, Heart, MessageCircle, UserCheck, UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifications · Virtuoso",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notifications = await getNotifications(50);
  // Mark read after fetching, so this view still highlights what was new.
  // AppLayout renders after this and so shows the cleared badge. The navbar
  // link has prefetch={false}, so this only runs when the page is opened.
  if (notifications.some((n) => !n.read_at)) {
    await markAllNotificationsRead();
  }
  const now = new Date();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Notifications</h1>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground">
                Kudos, comments and follows will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-2">
              <ul className="divide-y divide-border/60">
                {notifications.map((n) => (
                  <NotificationRow key={n.id} notification={n} now={now} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function NotificationRow({ notification: n, now }: { notification: NotificationItem; now: Date }) {
  const actorName = n.actor.display_name || n.actor.username;
  const sessionLabel = n.session
    ? n.session.piece_name
      ? `${n.session.piece_name}`
      : `${n.session.instrument} session`
    : "your session";

  let icon: React.ReactNode;
  let text: React.ReactNode;
  let href = `/profile/${n.actor.username}`;

  switch (n.type) {
    case "kudos":
      icon = <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />;
      text = <>gave kudos to <span className="font-medium">{sessionLabel}</span></>;
      if (n.session) href = `/session/${n.session.id}`;
      break;
    case "comment":
      icon = <MessageCircle className="w-3.5 h-3.5 text-primary" />;
      text = (
        <>
          commented on <span className="font-medium">{sessionLabel}</span>
          {n.comment && (
            <span className="block text-muted-foreground mt-0.5 line-clamp-2">“{n.comment.content}”</span>
          )}
        </>
      );
      if (n.session) href = `/session/${n.session.id}#comments`;
      break;
    case "follow":
      icon = <UserPlus className="w-3.5 h-3.5 text-emerald-600" />;
      text = <>started following you</>;
      break;
    case "follow_request":
      icon = <UserPlus className="w-3.5 h-3.5 text-amber-600" />;
      text = <>asked to follow you</>;
      break;
    case "follow_accepted":
      icon = <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
      text = <>accepted your follow request</>;
      break;
  }

  return (
    <li className={`relative flex items-start gap-3 p-3 rounded-xl ${n.read_at ? "" : "bg-primary/[0.04]"}`}>
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={n.actor.avatar_url || undefined} alt="" />
          <AvatarFallback className="text-xs">
            {getAvatarInitials(n.actor.display_name, n.actor.username)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card shadow-soft flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="flex-1 min-w-0 text-sm leading-snug">
        <Link href={href} className="hover:underline after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/40">
          <span className="font-semibold">{actorName}</span> {text}
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          <time dateTime={n.created_at}>{formatTimeAgo(n.created_at, now)}</time>
          {!n.read_at && <span className="sr-only"> · unread</span>}
        </p>
      </div>

      {n.type === "follow_request" && (
        <div className="relative z-10 shrink-0">
          <FollowButton userId={n.actor.id} followStatus="requested" />
        </div>
      )}
      {!n.read_at && (
        <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
      )}
    </li>
  );
}
