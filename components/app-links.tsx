"use client";

import { createContext, useContext } from "react";

/**
 * Where shared components link to, and whether they may offer actions.
 * The app uses the defaults; the /demo pages provide demo routes and
 * read-only mode, so the same cards and lists work in both.
 */
export interface AppLinks {
  profile: (username: string) => string;
  session: (id: string) => string;
  /** No kudos, comments, edits or follows (the database refuses them too) */
  readOnly: boolean;
  demo: boolean;
}

const appLinks: AppLinks = {
  profile: (username) => `/profile/${username}`,
  session: (id) => `/session/${id}`,
  readOnly: false,
  demo: false,
};

const demoLinks: AppLinks = {
  profile: (username) => `/demo/profile/${username}`,
  session: (id) => `/demo/session/${id}`,
  readOnly: true,
  demo: true,
};

const AppLinksContext = createContext<AppLinks>(appLinks);

export function DemoLinksProvider({ children }: { children: React.ReactNode }) {
  return <AppLinksContext.Provider value={demoLinks}>{children}</AppLinksContext.Provider>;
}

export function useAppLinks(): AppLinks {
  return useContext(AppLinksContext);
}
