import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128);

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Appwrite sends userId and secret as query params
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");
    if (userId && secret) {
      setReady(true);
    }
    // Also check for hash-based recovery (legacy)
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      toast({ title: "Error", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Appwrite password recovery uses userId/secret from URL
      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");

      if (userId && secret) {
        await account.updateRecovery(userId, secret, password);
      } else {
        // Fallback: update password for already-authenticated user
        await account.updatePassword(password);
      }
      setSubmitting(false);
      toast({ title: "Success", description: "Password updated successfully!" });
      navigate("/");
    } catch (err: any) {
      setSubmitting(false);
      toast({ title: "Error", description: err.message || "Failed to update password", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-primary fill-primary" />
            </div>
            <span className="text-2xl font-bold text-gradient">OmniStream</span>
          </div>
          <p className="text-muted-foreground">Set your new password</p>
        </div>

        {!ready ? (
          <div className="glass-card p-8 text-center space-y-4 glow-border">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Verifying reset link…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5 glow-border">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pl-10 h-12 bg-background/50 border-border/50"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="pl-10 h-12 bg-background/50 border-border/50"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold animate-glow-pulse">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
            </Button>
          </form>
        )}

        <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto mt-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </button>
      </div>
    </div>
  );
}
