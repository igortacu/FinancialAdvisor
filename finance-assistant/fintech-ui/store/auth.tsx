import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/api";
import { getProfile } from "@/lib/profile";

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

type Ctx = { user: AuthUser | null; setUser: (u: AuthUser | null) => void };
const AuthCtx = createContext<Ctx>({ user: null, setUser: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile from database
        const profile = await getProfile(user.id);
        
        setUser({
          id: user.id,
          email: user.email,
          name: profile?.name ?? user.user_metadata?.name ?? null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        });
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_ev, session) => {
      const u = session?.user;
      if (u) {
        // Fetch profile from database
        const profile = await getProfile(u.id);
        
        setUser({
          id: u.id,
          email: u.email,
          name: profile?.name ?? u.user_metadata?.name ?? null,
          avatarUrl: u.user_metadata?.avatar_url ?? null,
        });
      } else {
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={{ user, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
