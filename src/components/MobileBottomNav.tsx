import { NavLink } from "@/components/NavLink";
import { Home, HardDrive, Heart, History, Share2 } from "lucide-react";
import { useLocation } from "react-router-dom";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/saved", icon: HardDrive, label: "Saved" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
  { to: "/shared", icon: Share2, label: "Shared" },
  { to: "/history", icon: History, label: "History" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/90 backdrop-blur-xl safe-area-bottom dark:bg-card/90 dark:border-border/40">
      <div className="flex items-center justify-around h-14 px-2">
        {items.map((item) => {
          const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px]"
              activeClassName="text-primary"
            >
              <item.icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
