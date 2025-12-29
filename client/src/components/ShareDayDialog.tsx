import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Copy, Link } from "lucide-react";
import { skiService } from "@/services/skiService";

interface ShareDayDialogProps {
  dayId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stripDayPrefix = (id: string) => id.startsWith('day_') ? id.slice(4) : id;

export function ShareDayDialog({ dayId, open, onOpenChange }: ShareDayDialogProps) {
  const queryClient = useQueryClient();

  const { data: day, isLoading } = useQuery({
    queryKey: ['day', dayId],
    queryFn: () => skiService.getDay(dayId),
    enabled: open,
  });

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const shortId = stripDayPrefix(dayId);
    return `${window.location.origin}/d/${shortId}`;
  }, [dayId]);

  const { mutate: updateSharing, isPending: isUpdating } = useMutation({
    mutationFn: (shared: boolean) => skiService.updateDaySharing(dayId, shared),
    onSuccess: (updatedDay) => {
      queryClient.setQueryData(['day', dayId], updatedDay);
      queryClient.invalidateQueries({ queryKey: ['days'] });
      toast.success(updatedDay.shared_at ? 'Sharing enabled' : 'Sharing disabled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update sharing');
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied');
    } catch (error) {
      toast.error('Unable to copy link');
    }
  };

  const isShared = !!day?.shared_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this day</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-link">Share link</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="share-link" readOnly value={shareUrl} className="pl-9" />
              </div>
              <Button type="button" variant="outline" onClick={handleCopy} disabled={!shareUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Public sharing</Label>
              <p className="text-sm text-muted-foreground">
                {isShared ? 'Anyone with the link can view this day.' : 'Turn on to create a public link.'}
              </p>
            </div>
            <Switch
              checked={isShared}
              onCheckedChange={(checked) => updateSharing(checked)}
              disabled={isLoading || isUpdating}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
