import { redirect } from "next/navigation";

// Provider configuration moved under /admin (M4) — keep this URL alive as a
// redirect rather than a dead link for anyone with it bookmarked.
export default function SettingsRedirectPage() {
  redirect("/admin/providers");
}
