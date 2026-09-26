import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign-in failed · Virtuoso",
};

export default function AuthCodeErrorPage() {
  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-destructive" aria-hidden="true" />
              </div>
            </div>
            <CardTitle className="text-xl">We couldn&apos;t sign you in</CardTitle>
            <CardDescription className="mt-1">
              The sign-in link was missing, expired or already used. This can happen if you
              went back in the browser or waited too long on the Google screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href="/login">Try again</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
