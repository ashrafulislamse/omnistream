import { NavLink } from "@/components/NavLink";
import { Play } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/saved", label: "Saved Files" },
  { to: "/favorites", label: "Favorites" },
  { to: "/history", label: "History" },
];

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-border/60 bg-background/90 backdrop-blur-xl mt-auto dark:bg-card/50 dark:border-border/40">
      <div className="container py-8 px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Branding */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-primary fill-primary" />
            </div>
            <span className="text-sm font-bold text-gradient">OmniStream</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-5">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="!text-primary"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} OmniStream
          </p>
        </div>
      </div>
    </footer>
  );
}
