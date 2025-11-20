import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { googleSheetsIntegrationService } from "@/services/googleSheetsIntegrationService";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function GoogleSheetsCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const finishConnect = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (!code || !state) {
        setError("Missing code or state from Google.");
        return;
      }

      try {
        await googleSheetsIntegrationService.completeConnect(code, state);
        toast({ title: "Google Sheets connected" });
        navigate("/integrations", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to Google Sheets.");
      }
    };

    finishConnect();
  }, [searchParams, navigate, toast]);

  if (!error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-muted-foreground">Finishing Google connection…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-red-600">Connection failed</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => navigate("/integrations", { replace: true })}>Back to integrations</Button>
        <Button variant="outline" onClick={() => navigate("/", { replace: true })}>
          Home
        </Button>
      </div>
    </div>
  );
}
