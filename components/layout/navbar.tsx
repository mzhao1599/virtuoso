"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Music, Plus, User, LogOut, Settings, UserPlus, Clock, Edit3 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/src/types";
import { getAvatarInitials } from "@/lib/utils/avatar";

interface NavbarProps {
  user: Profile | null;
  pendingRequestsCount?: number;
}

export function Navbar({ user, pendingRequestsCount = 0 }: NavbarProps) {
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-xl shrink-0">
            <Music className="w-6 h-6 text-primary" />
            <span>Virtuoso</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden lg:flex items-center gap-6">
              <Link 
                href="/dashboard" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Feed
              </Link>
              <Link 
                href="/leaderboard" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Leaderboard
              </Link>
            </div>
          )}

          <div className="flex-1" />

          {/* Right Side */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <>
                {/* Log Practice Dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Log Practice</span>
                    </Button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[180px] bg-card rounded-md shadow-lg border p-1 z-50"
                      sideOffset={5}
                      align="end"
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/session/new"
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                        >
                          <Clock className="w-4 h-4" />
                          Record Session
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/session/manual"
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                        >
                          <Edit3 className="w-4 h-4" />
                          Manual Entry
                        </Link>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full relative" suppressHydrationWarning>
                      <Avatar className="w-9 h-9 cursor-pointer">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                        <AvatarFallback>
                          {getAvatarInitials(user.display_name, user.username)}
                        </AvatarFallback>
                      </Avatar>
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center border-2 border-background">
                          {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[200px] bg-card rounded-md shadow-lg border p-1 z-50"
                      sideOffset={5}
                      align="end"
                    >
                      <div className="px-3 py-2 border-b">
                        <p className="text-sm font-medium">{user.display_name || user.username}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/profile/${user.username}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/requests"
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                        >
                          <UserPlus className="w-4 h-4" />
                          Follow Requests
                          {pendingRequestsCount > 0 && (
                            <span className="ml-auto bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="h-px bg-border my-1" />

                      <DropdownMenu.Item asChild>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded outline-none w-full text-left text-destructive"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
