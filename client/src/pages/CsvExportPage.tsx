import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Download, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ColumnSelector, ColumnConfig } from "@/components/ColumnSelector";
import { useQuery } from '@tanstack/react-query';
import { csvExportService, SeasonData } from '@/services/csvExportService';
import { useAuth } from '@/contexts/AuthContext';
import { getSeasonDisplayName, getFormattedSeasonDateRange } from '@/utils/seasonFormatters';

export default function ExportPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: exportPageData, isLoading: isLoadingPageData, error: pageDataError } = useQuery({
    queryKey: ['csvExportPageData'],
    queryFn: csvExportService.getExportPageData,
  });

  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  const seasonStartDay = user?.season_start_day || '09-01';

  useEffect(() => {
    if (exportPageData) {
      setColumns(exportPageData.columns.map(col => ({ ...col, enabled: col.enabled !== undefined ? col.enabled : true })));
      setSeasons(exportPageData.seasons);
    }
  }, [exportPageData]);

  const handleSeasonToggle = (seasonId: string) => {
    setSelectedSeasons(prev =>
      prev.includes(seasonId)
        ? prev.filter(id => id !== seasonId)
        : [...prev, seasonId]
    );
  };

  const handleExport = async () => {
    const enabledColumns = columns.filter(col => col.enabled);

    if (selectedSeasons.length === 0) {
      toast({
        title: "No seasons selected",
        description: "Please select at least one season to export.",
        variant: "destructive",
      });
      return;
    }

    if (enabledColumns.length === 0) {
      toast({
        title: "No columns selected",
        description: "Please select at least one column to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const blob = await csvExportService.downloadCsvFile(selectedSeasons, enabledColumns);

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ski-days-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${selectedSeasons.length === 1 ? '1 season' : `${selectedSeasons.length} seasons`} with ${enabledColumns.length === 1 ? '1 column' : `${enabledColumns.length} columns`} to CSV file.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalSelectedDays = selectedSeasons.reduce((total, seasonId) => {
    const season = seasons.find(s => s.id === seasonId);
    return total + (season?.day_count || 0);
  }, 0);

  const enabledColumnsCount = columns.filter(col => col.enabled).length;

  if (isLoadingPageData) {
    return (
      <div className="min-h-screen bg-white p-4 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
        <p className="text-lg text-slate-700">Loading export options...</p>
      </div>
    );
  }

  if (pageDataError) {
    return (
      <div className="min-h-screen bg-white p-4 flex flex-col items-center justify-center">
        <p className="text-lg text-red-600">Error loading data: {pageDataError.message}</p>
        <Button onClick={() => navigate("/")} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-md mx-auto space-y-4 pt-4">
        <div className="relative flex justify-center items-center mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            Cancel
          </Button>
          <h1 className="text-xl font-bold">Export Days to CSV</h1>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select the seasons you want to include in your CSV export:
          </p>

          {seasons.map((season) => {
            const seasonOffset = parseInt(season.id, 10);
            const displayLabel = getSeasonDisplayName(seasonOffset);
            const displayDateRange = getFormattedSeasonDateRange(seasonOffset, seasonStartDay);

            return (
              <Card key={season.id} className="cursor-pointer transition-colors hover:bg-gray-50" data-testid={`season-item-${season.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={season.id}
                      checked={selectedSeasons.includes(season.id)}
                      onCheckedChange={() => handleSeasonToggle(season.id)}
                      data-testid={`season-checkbox-${season.id}`}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={season.id}
                        className="text-sm font-medium cursor-pointer"
                        data-testid={`season-label-${season.id}`}
                      >
                        {displayLabel}
                      </label>
                      <div className="text-xs text-muted-foreground" data-testid={`season-daterange-${season.id}`}>
                        {displayDateRange}
                      </div>
                      <div className="text-xs text-blue-600 font-medium" data-testid={`season-day-count-${season.id}`}>
                        {season.day_count} ski day{season.day_count === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {selectedSeasons.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-blue-800">
                  Selected: {selectedSeasons.length === 1 ? '1 season' : `${selectedSeasons.length} seasons`}, {totalSelectedDays === 1 ? '1 total day' : `${totalSelectedDays} total days`}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="border rounded-md">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors duration-150 focus:outline-none"
            onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
            aria-expanded={isColumnSelectorOpen}
            aria-controls="column-selector-content"
          >
            <h3 className="text-md font-medium">Customize Columns ({enabledColumnsCount} selected)</h3>
            {isColumnSelectorOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {isColumnSelectorOpen && (
            <div id="column-selector-content" className="p-4 border-t">
              <ColumnSelector
                columns={columns}
                onColumnsChange={setColumns}
              />
            </div>
          )}
        </div>

        <Button
          onClick={handleExport}
          className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all hover:shadow-xl"
          disabled={selectedSeasons.length === 0 || enabledColumnsCount === 0 || isExporting}
        >
          <Download className="mr-2 h-5 w-5" />
          {isExporting ? "Exporting..." : "Download CSV"}
        </Button>
      </div>
    </div>
  );
}
