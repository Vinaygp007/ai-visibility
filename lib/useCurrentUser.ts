"use client";

import { useEffect, useState } from "react";

interface CurrentUserClient {
  role: "user" | "admin";
  fullName: string | null;
  email: string;
  creditBalance: number;
}

// Client-side "who am I" check via /api/me, shared by every component that
// needs to branch marketing vs. app content (nav, homepage CTAs). `checked`
// only flips once the request settles, so callers can hide auth-dependent
// content until then instead of flashing the logged-out state.
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUserClient | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  return { user, authed: !!user, checked };
}
