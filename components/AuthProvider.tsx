"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type User } from "firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically import to avoid SSR issues and handle missing config gracefully
    let unsubscribe: (() => void) | undefined;

    import("@/lib/firebase-client").then(({ getFirebaseAuth }) => {
      const auth = getFirebaseAuth();
      if (!auth) {
        setLoading(false);
        return;
      }
      import("firebase/auth").then(({ onAuthStateChanged }) => {
        unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
        });
      });
    });

    return () => unsubscribe?.();
  }, []);

  const signOut = async () => {
    const { getFirebaseAuth } = await import("@/lib/firebase-client");
    const auth = getFirebaseAuth();
    if (auth) {
      const { signOut: fbSignOut } = await import("firebase/auth");
      await fbSignOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
