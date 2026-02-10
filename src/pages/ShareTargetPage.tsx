import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeraBox } from "@/hooks/useTeraBox";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

/**
 * Share Target Handler - Receives URLs from mobile share menu
 * This page is loaded when users share a TeraBox link TO OmniStream
 */
export default function ShareTargetPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, fetchFile, loading: fetching, error: fetchError } = useTeraBox();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasStartedFetch, setHasStartedFetch] = useState(false);

  // Get shared data from URL params
  const sharedUrl = searchParams.get("url") || searchParams.get("text") || "";

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Store intent and redirect to auth
      sessionStorage.setItem("share_target_url", sharedUrl);
      navigate(`/auth?redirect=/share-target?url=${encodeURIComponent(sharedUrl)}`);
      return;
    }

    if (!sharedUrl) {
      setStatus("error");
      setErrorMessage("No URL received from share");
      return;
    }

    // Extract TeraBox URL from shared text
    const teraboxUrlMatch = sharedUrl.match(
      /https?:\/\/(?:www\.)?(?:terabox\.com|1024terabox\.com|teraboxapp\.com|1024tera\.com)[^\s]*/i
    );

    if (!teraboxUrlMatch) {
      setStatus("error");
      setErrorMessage("No valid TeraBox link found in shared content");
      return;
    }

    if (!hasStartedFetch) {
      setHasStartedFetch(true);
      fetchFile(teraboxUrlMatch[0]);
    }
  }, [user, authLoading, sharedUrl, hasStartedFetch, fetchFile, navigate]);

  // Watch for fetch results
  useEffect(() => {
    if (!hasStartedFetch) return;

    if (fetching) {
      setStatus("processing");
      return;
    }

    if (fetchError) {
      setStatus("error");
      setErrorMessage(fetchError);
      return;
    }

    if (data && data.list && data.list.length > 0) {
      setStatus("success");
      toast({
        title: "Link added!",
        description: `Found ${data.list.length} file${data.list.length > 1 ? "s" : ""}`,
      });

      // Redirect to home with the results after a brief delay
      setTimeout(() => {
        navigate(`/?url=${encodeURIComponent(sharedUrl)}`);
      }, 1500);
    } else if (data && (!data.list || data.list.length === 0)) {
      setStatus("error");
      setErrorMessage("No files found in this link");
    }
  }, [data, fetching, fetchError, hasStartedFetch, sharedUrl, toast, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
        {status === "processing" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Processing Link</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Fetching files from your shared TeraBox link...
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Link Added!</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting to your files...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Couldn't Process Link</h1>
              <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/")}>
                Go Home
              </Button>
              <Button onClick={() => window.close()}>
                Close
              </Button>
            </div>
          </>
        )}

        {sharedUrl && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground truncate">
              Shared: {sharedUrl.substring(0, 60)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
