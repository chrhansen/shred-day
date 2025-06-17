import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportConfirmationDialogsProps {
  isConfirmCommitOpen: boolean;
  setIsConfirmCommitOpen: (open: boolean) => void;
  commitSummary: { newDays: number; mergeDays: number; skippedDays: number };
  onConfirmCommit: () => void;
  isConfirmCancelOpen: boolean;
  setIsConfirmCancelOpen: (open: boolean) => void;
  onConfirmCancel: () => void;
}

export function ImportConfirmationDialogs({
  isConfirmCommitOpen,
  setIsConfirmCommitOpen,
  commitSummary,
  onConfirmCommit,
  isConfirmCancelOpen,
  setIsConfirmCancelOpen,
  onConfirmCancel,
}: ImportConfirmationDialogsProps) {
  return (
    <>
      {/* Commit Confirmation Dialog */}
      <AlertDialog open={isConfirmCommitOpen} onOpenChange={setIsConfirmCommitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Import</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to import the following ski days:</p>
              <ul className="list-disc pl-5 space-y-1">
                {commitSummary.newDays > 0 && (
                  <li>{commitSummary.newDays} new ski day{commitSummary.newDays !== 1 ? 's' : ''}</li>
                )}
                {commitSummary.mergeDays > 0 && (
                  <li>{commitSummary.mergeDays} day{commitSummary.mergeDays !== 1 ? 's' : ''} to merge with existing</li>
                )}
                {commitSummary.skippedDays > 0 && (
                  <li className="text-slate-500">{commitSummary.skippedDays} day{commitSummary.skippedDays !== 1 ? 's' : ''} will be skipped</li>
                )}
              </ul>
              <p className="pt-2">This action cannot be undone. Do you want to continue?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCommit}>Import Ski Days</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isConfirmCancelOpen} onOpenChange={setIsConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Import?</AlertDialogTitle>
            <AlertDialogDescription>
              You have draft ski days that haven't been imported yet. 
              If you cancel now, all draft days will be lost. 
              Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Working</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCancel} className="bg-red-600 hover:bg-red-700">
              Cancel Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}