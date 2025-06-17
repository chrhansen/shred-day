import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText } from "lucide-react";

interface FileUploadSectionProps {
  selectedFile: File | null;
  inputText: string;
  onFileSelect: (file: File | null) => void;
  isDisabled?: boolean;
}

export function FileUploadSection({
  selectedFile,
  inputText,
  onFileSelect,
  isDisabled = false,
}: FileUploadSectionProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "text/plain" || file.type === "text/csv" || file.name.endsWith('.txt') || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    } else if (file) {
      alert("Please select a text or CSV file");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/plain" || file.type === "text/csv" || file.name.endsWith('.txt') || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    } else {
      alert("Please drop a text or CSV file");
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Upload CSV/text file
      </label>
      <div className="space-y-2">
        <Input
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isDisabled || !!inputText}
        />
        <label
          htmlFor="file-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex items-center justify-center w-full px-4 py-8 
            border-2 border-dashed rounded-lg cursor-pointer
            transition-colors
            ${selectedFile 
              ? 'border-blue-500 bg-blue-50' 
              : isDraggingOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400'
            }
            ${(isDisabled || !!inputText) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="text-center">
            {selectedFile ? (
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFile();
                  }}
                  className="ml-4"
                  disabled={isDisabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  Click or drag file to upload
                </p>
                <p className="text-xs text-slate-500">
                  CSV or TXT files only
                </p>
              </>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}