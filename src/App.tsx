import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PipProvider } from "@/contexts/PipContext";
import { NotificationProvider } from "@/components/NotificationCenter";
import { CollectionsProvider } from "@/components/CollectionsSystem";
import { OnboardingProvider } from "@/components/Onboarding";

// Layouts
import { AppShell } from "@/components/layout/AppShell";

// Pages
import LandingPage from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Favorites from "./pages/Favorites";
import DownloadHistoryPage from "./pages/DownloadHistoryPage";
import SavedFilesPage from "./pages/SavedFilesPage";
import ProfilePage from "./pages/ProfilePage";
import ToolsPage from "./pages/ToolsPage";
import ShareTargetPage from "./pages/ShareTargetPage";
import Install from "./pages/Install";
import SharedView from "./pages/SharedView";
import SharedLinksPage from "./pages/SharedLinksPage";
import StreamPage from "./pages/Stream";
import SettingsPage from "./pages/Settings";
import ExplorePage from "./pages/Explore";
import AdminPanel from "./pages/AdminPanel";
import NotFoundPage from "./pages/NotFoundPage";
import ServerErrorPage from "./pages/ServerErrorPage";
import SourcesPage from "./pages/Sources";
import DrivePage from "./pages/Drive";
import GoogleCallbackPage from "./pages/GoogleCallback";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Public only route (redirect if logged in)
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Landing route that shows landing for guests, dashboard for users
function LandingOrDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If logged in, redirect to dashboard (which uses AppShell with Outlet)
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise show public landing page
  return <LandingPage />;
}

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root route - Landing for guests, Dashboard for users */}
      <Route path="/" element={<LandingOrDashboard />} />

      {/* Auth routes - Public only */}
      <Route path="/auth" element={
        <PublicOnlyRoute>
          <Auth />
        </PublicOnlyRoute>
      } />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected App Routes */}
      <Route element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stream" element={<StreamPage />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/history" element={<DownloadHistoryPage />} />
        <Route path="/saved" element={<SavedFilesPage />} />
        <Route path="/shared" element={<SharedLinksPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/drive" element={<DrivePage />} />
      </Route>

      {/* OAuth Callbacks */}
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

      {/* Public Routes */}
      <Route path="/share-target" element={<ShareTargetPage />} />
      <Route path="/install" element={<Install />} />
      <Route path="/s/:code" element={<SharedView />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <PipProvider>
          <NotificationProvider>
            <CollectionsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <OnboardingProvider>
                    <AppRoutes />
                  </OnboardingProvider>
                </BrowserRouter>
              </TooltipProvider>
            </CollectionsProvider>
          </NotificationProvider>
        </PipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
