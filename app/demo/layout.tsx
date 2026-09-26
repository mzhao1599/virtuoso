import type { Metadata } from "next";
import { DemoLinksProvider } from "@/components/app-links";
import { DemoHeader } from "@/components/demo/demo-header";

export const metadata: Metadata = {
  title: "Demo · Virtuoso",
  description: "A read-only tour of Virtuoso with fictional musicians: feed, profiles, sessions and leaderboard.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoLinksProvider>
      <div className="min-h-screen flex flex-col">
        <DemoHeader />
        <main className="flex-1">{children}</main>
      </div>
    </DemoLinksProvider>
  );
}
