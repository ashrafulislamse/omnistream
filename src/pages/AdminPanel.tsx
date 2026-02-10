import { useAdminRole } from "@/hooks/useAdminRole";
import { useAdminOverview, useAdminUsers, useAdminActivity, useAdminStorage, useAdminApiMonitor, useManageRole, useBanUser } from "@/hooks/useAdminStats";
import { useRedisStats, useServiceHealth } from "@/hooks/useRedisStats";
import { Navigate } from "react-router-dom";
import {
  Loader2, Users, Download, Heart, HardDrive, Share2, Database,
  Activity, Shield, Clock, AlertTriangle, Cloud, Radio, Key,
  CheckCircle, XCircle, AlertCircle, Eye, Zap, TrendingUp, Gauge,
  Ban, UserCheck, UserX, ShieldOff, Server, RefreshCw
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Tab = "overview" | "users" | "activity" | "storage" | "api-monitor" | "redis";

export default function AdminPanel() {
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [tab, setTab] = useState<Tab>("overview");

  if (roleLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Users", icon: Users },
    { id: "activity", label: "Activity", icon: Clock },
    { id: "storage", label: "Storage", icon: Cloud },
    { id: "api-monitor", label: "API Monitor", icon: Radio },
    { id: "redis", label: "Redis", icon: Server },
  ];

  return (
    <section className="container px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary/60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <p className="text-xs text-muted-foreground">Live · Auto-refreshing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1 w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "storage" && <StorageTab />}
        {tab === "api-monitor" && <ApiMonitorTab />}
        {tab === "redis" && <RedisTab />}
      </div>
    </section>
  );
}

/* ─── Shared Components ─── */

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const diff = value - start;
    const duration = 600;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prev.current = value;
  }, [value]);

  return <>{display}</>;
}

