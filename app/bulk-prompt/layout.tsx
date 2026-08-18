import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import FeatureVoteBoard from "@/components/FeatureVoteBoard";

// Prompt Runner stays fully working for admins (children render as-is).
// Regular users visiting /bulk-prompt see the v2 feature vote in its place
// instead of the real tool — remove this gate once v2 ships the winning
// page to everyone.
export default async function BulkPromptLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") return <FeatureVoteBoard context="prompt" />;

  return <>{children}</>;
}
