import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isValid, getYear, subYears, subDays, setMonth, setDate, getDaysInMonth } from "date-fns";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast as sonnerToast } from "sonner";
import Navbar from "@/components/Navbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountService } from "@/services/accountService";
import { AccountDetails } from "@/types/ski";
import { useAuth } from "@/contexts/AuthContext";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(new Date(2000, i, 1), 'MMMM') }));

export default function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  const [availableDays, setAvailableDays] = useState<{value: number, label: string}[]>([]);

  const [derivedSeasonStartDate, setDerivedSeasonStartDate] = useState<Date | undefined>(undefined);

  const { data: accountDetails, isLoading: isLoadingAccount, error: accountError } = useQuery<AccountDetails, Error>({
    queryKey: ['accountDetails'],
    queryFn: accountService.getAccountDetails,
  });

  const { mutate: updateAccount, isPending: isSaving } = useMutation<AccountDetails, Error, { season_start_day: string }>({
    mutationFn: accountService.updateAccountDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accountDetails'] });
      if (data.season_start_day) {
        const [monthStr, dayStr] = data.season_start_day.split('-');
        const month = parseInt(monthStr, 10) - 1;
        const day = parseInt(dayStr, 10);
        setSelectedMonth(month);
        setSelectedDay(day);
      }
      sonnerToast.success("Season start date saved");
    },
    onError: (error) => {
      sonnerToast.error("Error saving changes", {
        description: error.message || "There was a problem saving your changes. Please try again.",
      });
    },
  });

  useEffect(() => {
    if (accountDetails?.season_start_day) {
      const [monthStr, dayStr] = accountDetails.season_start_day.split('-');
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);

      if (selectedMonth !== month || selectedDay !== day) {
        setSelectedMonth(month);
        setSelectedDay(day);
      }
    }
  }, [accountDetails]);

  useEffect(() => {
    if (selectedMonth !== undefined && selectedDay !== undefined) {
      const currentYear = getYear(new Date());
      const date = setDate(setMonth(new Date(currentYear, 0, 1), selectedMonth), selectedDay);
      if (isValid(date)) {
        setDerivedSeasonStartDate(date);
      }
    } else {
      setDerivedSeasonStartDate(undefined);
    }
  }, [selectedMonth, selectedDay]);

  useEffect(() => {
    if (selectedMonth !== undefined) {
      const currentYear = getYear(new Date());
      const daysInMonth = getDaysInMonth(new Date(currentYear, selectedMonth));
      setAvailableDays(Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: (i + 1).toString() })));
      if (selectedDay && selectedDay > daysInMonth) {
        setSelectedDay(undefined);
      }
    } else {
      setAvailableDays(Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: (i + 1).toString() })));
    }
  }, [selectedMonth]);

  const handleMonthChange = (monthValue: string) => {
    setSelectedMonth(parseInt(monthValue, 10));
  };

  const handleDayChange = (dayValue: string) => {
    setSelectedDay(parseInt(dayValue, 10));
  };

  const calculateSeasonRanges = () => {
    const baseDate = derivedSeasonStartDate || new Date(getYear(new Date()), 8, 1);
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    let currentSeasonStart = new Date(new Date().getFullYear(), month, day);
    if (currentSeasonStart > new Date()) {
      currentSeasonStart.setFullYear(currentSeasonStart.getFullYear() - 1);
    }
    const currentSeasonEnd = new Date(currentSeasonStart);
    currentSeasonEnd.setFullYear(currentSeasonEnd.getFullYear() + 1);
    currentSeasonEnd.setDate(currentSeasonEnd.getDate() - 1);

    const lastSeasonStart = subYears(currentSeasonStart, 1);
    const lastSeasonEnd = subDays(currentSeasonStart, 1);

    return {
      current: { start: currentSeasonStart, end: currentSeasonEnd },
      last: { start: lastSeasonStart, end: lastSeasonEnd },
    };
  };

  const seasonRanges = calculateSeasonRanges();

  const handleSaveChanges = async () => {
    if (selectedMonth === undefined || selectedDay === undefined) {
      sonnerToast.error("Please select a month and day for the season start.");
      return;
    }
    const formattedMonth = (selectedMonth + 1).toString().padStart(2, '0');
    const formattedDay = selectedDay.toString().padStart(2, '0');
    updateAccount({ season_start_day: `${formattedMonth}-${formattedDay}` });
  };

  const logOutButton = (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-slate-600 hover:text-red-600 hover:bg-red-50"
        onClick={() => {
            if (window.confirm("Are you sure you want to log out?")) {
              logout();
            }
        }}
        aria-label="Logout"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </>
  );

  if (isLoadingAccount) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Navbar centerContent="Account Settings" rightContent={logOutButton} />
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (accountError || !accountDetails) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar centerContent="Account Settings" rightContent={logOutButton} />
        <div className="max-w-md mx-auto space-y-8 pt-8 p-4 md:p-0 text-center">
            <p className="text-red-600">
              {accountError ? `Error loading account details: ${accountError.message}` : "Could not load account details."}
            </p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-white">
    <Navbar centerContent="Account Settings" rightContent={logOutButton} />

      <div className="max-w-md mx-auto space-y-8 pt-8 p-2 md:p-0">

        <div className="space-y-2">
            <Label>Email</Label>
            <div className="p-2 bg-gray-50 rounded-md border">
            {accountDetails.email}
            </div>
        </div>

        <div className="space-y-2">
            <Label>Sign Up Date</Label>
            <div className="p-2 bg-gray-50 rounded-md border">
            {format(new Date(accountDetails.created_at), "MMMM d, yyyy")}
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seasonStartMonth">Season Start Date</Label>
          <div className="flex gap-3">
          <Select value={selectedMonth !== undefined ? selectedMonth.toString() : ""} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[60%]" id="seasonStartMonth">
              <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
              {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
              ))}
              </SelectContent>
          </Select>
          <Select value={selectedDay !== undefined ? selectedDay.toString() : ""} onValueChange={handleDayChange}>
              <SelectTrigger className="w-[40%]" id="seasonStartDay">
              <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
              {availableDays.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
              ))}
              </SelectContent>
          </Select>
          </div>
          <p className="text-sm text-muted-foreground">
          This date (month and day) defines the start of your ski season each year. The default is September 1st, but you might prefer a different date, e.g. if you live in the southern hemisphere.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">Season Ranges</h3>
          <div className="space-y-1">
            <div className="text-sm">
                <span className="font-medium">This season:</span>{" "}
                {format(seasonRanges.current.start, "MMM d, yyyy")} to{" "}
                {format(seasonRanges.current.end, "MMM d, yyyy")},
            </div>
            <div className="text-sm">
                <span className="font-medium">Last season:</span>{" "}
                {format(seasonRanges.last.start, "MMM d, yyyy")} to{" "}
                {format(seasonRanges.last.end, "MMM d, yyyy")},
            </div>
            <div className="text-sm">
              ...and so on.
            </div>
          </div>
        </div>

        <Button
          onClick={handleSaveChanges}
          className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:shadow-lg"
          disabled={isSaving || selectedMonth === undefined || selectedDay === undefined}
        >
          {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>

      </div>
    </div>
  );
}
