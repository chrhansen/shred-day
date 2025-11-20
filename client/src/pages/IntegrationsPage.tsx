import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiGooglesheets } from "react-icons/si";
import { ExternalLink, Loader2, Plug, Radio, Unplug } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { googleSheetsIntegrationService, GoogleSheetIntegrationStatus } from "@/services/googleSheetsIntegrationService";
import { useToast } from "@/hooks/use-toast";

export default function IntegrationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<GoogleSheetIntegrationStatus>({
    queryKey: ["googleSheetIntegrationStatus"],
    queryFn: googleSheetsIntegrationService.getStatus,
  });

  const connectMutation = useMutation({
    mutationFn: googleSheetsIntegrationService.startConnect,
    onError: (error: Error) => {
      toast({
        title: "Could not start Google sign-in",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: googleSheetsIntegrationService.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["googleSheetIntegrationStatus"] });
      toast({ title: "Disconnected from Google Sheets" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disconnect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isConnected = status?.connected;
  const linkTarget = status?.sheet_url;
  const hasError = status?.last_error;
  const statusLabel = useMemo(() => {
    if (hasError) return "Needs attention";
    if (isConnected) return "Connected";
    return "Not connected";
  }, [hasError, isConnected]);

  const handleLaunchAuth = () => {
    connectMutation.mutate(undefined, {
      onSuccess: ({ url }) => {
        window.location.href = url;
      },
    });
  };

  const handleViewSheet = () => {
    if (linkTarget) window.open(linkTarget, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar centerContent="Integrations" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 rounded-lg bg-green-100">
              <SiGooglesheets className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Google Sheets
                <Badge variant={hasError ? "destructive" : isConnected ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
              </CardTitle>
              <CardDescription>Sync ski days into a spreadsheet—one tab per season.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {hasError}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              We create a Sheet in your Google Drive using the least-permission scope. Every day you add, edit, or delete
              will stay in sync automatically.
            </p>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : isConnected ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Radio className="h-4 w-4 fill-green-500 text-green-600" />
                    <span>Ski days sync to your sheet automatically.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span>Ready to connect to Google Sheets.</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {isConnected && linkTarget && (
                  <Button variant="outline" onClick={handleViewSheet} className="gap-2" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    View sheet
                  </Button>
                )}
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                    className="gap-2"
                  >
                    {disconnectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsDialogOpen(true)} disabled={connectMutation.isPending || isLoading} className="gap-2">
                    {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    Connect Google Sheets
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Google Sheets</DialogTitle>
            <DialogDescription>
              You’ll be redirected to Google to grant access to create and update one spreadsheet for your ski days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>We only request:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create and update a Sheet we manage for you.</li>
              <li>No access to any other files in your Drive.</li>
            </ul>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLaunchAuth} disabled={connectMutation.isPending} className="gap-2">
              {connectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue with Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
