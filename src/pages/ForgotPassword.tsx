import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email("Invalid email address").max(255);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast({ title: "Error", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await account.createRecovery(result.data, `${window.location.origin}/reset-password`);
      setSubmitting(false);
      setSent(true);
    } catch (err: any) {
      setSubmitting(false);
      toast({ title: "Error", description: err.message || "Failed to send reset email", variant: "destructive" });
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
          <p className="text-muted-foreground">Reset your password</p>
        </div>

        {sent ? (
          <div className="glass-card p-8 text-center space-y-4 glow-border">
            <Mail className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a password reset link to <strong className="text-foreground">{email}</strong>. Click the link in the email to set a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5 glow-border">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12 bg-background/50 border-border/50"
                  required
                  maxLength={255}
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold animate-glow-pulse">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
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
