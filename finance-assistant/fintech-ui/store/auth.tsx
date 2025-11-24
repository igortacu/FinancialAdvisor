import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  refreshSession: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>({ 
  user: null, 
  setUser: () => {},
  isLoading: true,
  refreshSession: async () => {} 
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

  // Helper function to set user from session (with optional profile fetch)
  const setUserFromSession = useCallback(async (authUser: any, skipProfileFetch = false) => {
    if (!authUser) {
      setUser(null);
      return;
    }
    
    // For OAuth/fast login, skip profile fetch and use metadata
    if (skipProfileFetch) {
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      });
      return;
    }
    
    try {
      const profile = await Promise.race([
        getProfile(authUser.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        )
      ]) as any;
      
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: profile?.name ?? authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      });
    } catch (profileError) {
      console.log('⚠️ Profile fetch failed, using auth metadata');
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
      });
    }
  }, []);

  // Function to manually refresh session - can be called after OAuth
  const refreshSession = useCallback(async () => {
    console.log('🔄 Manually refreshing session...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('✅ Session found during refresh:', session.user.email);
        await setUserFromSession(session.user);
      } else {
        console.log('⚠️ No session found during refresh');
      }
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
    }
  }, [setUserFromSession]);

  useEffect(() => {
    const init = async () => {
      // DEV MODE: Skip auth entirely if EXPO_PUBLIC_DEV_MODE is set
      if (devMode) {
        console.log('🟡 DEV MODE: Bypassing authentication with mock user');
        return; // User already set in initial state
      }

      try {
        console.log('🔵 Starting auth initialization...');
        
        // Handle Web OAuth callback directly here (not in _layout.tsx)
        // This ensures we process the tokens before checking session
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            console.log('🔐 Processing Web OAuth callback...');
            
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const error = params.get('error');
            const errorDescription = params.get('error_description');
            
            if (error) {
              console.error('❌ OAuth error:', error, errorDescription);
              window.history.replaceState(null, '', window.location.pathname);
            } else if (accessToken && refreshToken) {
              try {
                // Set the session with the tokens - use short timeout
                const sessionPromise = supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                const { data, error: sessionError } = await Promise.race([
                  sessionPromise,
                  new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Session timeout')), 3000)
                  )
                ]);
                
                if (sessionError) {
                  console.error('❌ Error setting session from OAuth:', sessionError);
                } else if (data.session) {
                  console.log('✅ OAuth session established:', data.session.user.email);
                  // Set user immediately from metadata (skip slow profile fetch)
                  await setUserFromSession(data.session.user, true);
                  setHasNetworkError(false);
                  setIsLoading(false);
                  window.history.replaceState(null, '', window.location.pathname);
                  return; // Exit early - OAuth complete
                }
              } catch (err) {
                console.error('❌ OAuth callback error:', err);
              }
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        }
        
        // Use getSession - faster than getUser
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 4000)
        );
        
        const authPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;
        
        const authUser = session?.user;
        console.log('✅ Auth check complete:', authUser ? 'User found' : 'No user');
        
        if (authUser) {
          await setUserFromSession(authUser);
          console.log('✅ User profile loaded');
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
      console.log('🔔 Auth state changed:', _ev, session?.user?.email ?? 'no user');
      await setUserFromSession(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [devMode, setUserFromSession]);

  return <AuthCtx.Provider value={{ user, setUser, isLoading, refreshSession }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
