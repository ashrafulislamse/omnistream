import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useToast } from "@/hooks/use-toast";

// ============ Demo Mode Configuration ============
const DEMO_MODE_ENABLED = true; // Set to false to disable demo mode
const DEMO_CREDENTIALS = {
  email: "demo@omnistream.app",
  password: "demo123",
  displayName: "Demo User",
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInDemo: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Reset the inactivity timer (call on critical user actions) */
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Inactivity timeout: 30 minutes
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const INACTIVITY_WARNING_SECONDS = 60;

// Demo user storage key
const DEMO_USER_KEY = "omnistream-demo-user";

// Create a mock user object for demo mode
function createDemoUser(): User {
  return {
    id: "demo-user-id-12345",
    email: DEMO_CREDENTIALS.email,
    app_metadata: {},
    user_metadata: { display_name: DEMO_CREDENTIALS.displayName },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

// Create a mock session for demo mode
function createDemoSession(user: User): Session {
  return {
    access_token: "demo-access-token",
    refresh_token: "demo-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  } as Session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showingWarning, setShowingWarning] = useState(false);
  const { toast } = useToast();

  const handleInactivityLogout = useCallback(async () => {
    setShowingWarning(false);
    if (isDemoMode) {
      // Demo mode logout
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      setSession(null);
      setIsDemoMode(false);
    } else {
      await supabase.auth.signOut();
    }
    toast({
      title: "Session expired",
      description: "You've been logged out due to inactivity.",
      variant: "destructive",
    });
  }, [toast, isDemoMode]);

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
    enabled: !!user, // Only active when logged in
  });

  // Reset warning state when user becomes active
  useEffect(() => {
    if (showingWarning) {
      const timer = setTimeout(() => setShowingWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showingWarning]);

  // Check for demo user in localStorage on mount
  useEffect(() => {
    const savedDemoUser = localStorage.getItem(DEMO_USER_KEY);
    if (savedDemoUser && DEMO_MODE_ENABLED) {
      try {
        const demoUser = JSON.parse(savedDemoUser);
        setUser(demoUser);
        setSession(createDemoSession(demoUser));
        setIsDemoMode(true);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }

    // Normal Supabase auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setIsDemoMode(false);

      // Sync auth state with browser extension if installed
      syncWithExtension(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Don't override if already in demo mode
      if (!localStorage.getItem(DEMO_USER_KEY)) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Sync auth state with browser extension if installed
        syncWithExtension(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync authentication with the OmniStream browser extension
  const syncWithExtension = (session: Session | null) => {
    try {
      // Check if extension is installed by looking for the global object
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

      // Also dispatch a custom event (backup method)
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
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    // Check for demo credentials
    if (DEMO_MODE_ENABLED &&
      email === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password) {
      return signInDemo();
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // Demo login function
  const signInDemo = async (): Promise<{ error: string | null }> => {
    if (!DEMO_MODE_ENABLED) {
      return { error: "Demo mode is disabled" };
    }

    const demoUser = createDemoUser();
    const demoSession = createDemoSession(demoUser);

    // Save to localStorage for persistence
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));

    setUser(demoUser);
    setSession(demoSession);
    setIsDemoMode(true);

    toast({
      title: "Demo Mode Active",
      description: "Welcome! You're using OmniStream in demo mode.",
    });

    return { error: null };
  };

  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      setSession(null);
      setIsDemoMode(false);
    } else {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isDemoMode,
      signUp,
      signIn,
      signInDemo,
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
