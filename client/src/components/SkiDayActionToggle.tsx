import React from "react";
import { Merge, CopyPlus, XCircle, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type SkiDayAction = "merge" | "duplicate" | "skip";

interface SkiDayActionToggleProps {
  skiDayExists: boolean;
  selectedAction: SkiDayAction;
  onActionChange: (value: SkiDayAction) => void;
}

export function SkiDayActionToggle({
  skiDayExists,
  selectedAction,
  onActionChange
}: SkiDayActionToggleProps) {

  const getActionDisplay = (action: SkiDayAction) => {
    switch(action) {
      case "merge":
        return { text: "Merge Into Existing Day", icon: <Merge className="h-4 w-4" /> };
      case "duplicate":
        return { text: "Create Duplicate Day", icon: <CopyPlus className="h-4 w-4" /> };
      case "skip":
        return { text: "Skip Import", icon: <XCircle className="h-4 w-4" /> };
      default:
        // This case should ideally not be hit if selectedAction is correctly typed and initialized.
        console.error(`[SkiDayActionToggle] Unknown action type received in getActionDisplay: ${action}`);
        // Provide a safe fallback to prevent crash
        return { text: "Choose Action", icon: <ChevronDown className="h-4 w-4" /> };
    }
  };

  const currentAction = getActionDisplay(selectedAction);

  // Additional check before accessing .icon or .text
  if (!currentAction) {
      console.error("[SkiDayActionToggle] currentAction is undefined. selectedAction was:", selectedAction);
      // Render a fallback or null to prevent crash - though getActionDisplay now has a default
      return <div className="text-red-500 text-xs">Error: Invalid Action</div>;
  }

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2"
          >
            {currentAction.icon}
            <span className="mr-1">{currentAction.text}</span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-white">
          {skiDayExists && (
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onActionChange("merge")}
            >
              <Merge className="h-4 w-4" />
              <span>Merge Into Existing Day</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onActionChange("duplicate")}
          >
            <CopyPlus className="h-4 w-4" />
            <span>Create Duplicate Day</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onActionChange("skip")}
          >
            <XCircle className="h-4 w-4" />
            <span>Skip Import</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
