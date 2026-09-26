"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Music, Plus, User, LogOut, Settings, UserPlus, Clock, Edit3, Search } from "lucide-react";
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
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 font-bold text-lg shrink-0 group">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Music className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="tracking-tight">Virtuoso</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden lg:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200"
              >
                Feed
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all duration-200"
              >
                Leaderboard
              </Link>
            </div>
          )}

          <div className="flex-1" />

          {/* Right Side */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/search"
              aria-label="Search musicians"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </Link>

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
                      className="min-w-[200px] bg-white rounded-xl shadow-card-hover border border-border/50 p-1.5 z-50 animate-fade-in"
                      sideOffset={8}
                      align="end"
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/session/new"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                        >
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          Record Session
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/session/manual"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                          Manual Entry
                        </Link>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-full relative transition-all" suppressHydrationWarning>
                      <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                        <AvatarFallback>
                          {getAvatarInitials(user.display_name, user.username)}
                        </AvatarFallback>
                      </Avatar>
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                          {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[220px] bg-white rounded-xl shadow-card-hover border border-border/50 p-1.5 z-50 animate-fade-in"
                      sideOffset={8}
                      align="end"
                    >
                      <div className="px-3 py-3 border-b border-border/50 mb-1">
                        <p className="text-sm font-semibold">{user.display_name || user.username}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/profile/${user.username}`}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                        >
                          <User className="w-4 h-4 text-muted-foreground" />
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/requests"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                        >
                          <UserPlus className="w-4 h-4 text-muted-foreground" />
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
                          className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent rounded-lg outline-none transition-colors"
                        >
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          Settings
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="h-px bg-border/50 my-1" />

                      <DropdownMenu.Item asChild>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-red-50 rounded-lg outline-none w-full text-left text-red-600 transition-colors"
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
