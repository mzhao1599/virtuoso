"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo-mark";
import { signOut } from "@/lib/actions/auth";
import { getAvatarInitials } from "@/lib/utils/avatar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/src/types";
import {
  Bell,
  Clock,
  Edit3,
  Home,
  LogOut,
  Plus,
  Search,
  Settings,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";

interface NavbarProps {
  user: Profile | null;
  pendingRequestsCount?: number;
  unreadCount?: number;
}

const menuItemClass =
  "flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer rounded-lg outline-none transition-colors data-[highlighted]:bg-accent";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brass text-ebony text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
      aria-hidden="true"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function LogPracticeMenu({ children, side = "bottom" }: { children: React.ReactNode; side?: "top" | "bottom" }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[210px] bg-white rounded-xl shadow-card-hover border border-border p-1.5 z-50 animate-fade-in"
          sideOffset={8}
          side={side}
          align="end"
        >
          <DropdownMenu.Item asChild>
            <Link href="/session/new" className={menuItemClass}>
              <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span>
                <span className="block font-medium">Start the timer</span>
                <span className="block text-xs text-muted-foreground">With 30-second capture</span>
              </span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/session/manual" className={menuItemClass}>
              <Edit3 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span>
                <span className="block font-medium">Add a past session</span>
                <span className="block text-xs text-muted-foreground">Enter time by hand</span>
              </span>
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Navbar({ user, pendingRequestsCount = 0, unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
  };

  const topLinks = [
    { href: "/dashboard", label: "Feed" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <>
      <nav aria-label="Main" className="sticky top-0 z-40 bg-white/85 backdrop-blur-md shadow-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <Link
              href={user ? "/dashboard" : "/"}
              className="flex items-center gap-2 shrink-0 text-primary"
              aria-label="Virtuoso home"
            >
              <LogoMark className="w-7 h-7" />
              <span className="font-serif text-2xl leading-none text-foreground">Virtuoso</span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center gap-1">
                {topLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                      isActive(pathname, link.href)
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                href="/search"
                aria-label="Search musicians"
                aria-current={isActive(pathname, "/search") ? "page" : undefined}
                className={cn(
                  "w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                  user ? "hidden md:flex" : "flex"
                )}
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </Link>

              {user ? (
                <>
                  <Link
                    href="/notifications"
                    prefetch={false}
                    aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                    className="relative hidden md:flex w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Bell className="w-4 h-4" aria-hidden="true" />
                    <Badge count={unreadCount} />
                  </Link>

                  <div className="hidden md:block">
                    <LogPracticeMenu>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        Log practice
                      </Button>
                    </LogPracticeMenu>
                  </div>

                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        className="rounded-full relative"
                        aria-label="Account menu"
                        suppressHydrationWarning
                      >
                        <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-primary/20 transition-shadow">
                          <AvatarImage src={user.avatar_url || undefined} alt="" />
                          <AvatarFallback>{getAvatarInitials(user.display_name, user.username)}</AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="min-w-[230px] bg-white rounded-xl shadow-card-hover border border-border p-1.5 z-50 animate-fade-in"
                        sideOffset={8}
                        align="end"
                      >
                        <div className="px-3 py-3 border-b border-border mb-1">
                          <p className="text-sm font-semibold">{user.display_name || user.username}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>

                        <DropdownMenu.Item asChild>
                          <Link href={`/profile/${user.username}`} className={menuItemClass}>
                            <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            Profile
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link href="/requests" className={menuItemClass}>
                            <UserPlus className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            Follow requests
                            {pendingRequestsCount > 0 && (
                              <span className="ml-auto bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                                {pendingRequestsCount}
                              </span>
                            )}
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link href="/leaderboard" className={menuItemClass}>
                            <Trophy className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            Leaderboard
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                          <Link href="/settings" className={menuItemClass}>
                            <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            Settings
                          </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className="h-px bg-border my-1" />

                        <DropdownMenu.Item asChild>
                          <button
                            onClick={handleSignOut}
                            className={cn(menuItemClass, "w-full text-left text-destructive data-[highlighted]:bg-destructive/10")}
                          >
                            <LogOut className="w-4 h-4" aria-hidden="true" />
                            Sign out
                          </button>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </>
              ) : (
                <>
                  <Link
                    href="/demo"
                    className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors"
                  >
                    Demo
                  </Link>
                  <Button asChild size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {user && (
        <MobileTabBar pathname={pathname} unreadCount={unreadCount} username={user.username} />
      )}
    </>
  );
}

/** Bottom navigation on small screens (the top links are hidden there). */
function MobileTabBar({
  pathname,
  unreadCount,
  username,
}: {
  pathname: string;
  unreadCount: number;
  username: string;
}) {
  const tab = (active: boolean) =>
    cn(
      "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[11px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <nav
      aria-label="Mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch h-16">
        <Link href="/dashboard" className={tab(isActive(pathname, "/dashboard"))} aria-current={isActive(pathname, "/dashboard") ? "page" : undefined}>
          <Home className="w-5 h-5" aria-hidden="true" />
          Feed
        </Link>
        <Link href="/search" className={tab(isActive(pathname, "/search"))} aria-current={isActive(pathname, "/search") ? "page" : undefined}>
          <Search className="w-5 h-5" aria-hidden="true" />
          Search
        </Link>
        <div className="flex-1 flex items-center justify-center">
          <LogPracticeMenu side="top">
            <button
              className="w-12 h-12 -mt-5 rounded-full bg-primary text-primary-foreground shadow-card-hover flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Log practice"
            >
              <Plus className="w-6 h-6" aria-hidden="true" />
            </button>
          </LogPracticeMenu>
        </div>
        <Link
          href="/notifications"
          prefetch={false}
          className={tab(isActive(pathname, "/notifications"))}
          aria-current={isActive(pathname, "/notifications") ? "page" : undefined}
          aria-label={unreadCount > 0 ? `Alerts, ${unreadCount} unread` : undefined}
        >
          <span className="relative">
            <Bell className="w-5 h-5" aria-hidden="true" />
            <Badge count={unreadCount} />
          </span>
          Alerts
        </Link>
        <Link
          href={`/profile/${username}`}
          className={tab(isActive(pathname, `/profile/${username}`))}
          aria-current={isActive(pathname, `/profile/${username}`) ? "page" : undefined}
        >
          <User className="w-5 h-5" aria-hidden="true" />
          You
        </Link>
      </div>
    </nav>
  );
}
