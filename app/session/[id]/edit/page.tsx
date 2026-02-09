import { redirect } from "next/navigation";
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
    redirect("/");
  }

  const session = await getSession(id);
  
  if (!session) {
    redirect("/dashboard");
  }

  if (session.user_id !== user.id) {
    redirect("/dashboard");
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <EditSessionForm session={session} />
    </div>
  );
}
