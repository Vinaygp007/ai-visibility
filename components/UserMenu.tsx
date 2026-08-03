"use client";

export default function UserMenu({ name }: { name: string }) {
  return (
    <span
      className="px-3 py-2 rounded-lg text-[14px] font-medium"
      style={{ color: "var(--text)" }}
    >
      {name}
    </span>
  );
}
