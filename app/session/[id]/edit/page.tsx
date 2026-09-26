import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { getSession } from "@/lib/actions/sessions";
import { getCurrentUser } from "@/lib/actions/auth";
import { EditSessionForm } from "@/components/sessions/edit-session-form";

interface EditSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSessionPage({ params }: EditSessionPageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const session = await getSession(id);

  if (!session || session.user_id !== user.id) {
    redirect("/dashboard");
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EditSessionForm session={session} />
      </div>
    </AppLayout>
  );
}
