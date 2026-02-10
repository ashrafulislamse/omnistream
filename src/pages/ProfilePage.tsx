import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { StatsGridSkeleton } from "@/components/skeletons/StatsSkeleton";
import { usePreferences } from "@/hooks/usePreferences";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Download,
  Heart,
  Clock,
  TrendingUp,
  TrendingDown,
  Film,
  Calendar,
  Loader2,
  Save,
  Bell,
  Volume2,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading, refetch } = useUserStats();
  const { prefs, toggleNotificationSound, toggleBrowserNotifications } = usePreferences();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/profile");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      // Load profile data
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.display_name) {
            setDisplayName(data.display_name);
          }
        });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Your profile has been updated." });
    }
    setSaving(false);
  };

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (authLoading) {
    return (
      <div className="container px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 sm:py-8 max-w-4xl space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and view your activity
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Activity Overview</h2>
        {statsLoading ? (
          <StatsGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Downloads */}
            <div className="glass-card p-5 card-lift">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                {stats.downloadTrend !== 0 && (
                  <span className={`text-xs flex items-center gap-0.5 ${stats.downloadTrend > 0 ? "trend-up" : "trend-down"}`}>
                    {stats.downloadTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stats.downloadTrend)}%
                  </span>
                )}
              </div>
              <p className="stat-number mt-3 counter-animate">{stats.totalDownloads}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Downloads</p>
            </div>

            {/* Favorites */}
            <div className="glass-card p-5 card-lift">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <p className="stat-number mt-3 counter-animate">{stats.totalFavorites}</p>
              <p className="text-xs text-muted-foreground mt-1">Saved Favorites</p>
            </div>

            {/* Watch Time */}
            <div className="glass-card p-5 card-lift">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <p className="stat-number mt-3 counter-animate">{formatWatchTime(stats.totalWatchTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">Watch Time</p>
            </div>

            {/* Most Watched */}
            <div className="glass-card p-5 card-lift">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Film className="w-5 h-5 text-primary" />
              </div>
              <p className="stat-number mt-3 counter-animate capitalize">
                {stats.mostWatchedType || "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Most Watched</p>
            </div>
          </div>
        )}

        {/* Activity streak */}
        {stats.streamsThisWeek > 0 && (
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-foreground">
              You've downloaded <span className="font-semibold text-primary">{stats.streamsThisWeek}</span> files this week!
            </p>
          </div>
        )}
      </section>

      <Separator />

      {/* Profile Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>
        <div className="glass-card p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-secondary/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="input-glow"
              maxLength={100}
            />
          </div>

          {stats.joinedDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Member since {format(stats.joinedDate, "MMMM yyyy")}
            </div>
          )}

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="gap-2 btn-press"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </section>

      <Separator />

      {/* Preferences */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <Bell className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Browser Notifications</p>
                <p className="text-xs text-muted-foreground">Get alerts for downloads and updates</p>
              </div>
            </div>
            <Switch
              checked={prefs.browserNotifications}
              onCheckedChange={toggleBrowserNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Sound Effects</p>
                <p className="text-xs text-muted-foreground">Play sounds for notifications</p>
              </div>
            </div>
            <Switch
              checked={prefs.notificationSound}
              onCheckedChange={toggleNotificationSound}
            />
          </div>
        </div>
      </section>

      {/* Refresh Stats */}
      <div className="flex justify-center pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={statsLoading}
          className="text-xs text-muted-foreground gap-1.5"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>
    </div>
  );
}
