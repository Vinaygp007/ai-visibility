import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import BetaBadge from "@/components/BetaBadge";

export default function AuthLayout({
  children,
  image,
}: {
  children: React.ReactNode;
  image: { src: string; position?: string };
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2" style={{ background: "var(--bg)" }}>
      {/* Form column */}
      <div className="flex flex-col min-h-screen lg:min-h-0">
        <div className="flex items-center justify-between px-6 sm:px-10 py-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-mark.webp" alt="AiScope" className="w-7 h-7 flex-shrink-0" />
            <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">AiScope</span>
            <BetaBadge />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-16 pt-4">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Brand column — plain photographic backdrop, no overlaid copy */}
      <div
        className="hidden lg:block border-l"
        style={{
          borderColor: "rgba(var(--overlay-rgb),0.08)",
          backgroundImage: `url(${image.src})`,
          backgroundSize: "cover",
          backgroundPosition: image.position ?? "center",
        }}
      />
    </div>
  );
}