function StatCard({ icon: Icon, label, value, sub, color = "text-primary", trend }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string; trend?: { value: number; label: string };
}) {
  return (
    <div className="glass-card p-4 sm:p-5 space-y-2 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        {trend && trend.value > 0 && (
          <div className="flex items-center gap-0.5 text-primary">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[10px] font-semibold">+{trend.value}</span>
          </div>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab() {
  const { data, isLoading } = useAdminOverview();
  const { data: apiData } = useAdminApiMonitor();

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  const activeKeys = apiData?.activeCount ?? 0;
  const totalKeys = apiData?.configuredCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Users} label="Total Users" value={data?.totalUsers ?? 0}
          trend={{ value: data?.last7d?.newUsers ?? 0, label: "7d" }}
          sub={`${data?.last7d?.newUsers ?? 0} new this week`} />
        <StatCard icon={Download} label="Downloads" value={data?.totalDownloads ?? 0}
          trend={{ value: data?.last24h?.downloads ?? 0, label: "24h" }}
          sub={`${data?.last24h?.downloads ?? 0} today · ${data?.last7d?.downloads ?? 0} this week`} />
        <StatCard icon={Heart} label="Favorites" value={data?.totalFavorites ?? 0} color="text-destructive"
          trend={{ value: data?.last24h?.favorites ?? 0, label: "24h" }}
          sub={`${data?.last24h?.favorites ?? 0} today`} />
        <StatCard icon={HardDrive} label="API Fetches" value={data?.totalFetchedFiles ?? 0}
          trend={{ value: data?.last24h?.fetches ?? 0, label: "24h" }}
          sub={`${data?.last24h?.fetches ?? 0} today · ${data?.last7d?.fetches ?? 0} this week`} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Share2} label="Shared Links" value={data?.totalSharedLinks ?? 0} color="text-primary"
          sub={`${data?.last24h?.shares ?? 0} today`} />
        <StatCard icon={Eye} label="Share Views" value={data?.totalSharedViews ?? 0} color="text-primary" />
        <StatCard icon={Database} label="Cache Entries" value={data?.totalCachedEntries ?? 0} color="text-muted-foreground" />
        <StatCard icon={AlertTriangle} label="Rate Limits" value={data?.totalRateLimitHits ?? 0} color="text-destructive" />
      </div>

      {/* API Health Summary */}
      <div className={`glass-card p-4 ${activeKeys > 0 ? "border-primary/20 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
        <div className="flex items-center gap-3">
          {activeKeys > 0 ? (
            <CheckCircle className="w-5 h-5 text-primary shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${activeKeys > 0 ? "text-primary" : "text-destructive"}`}>
                {activeKeys > 0 ? "API Operational" : "API Keys Exhausted"}
              </p>
              <span className="text-xs text-muted-foreground">
                {activeKeys}/{totalKeys} keys active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeKeys > 0
                ? `Multi-key rotation is ${totalKeys > 1 ? "active" : "available"}. ${apiData?.usage?.last24h ?? 0} API calls in the last 24h.`
                : "All API keys have reached their quota. Add backup keys or top up your xAPIverse wallet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Users Tab ─── */

function UsersTab() {
  const { data: users, isLoading } = useAdminUsers();
  const { user: currentUser } = useAuth();
  const manageRole = useManageRole();
  const banUser = useBanUser();
  const [signupDisabled, setSignupDisabled] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "role" | "ban";
    action: string;
    targetUserId: string;
    targetName: string;
    role?: string;
  } | null>(null);

  // Load current signup setting
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "signup_disabled")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value === "true") setSignupDisabled(true);
      });
  }, []);

  const handleConfirm = () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === "ban") {
      banUser.mutate(
        { action: confirmDialog.action as "ban" | "unban", targetUserId: confirmDialog.targetUserId },
        {
          onSuccess: () => {
            toast.success(`${confirmDialog.action === "ban" ? "Banned" : "Unbanned"} ${confirmDialog.targetName}`);
            setConfirmDialog(null);
          },
          onError: (err) => { toast.error(err.message); },
        }
      );
    } else {
      manageRole.mutate(
        { action: confirmDialog.action as "assign" | "remove", targetUserId: confirmDialog.targetUserId, role: confirmDialog.role! },
        {
          onSuccess: () => {
            toast.success(`${confirmDialog.action === "assign" ? "Assigned" : "Removed"} ${confirmDialog.role} role for ${confirmDialog.targetName}`);
            setConfirmDialog(null);
          },
          onError: (err) => { toast.error(err.message); },
        }
      );
    }
  };

  const handleToggleSignup = async (disabled: boolean) => {
    setSignupLoading(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "signup_disabled", value: disabled ? "true" : "false", updated_at: new Date().toISOString() });

      if (error) throw error;

      setSignupDisabled(disabled);
      toast.success(disabled ? "New signups disabled" : "New signups enabled");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSignupLoading(false);
    }
  };

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  const allRoles = ["admin", "moderator", "user"] as const;
  const bannedCount = users?.filter((u: any) => u.banned).length ?? 0;

  return (
    <>
      {/* Summary + Signup Toggle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Users} label="Total" value={users?.length ?? 0} />
        <StatCard icon={Shield} label="Admins" value={users?.filter((u: any) => u.roles?.includes("admin")).length ?? 0} color="text-destructive" />
        <StatCard icon={Ban} label="Banned" value={bannedCount} color="text-destructive" />
        <StatCard icon={Download} label="Total Downloads" value={users?.reduce((s: number, u: any) => s + (u.downloads || 0), 0) ?? 0} />
      </div>

      {/* Signup toggle card */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldOff className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Disable New Signups</p>
            <p className="text-xs text-muted-foreground">Block new user registrations while keeping existing users active</p>
          </div>
        </div>
        <Switch
          checked={signupDisabled}
          onCheckedChange={handleToggleSignup}
          disabled={signupLoading}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="hidden sm:inline">Downloads</span>
                  <Download className="w-3.5 h-3.5 sm:hidden inline" />
                </th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  <span className="hidden md:inline">Favorites</span>
                  <Heart className="w-3.5 h-3.5 md:hidden inline" />
                </th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Fetches</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => {
                const userRoles: string[] = u.roles || [];
                const isSelf = u.id === currentUser?.id;
                const isBanned = u.banned;
                return (
                  <tr key={u.id} className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${isBanned ? "opacity-60" : ""}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {(u.display_name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-foreground truncate max-w-[160px]">
                          {u.display_name || "Unknown"}
                          {isSelf && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-destructive/15 text-destructive">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary/15 text-primary">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {userRoles.map((r: string) => (
                          <span key={r} className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            r === "admin" ? "bg-destructive/15 text-destructive" : r === "moderator" ? "bg-accent/15 text-accent-foreground" : "bg-primary/15 text-primary"
                          }`}>{r}</span>
                        ))}
                        {userRoles.length === 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-muted text-muted-foreground">user</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">{u.downloads}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{u.favorites}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground hidden md:table-cell">{u.fetches}</td>
                    <td className="p-3 text-right text-muted-foreground text-xs">{timeAgo(u.created_at)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Ban / Unban button */}
                        {!isSelf && (
                          <button
                            onClick={() => setConfirmDialog({
                              open: true,
                              type: "ban",
                              action: isBanned ? "unban" : "ban",
                              targetUserId: u.id,
                              targetName: u.display_name || "Unknown",
                            })}
                            className={`px-2 py-1 rounded text-[10px] font-semibold uppercase transition-all cursor-pointer ${
                              isBanned
                                ? "bg-primary/15 text-primary hover:bg-primary/25"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            }`}
                          >
                            {isBanned ? (
                              <span className="flex items-center gap-0.5"><UserCheck className="w-3 h-3" /> Unban</span>
                            ) : (
                              <span className="flex items-center gap-0.5"><Ban className="w-3 h-3" /> Ban</span>
                            )}
                          </button>
                        )}
                        {/* Role buttons */}
                        {allRoles.map((role) => {
                          const hasRole = userRoles.includes(role);
                          const isDisabled = isSelf && role === "admin" && hasRole;
                          return (
                            <button
                              key={role}
                              disabled={isDisabled}
                              onClick={() => setConfirmDialog({
                                open: true,
                                type: "role",
                                action: hasRole ? "remove" : "assign",
                                targetUserId: u.id,
                                targetName: u.display_name || "Unknown",
                                role,
                              })}
                              title={isDisabled ? "Cannot remove your own admin role" : `${hasRole ? "Remove" : "Assign"} ${role}`}
                              className={`px-2 py-1 rounded text-[10px] font-semibold uppercase transition-all ${
                                hasRole
                                  ? "bg-primary/15 text-primary hover:bg-destructive/15 hover:text-destructive"
                                  : "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary"
                              } ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              {hasRole ? "−" : "+"} {role}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "ban"
                ? (confirmDialog.action === "ban" ? "Ban User" : "Unban User")
                : (confirmDialog?.action === "assign" ? "Assign Role" : "Remove Role")}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "ban"
                ? (confirmDialog.action === "ban"
                  ? `Ban ${confirmDialog.targetName}? They will be immediately logged out and unable to sign in.`
                  : `Unban ${confirmDialog?.targetName}? They will be able to sign in again.`)
                : (confirmDialog?.action === "assign"
                  ? `Assign the "${confirmDialog?.role}" role to ${confirmDialog?.targetName}?`
                  : `Remove the "${confirmDialog?.role}" role from ${confirmDialog?.targetName}?`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              variant={confirmDialog?.action === "remove" || confirmDialog?.action === "ban" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={manageRole.isPending || banUser.isPending}
            >
              {(manageRole.isPending || banUser.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {confirmDialog?.type === "ban"
                ? (confirmDialog.action === "ban" ? "Ban" : "Unban")
                : (confirmDialog?.action === "assign" ? "Assign" : "Remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Activity Tab ─── */

function ActivityTab() {
  const { data, isLoading } = useAdminActivity();

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Download className="w-4 h-4 text-primary" /> Recent Downloads
      </h3>
      <div className="glass-card divide-y divide-border/30 max-h-[400px] overflow-y-auto">
        {data?.recentDownloads?.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">No recent downloads</div>
        )}
        {data?.recentDownloads?.map((d: any) => (
          <div key={d.id} className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/10 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {d.user?.avatar ? (
                <img src={d.user.avatar} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {(d.user?.name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.user?.name || "Unknown"} · {d.file_type} · {d.file_size || "unknown"}
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{timeAgo(d.created_at)}</span>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pt-2">
        <Zap className="w-4 h-4 text-primary" /> Recent API Fetches
      </h3>
      <div className="glass-card divide-y divide-border/30 max-h-[400px] overflow-y-auto">
        {data?.recentFetches?.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground text-center">No recent fetches</div>
        )}
        {data?.recentFetches?.map((f: any) => (
          <div key={f.id} className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/10 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              {f.user?.avatar ? (
                <img src={f.user.avatar} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {(f.user?.name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate font-mono text-xs">{f.source_url}</p>
                <p className="text-xs text-muted-foreground">{f.user?.name || "Unknown"} · {f.file_count} files</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{timeAgo(f.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Storage Tab ─── */

function StorageTab() {
  const { data, isLoading } = useAdminStorage();

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Cloud} label="Stored Thumbnails" value={data?.thumbnailCount ?? 0} />
        <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(data?.totalSizeBytes ?? 0)} />
      </div>

      <h3 className="text-sm font-semibold text-foreground">Recent Uploads</h3>
      <div className="glass-card divide-y divide-border/30 max-h-[400px] overflow-y-auto">
        {(!data?.recentFiles || data.recentFiles.length === 0) && (
          <div className="p-6 text-sm text-muted-foreground text-center">No thumbnails stored yet</div>
        )}
        {data?.recentFiles?.map((f: any) => (
          <div key={f.name} className="p-3 flex items-center justify-between gap-2 hover:bg-secondary/10 transition-colors">
            <div className="min-w-0">
              <p className="text-xs font-mono text-foreground truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(f.metadata?.size || 0)}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{formatDate(f.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── API Monitor Tab ─── */

function ApiMonitorTab() {
  const { data, isLoading } = useAdminApiMonitor();

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
    active: { icon: CheckCircle, label: "Active", color: "text-primary", bg: "bg-primary/10" },
    quota_exceeded: { icon: AlertTriangle, label: "Quota Exceeded", color: "text-destructive", bg: "bg-destructive/10" },
    error: { icon: XCircle, label: "Error", color: "text-destructive", bg: "bg-destructive/10" },
    unreachable: { icon: XCircle, label: "Unreachable", color: "text-destructive", bg: "bg-destructive/10" },
    not_configured: { icon: AlertCircle, label: "Not Set", color: "text-muted-foreground", bg: "bg-muted" },
    unknown: { icon: AlertCircle, label: "Unknown", color: "text-muted-foreground", bg: "bg-muted" },
  };

  return (
    <div className="space-y-4">
      {/* Usage Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Zap} label="Calls (1h)" value={data?.usage?.last1h ?? 0} color="text-primary" />
        <StatCard icon={Gauge} label="Calls (24h)" value={data?.usage?.last24h ?? 0} />
        <StatCard icon={Key} label="Active Keys" value={`${data?.activeCount ?? 0}/${data?.totalSlots ?? 0}`} color="text-primary" />
        <StatCard icon={Radio} label="Configured" value={`${data?.configuredCount ?? 0}/${data?.totalSlots ?? 0}`} />
      </div>

      {/* Key Status Cards */}
      <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.keys?.map((k: any) => {
          const st = statusConfig[k.status] || statusConfig.unknown;
          const StIcon = st.icon;

          // Parse credits like "97/100"
          let creditUsed = 0;
          let creditTotal = 0;
          let creditPct = 0;
          if (k.credits) {
            const parts = k.credits.split("/");
            creditUsed = parseInt(parts[0]) || 0;
            creditTotal = parseInt(parts[1]) || 100;
            creditPct = Math.round((creditUsed / creditTotal) * 100);
          }

          return (
            <div key={k.name} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${st.bg}`}>
                    <Key className={`w-4 h-4 ${st.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {k.label}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        k.type === "pro" ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-secondary-foreground"
                      }`}>{k.type}</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {k.configured ? "Configured" : "Not configured"}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${st.color}`}>
                  <StIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase">{st.label}</span>
                </div>
              </div>

              {/* Credits bar */}
              {k.credits && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Free credits</span>
                    <span className="font-mono font-medium text-foreground">{k.credits}</span>
                  </div>
                  <Progress value={creditPct} className="h-1.5" />
                </div>
              )}

              {/* Latency */}
              {k.latency != null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Response time</span>
                  <span className={`font-mono font-medium ${k.latency < 1000 ? "text-primary" : k.latency < 3000 ? "text-foreground" : "text-destructive"}`}>
                    {k.latency}ms
                  </span>
                </div>
              )}

              {!k.configured && (
                <p className="text-xs text-muted-foreground italic">
                  Add via Cloud secrets → {k.name}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="glass-card p-4 border-primary/20 bg-primary/5">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Multi-key rotation:</strong> When a key's quota is exhausted (402/429), the system automatically tries the next key. Exhausted keys cooldown for 30 minutes.
          <br />
          <strong className="text-foreground">Pricing:</strong> Standard API — $0.00004/req ($1 = 25K). Pro API — $0.0001/req ($1 = 10K) with HLS 4K + subtitles.
        </p>
      </div>
    </div>
  );
}

/* ─── Redis Monitoring Tab ─── */

function RedisTab() {
  const { data: redisStats, isLoading, error, refetch } = useRedisStats();
  const { data: health } = useServiceHealth();

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />;

  if (error) {
    return (
      <div className="glass-card p-6 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <div>
          <h3 className="font-semibold text-foreground">Redis Connection Error</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Failed to connect to Redis"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            redisStats?.connected ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Redis</p>
            <p className={`font-semibold ${redisStats?.connected ? "text-primary" : "text-destructive"}`}>
              {redisStats?.connected ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            health?.auth ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Auth Service</p>
            <p className={`font-semibold ${health?.auth ? "text-primary" : "text-destructive"}`}>
              {health?.auth ? "Healthy" : "Down"}
            </p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Streaming</p>
            <p className="font-semibold text-primary">Active</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Download</p>
            <p className="font-semibold text-primary">Active</p>
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" /> Rate Limits (Your Session)
          </h3>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Streaming Rate Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Streaming Requests
              </span>
              <span className="font-mono text-foreground">
                {redisStats?.rateLimits?.streaming?.current ?? 0} / {redisStats?.rateLimits?.streaming?.limit ?? 30}
              </span>
            </div>
            <Progress 
              value={(redisStats?.rateLimits?.streaming?.current ?? 0) / (redisStats?.rateLimits?.streaming?.limit ?? 30) * 100} 
              className="h-2"
            />
            <p className="text-[10px] text-muted-foreground">
              Resets in {formatSeconds(redisStats?.rateLimits?.streaming?.resetIn ?? 0)}
            </p>
          </div>

          {/* Download Rate Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" /> Download Requests
              </span>
              <span className="font-mono text-foreground">
                {redisStats?.rateLimits?.download?.current ?? 0} / {redisStats?.rateLimits?.download?.limit ?? 50}
              </span>
            </div>
            <Progress 
              value={(redisStats?.rateLimits?.download?.current ?? 0) / (redisStats?.rateLimits?.download?.limit ?? 50) * 100} 
              className="h-2"
            />
            <p className="text-[10px] text-muted-foreground">
              Resets in {formatSeconds(redisStats?.rateLimits?.download?.resetIn ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* API Slot Status */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" /> API Slot Cooldowns
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {redisStats?.apiSlots?.map((slot) => (
            <div key={slot.id} className={`flex items-center justify-between p-3 rounded-lg border ${
              slot.exhausted 
                ? "border-destructive/30 bg-destructive/5" 
                : "border-primary/20 bg-primary/5"
            }`}>
              <div className="flex items-center gap-2">
                {slot.exhausted ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-primary" />
                )}
                <span className="font-mono text-xs text-foreground">{slot.id}</span>
              </div>
              {slot.exhausted && slot.cooldownRemaining !== undefined && (
                <span className="text-[10px] text-destructive font-mono">
                  {formatSeconds(slot.cooldownRemaining)}
                </span>
              )}
              {!slot.exhausted && (
                <span className="text-[10px] text-primary">Ready</span>
              )}
            </div>
          )) || (
            <p className="text-sm text-muted-foreground col-span-full">
              No API slot data available
            </p>
          )}
        </div>
      </div>

      {/* Last Updated */}
      {redisStats?.lastUpdated && (
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(redisStats.lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
