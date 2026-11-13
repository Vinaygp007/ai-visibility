import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";

// Bulk Scanner stays admin-only for now. Regular users are sent to /scan
// (the v2 feature vote that used to show here is hidden).
export default async function BulkLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) redirect("/scan");

  return <>{children}</>;
}
