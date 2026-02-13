import { AppLayout } from "@/components/layout/app-layout";
import { ManualEntryForm } from "@/components/sessions/manual-entry-form";
import { createManualSession } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function ManualEntryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  async function handleSave(data: {
    duration_seconds: number;
    instrument: string;
    piece_name?: string;
    skills_practiced?: string;
    description?: string;
    focus?: "clear_goals" | "mid" | "noodling";
    entropy?: "few_measures" | "in_between" | "whole_piece";
    enjoyment?: "progress" | "ok" | "stuck";
    created_at?: string;
  }): Promise<{ id: string }> {
    "use server";
    
    const session = await createManualSession({
      ...data,
      piece_name: data.piece_name || null,
      skills_practiced: data.skills_practiced || null,
      description: data.description || null,
      focus: data.focus || null,
      entropy: data.entropy || null,
      enjoyment: data.enjoyment || null,
      created_at: data.created_at,
    });
    
    return { id: session.id };
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ManualEntryForm onSave={handleSave} />
      </div>
    </AppLayout>
  );
}
