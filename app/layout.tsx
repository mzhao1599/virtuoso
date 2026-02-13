import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";

export const metadata: Metadata = {
  title: "Virtuoso - Strava for Musicians",
  description: "Track practice sessions, capture practice moments, and stay accountable with a community of fellow musicians",
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
