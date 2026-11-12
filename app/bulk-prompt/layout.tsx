import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Prompt Runner is open to every signed-in user.
export default async function BulkPromptLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <>{children}</>;
}
