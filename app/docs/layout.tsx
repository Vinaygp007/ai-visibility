// app/docs/layout.tsx
// This layout intentionally does NOT import globals.css
// so Tailwind base styles don't conflict with Swagger UI rendering.

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}