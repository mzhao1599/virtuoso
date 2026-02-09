import { AppLayout } from "@/components/layout/app-layout";
import { PracticeTimer } from "@/components/sessions/practice-timer";
import { createSession } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import type { BreakEvent } from "@/src/types";

export default async function NewSessionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  async function handleSave(data: {
    duration_seconds: number;
    break_seconds: number;
    break_timeline: BreakEvent[];
    instrument: string;
    piece_name?: string;
    skills_practiced?: string;
    description?: string;
    focus?: "clear_goals" | "mid" | "noodling";
    entropy?: "few_measures" | "in_between" | "whole_piece";
    enjoyment?: "progress" | "ok" | "stuck";
  }) {
    "use server";
    
    const session = await createSession({
      ...data,
      piece_name: data.piece_name || null,
      skills_practiced: data.skills_practiced || null,
      description: data.description || null,
      focus: data.focus || null,
      entropy: data.entropy || null,
      enjoyment: data.enjoyment || null,
    });
    
    return { id: session.id };
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <PracticeTimer onSave={handleSave} />
      </div>
    </AppLayout>
  );
}
