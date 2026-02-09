"use client";

import { ToastProvider } from "@/components/ui/toast";
import { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
