import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, Copy, Link, Link2Off } from "lucide-react";
import { format } from "date-fns";
import { skiService } from "@/services/skiService";

interface ShareDayDialogProps {
  dayId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stripDayPrefix = (id: string) => (id.startsWith('day_') ? id.slice(4) : id);

export function ShareDayDialog({ dayId, open, onOpenChange }: ShareDayDialogProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: day } = useQuery({
    queryKey: ['day', dayId],
    queryFn: () => skiService.getDay(dayId),
    enabled: open,
  });

  const shareUrl = useMemo(() => {
    const shortId = stripDayPrefix(dayId);
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/d/${shortId}`;
    }
    return `/d/${shortId}`;
  }, [dayId]);

  const { mutate: updateSharing } = useMutation({
    mutationFn: (shared: boolean) => shared ? skiService.createDayShare(dayId) : skiService.deleteDayShare(dayId),
    onSuccess: (updatedDay) => {
      queryClient.setQueryData(['day', dayId], updatedDay);
      queryClient.invalidateQueries({ queryKey: ['days'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update sharing');
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied', { description: 'Share link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy', { description: 'Please copy the link manually' });
    }
  };

  const handleToggleShare = (enabled: boolean) => {
    updateSharing(enabled);
    if (enabled) {
      toast.success('Sharing enabled', { description: 'Anyone with the link can now view this day' });
    } else {
      toast.success('Sharing disabled', { description: 'This day is now private' });
    }
  };

  const isShared = !!day?.shared_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 shrink-0" />
            <span className="truncate">
              Share {day?.resort?.name || "Ski day"}, {day?.date ? format(new Date(day.date.replace(/-/g, '/')), "MMM d, yyyy") : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="share-toggle" className="text-base font-medium">
                Public link
              </Label>
              <p className="text-sm text-muted-foreground">
                {isShared
                  ? "Anyone with the link can view this day"
                  : "Enable to create a shareable link"}
              </p>
            </div>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggleShare}
            />
          </div>

          {isShared && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border">
                <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate font-mono">{shareUrl}</span>
              </div>

              <Button
                onClick={handleCopy}
                className="w-full"
                variant="default"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          )}

          {!isShared && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Link2Off className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Turn on the toggle above to create a shareable link
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
