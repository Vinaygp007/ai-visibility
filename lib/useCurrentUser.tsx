"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface CurrentUserClient {
  role: "user" | "admin";
  fullName: string | null;
  email: string;
  creditBalance: number;
}

const CurrentUserContext = createContext<{ user: CurrentUserClient | null } | undefined>(undefined);

// Wraps the app once near the root (see app/layout.tsx) with auth already
// resolved server-side from the session cookie, so every useCurrentUser()
// consumer has the answer on first render instead of flashing a logged-out
// state while an /api/me round trip is in flight.
export function CurrentUserProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUserClient | null;
  children: React.ReactNode;
}) {
  return <CurrentUserContext.Provider value={{ user: initialUser }}>{children}</CurrentUserContext.Provider>;
}

// Shared by every component that needs to branch marketing vs. app content
// (nav, homepage CTAs). Reads the server-resolved value from
// CurrentUserProvider when available; falls back to an /api/me fetch for any
// tree rendered outside the provider. `checked` only flips once settled, so
// callers can hide auth-dependent content until then instead of flashing
// the wrong state.
export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  const [fallbackUser, setFallbackUser] = useState<CurrentUserClient | null>(null);
  const [fallbackChecked, setFallbackChecked] = useState(false);

  useEffect(() => {
    if (ctx) return;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setFallbackUser(data))
      .catch(() => {})
      .finally(() => setFallbackChecked(true));
  }, [ctx]);

  if (ctx) return { user: ctx.user, authed: !!ctx.user, checked: true };
  return { user: fallbackUser, authed: !!fallbackUser, checked: fallbackChecked };
}
