import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";

export const metadata: Metadata = {
  title: "Virtuoso - Strava for Musicians",
  description: "Track practice sessions, build streaks, and compete with fellow musicians",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
