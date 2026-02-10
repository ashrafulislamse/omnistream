import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, account } from "@/lib/appwrite";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useToast } from "@/hooks/use-toast";

// ============ Types ============

export interface AppUser {
  id: string;
  email?: string;
  app_metadata: Record<string, any>;
  user_metadata: {
    display_name?: string;
    avatar_url?: string;
  };
  aud: string;
  role?: string;
  created_at: string;
}

export interface AppSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: AppUser;
}

interface AuthContextType {
  user: AppUser | null;
  session: AppSession | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Reset the inactivity timer (call on critical user actions) */
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inactivity timeout: 30 minutes
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const INACTIVITY_WARNING_SECONDS = 60;

// Helper: map Appwrite user to AppUser
function mapAppwriteUser(appwriteUser: any): AppUser {
  return {
    id: appwriteUser.$id,
    email: appwriteUser.email,
    app_metadata: {},
    user_metadata: {
      display_name: appwriteUser.name,
      avatar_url: appwriteUser.prefs?.avatar_url,
    },
    aud: 'authenticated',
    role: appwriteUser.prefs?.role || 'user',
    created_at: appwriteUser.$createdAt,
  };
}

// Helper: create session wrapper
function createSessionWrapper(user: AppUser): AppSession {
  return {
    access_token: 'appwrite-session',
    refresh_token: '',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showingWarning, setShowingWarning] = useState(false);
  const { toast } = useToast();

  const handleInactivityLogout = useCallback(async () => {
    setShowingWarning(false);
    try {
      await account.deleteSession('current');
    } catch {
      // Session may already be expired
    }
    setUser(null);
    setSession(null);
    toast({
      title: "Session expired",
      description: "You've been logged out due to inactivity.",
      variant: "destructive",
    });
  }, [toast]);

  const handleInactivityWarning = useCallback((secondsRemaining: number) => {
    if (!showingWarning && secondsRemaining === INACTIVITY_WARNING_SECONDS) {
      setShowingWarning(true);
      toast({
        title: "Session expiring soon",
        description: `You'll be logged out in ${secondsRemaining} seconds due to inactivity. Move your mouse or press a key to stay logged in.`,
        duration: 10000,
      });
    }
  }, [showingWarning, toast]);

  const { resetTimeout } = useInactivityTimeout({
    timeout: INACTIVITY_TIMEOUT,
    onTimeout: handleInactivityLogout,
    onWarning: handleInactivityWarning,
    warningSeconds: INACTIVITY_WARNING_SECONDS,
    enabled: !!user,
  });

  // Reset warning state when user becomes active
  useEffect(() => {
    if (showingWarning) {
      const timer = setTimeout(() => setShowingWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showingWarning]);

  // Check Appwrite session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const appwriteUser = await account.get();
        const mappedUser = mapAppwriteUser(appwriteUser);
        const mappedSession = createSessionWrapper(mappedUser);

        setUser(mappedUser);
        setSession(mappedSession);
        syncWithExtension(mappedSession);
      } catch {
        // No active session
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Sync authentication with the OmniStream browser extension
  const syncWithExtension = (session: AppSession | null) => {
    try {
      const ext = (window as any).__omniStreamExtension;

      if (ext?.isInstalled) {
        if (session?.access_token) {
          ext.setAuth(session.access_token, {
            id: session.user?.id,
            email: session.user?.email,
          });
          console.log('[OmniStream] Auth synced with extension');
        } else {
          ext.logout();
          console.log('[OmniStream] Logged out of extension');
        }
      }

      window.dispatchEvent(new CustomEvent('omnistream-auth', {
        detail: session ? {
          token: session.access_token,
          user: { id: session.user?.id, email: session.user?.email }
        } : null
      }));
    } catch (error) {
      // Extension not installed or error, ignore silently
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName || email },
      },
    });

    if (!error) {
      try {
        const appwriteUser = await account.get();
        const mappedUser = mapAppwriteUser(appwriteUser);
        const mappedSession = createSessionWrapper(mappedUser);
        setUser(mappedUser);
        setSession(mappedSession);
        syncWithExtension(mappedSession);
      } catch { /* ignore */ }
    }

    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      try {
        const appwriteUser = await account.get();
        const mappedUser = mapAppwriteUser(appwriteUser);
        const mappedSession = createSessionWrapper(mappedUser);
        setUser(mappedUser);
        setSession(mappedSession);
        syncWithExtension(mappedSession);
      } catch { /* ignore */ }
    }

    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    try {
      await account.deleteSession('current');
    } catch {
      // Session may already be expired
    }
    setUser(null);
    setSession(null);
    syncWithExtension(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetInactivityTimer: resetTimeout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
