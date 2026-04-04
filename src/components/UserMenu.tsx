import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LogOut, User, Volume2, VolumeX, Bell, BellOff, Sun, Moon, Trash2, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { prefs, toggleNotificationSound, toggleBrowserNotifications } = usePreferences();
  const { clearAll } = useWatchHistory();
  const { resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);

  const handleClearHistory = () => {
    clearAll();
    setShowClearHistoryDialog(false);
    toast({
      title: "Watch history cleared",
      description: "All saved positions and progress have been removed.",
    });
  };

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="border-primary/30 text-primary hover:bg-primary/10">
        Sign In
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 bg-primary/10 hover:bg-primary/20">
            <User className="w-4 h-4 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 glass-card border-border/50">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate("/profile")}
            className="cursor-pointer"
          >
            <UserCircle className="w-4 h-4 mr-2" />
            Your Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Appearance
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); setTheme(isDark ? "light" : "dark"); }}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Theme
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {isDark ? "DARK" : "LIGHT"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Notifications
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); toggleNotificationSound(); }}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {prefs.notificationSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Sound
            </span>
            <span className={`text-[10px] font-medium ${prefs.notificationSound ? "text-primary" : "text-muted-foreground"}`}>
              {prefs.notificationSound ? "ON" : "OFF"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); toggleBrowserNotifications(); }}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {prefs.browserNotifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              Browser Alerts
            </span>
            <span className={`text-[10px] font-medium ${prefs.browserNotifications ? "text-primary" : "text-muted-foreground"}`}>
              {prefs.browserNotifications ? "ON" : "OFF"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Data
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e) => { e.preventDefault(); setShowClearHistoryDialog(true); }}
            className="cursor-pointer text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Watch History
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear History Confirmation Dialog */}
      <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear watch history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all saved video positions, resume points, and watch progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
