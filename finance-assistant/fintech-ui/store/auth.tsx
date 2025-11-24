import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/api";
import { getProfile } from "@/lib/profile";

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

type Ctx = { 
  user: AuthUser | null; 
  setUser: (u: AuthUser | null) => void;
  isLoading: boolean;
};
const AuthCtx = createContext<Ctx>({ 
  user: null, 
  setUser: () => {},
  isLoading: true 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // DEV MODE: Initialize with mock user immediately if dev mode is enabled
  const devMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
  const [user, setUser] = useState<AuthUser | null>(
    devMode ? {
      id: 'dev-user-123',
      email: 'dev@example.com',
      name: 'Dev User',
      avatarUrl: null,
    } : null
  );
  const [isLoading, setIsLoading] = useState(!devMode); // Not loading if dev mode
  const [hasNetworkError, setHasNetworkError] = useState(false);

  useEffect(() => {
    const init = async () => {
      // DEV MODE: Skip auth entirely if EXPO_PUBLIC_DEV_MODE is set
      if (devMode) {
        console.log('🟡 DEV MODE: Bypassing authentication with mock user');
        return; // User already set in initial state
      }

      try {
        console.log('🔵 Starting auth initialization...');
        
        // Shorter timeout for faster failure on slow networks (3 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout - please check your connection')), 3000)
        );
        
        const authPromise = supabase.auth.getUser();
        
        const { data: { user } } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;
        
        console.log('✅ Auth check complete:', user ? 'User found' : 'No user');
        
        if (user) {
          // Fetch profile from database with shorter timeout (2 seconds)
          try {
            const profile = await Promise.race([
              getProfile(user.id),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
              )
            ]) as any;
            
            setUser({
              id: user.id,
              email: user.email,
              name: profile?.name ?? user.user_metadata?.name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            });
            console.log('✅ User profile loaded');
          } catch (profileError) {
            console.log('⚠️ Profile fetch failed, using auth metadata:', profileError);
            // Fall back to user metadata if profile fetch fails
            setUser({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
            });
          }
        }
        setHasNetworkError(false);
      } catch (error: any) {
        console.error('❌ Error initializing auth:', error?.message || error);
        // Check if it's a network error
        if (error?.message?.includes('timeout') || error?.message?.includes('network') || error?.message?.includes('fetch') || error?.message?.includes('Failed to fetch')) {
          console.warn('⚠️ Network error detected');
          setHasNetworkError(true);
        }
        // If auth check fails, assume no user and continue
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };
    init();

    // Skip Supabase auth subscription in dev mode
    if (devMode) {
      console.log('🟡 DEV MODE: Skipping Supabase auth subscription');
      return () => {}; // No cleanup needed
    }

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
  }, [devMode]);

  return <AuthCtx.Provider value={{ user, setUser, isLoading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
