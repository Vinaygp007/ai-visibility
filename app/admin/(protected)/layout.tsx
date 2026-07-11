import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/admin/login");
  }

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/invites", label: "Invites" },
    { href: "/admin/waitlist", label: "Waitlist" },
    { href: "/admin/providers", label: "Providers" },
  ];

  return (
    <div className="min-h-screen md:pl-64" style={{ background: "#0a0b10" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-16 md:pt-12 pb-12">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Admin</h1>
            <p className="text-sm" style={{ color: "#8b8d9e" }}>Signed in as {user.email}</p>
          </div>
          <nav className="flex gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#f0f0f5" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}
