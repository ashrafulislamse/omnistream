import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { UserMenu } from "@/components/UserMenu";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Footer } from "@/components/Footer";
import { PipIndicator } from "@/components/PipIndicator";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Home, HardDrive, Heart, History, Share2, Shield, Puzzle } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import logo from "@/assets/logo.png";

const baseNavItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/saved", icon: HardDrive, label: "Saved Files" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
  { to: "/shared", icon: Share2, label: "Shared" },
  { to: "/history", icon: History, label: "History" },
  { to: "/tools", icon: Puzzle, label: "Tools" },
];

export function AppLayout() {
  const { user, loading } = useAuth();
  const { isAdmin } = useAdminRole();
  const scrollProgress = useScrollProgress(150);

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Admin" }] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.06] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-primary/[0.02] dark:bg-primary/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header
          className="border-b border-border/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 dark:border-border/40"
          style={{
            backgroundColor: `hsl(var(--background) / ${0.85 + scrollProgress * 0.14})`,
            boxShadow: scrollProgress > 0.05
              ? `0 ${4 + scrollProgress * 12}px ${12 + scrollProgress * 24}px -4px hsl(var(--primary) / ${scrollProgress * 0.1}), 0 1px 2px 0 rgb(0 0 0 / ${scrollProgress * 0.15})`
              : 'none',
            backdropFilter: `blur(${16 + scrollProgress * 8}px) saturate(1.2)`,
          }}
        >
          <div className="container flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <NavLink to="/" className="flex items-center">
                <img src={logo} alt="OmniStream" className="h-8 w-auto dark:brightness-125" />
              </NavLink>

              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    activeClassName="!text-primary bg-primary/10"
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            <UserMenu />
          </div>
        </header>

        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>

        <Footer />
        <MobileBottomNav />
        <PipIndicator />
      </div>
    </div>
  );
}
