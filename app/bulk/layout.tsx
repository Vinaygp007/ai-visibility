import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import FeatureVoteBoard from "@/components/FeatureVoteBoard";

// Bulk Scanner stays fully working for admins (children render as-is).
// Regular users visiting /bulk see the v2 feature vote in its place instead
// of the real tool — remove this gate once v2 ships the winning page to
// everyone.
export default async function BulkLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") return <FeatureVoteBoard context="bulk" />;

  return <>{children}</>;
}
