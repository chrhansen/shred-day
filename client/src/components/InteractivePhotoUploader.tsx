import React, { useCallback, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"; // Import Button if needed for styling or future use
import { ImagePlus, Loader2, X } from 'lucide-react';
import { type PhotoPreview } from "@/types/ski";

interface InteractivePhotoUploaderProps {
  photos: PhotoPreview[];
  onFilesSelected: (files: File[]) => void;
  onRemovePhoto: (clientSideId: string) => void;
  // onRetryUpload?: (clientSideId: string) => void; // Future: if retry is needed
  isProcessing?: boolean; // To disable controls during parent operations
  acceptedFileTypes?: string; // e.g. "image/*" or "image/jpeg,image/png"
}

export function InteractivePhotoUploader({
  photos,
  onFilesSelected,
  onRemovePhoto,
  isProcessing = false,
  acceptedFileTypes = "image/*",
}: InteractivePhotoUploaderProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handlePhotoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onFilesSelected(Array.from(event.target.files));
      event.target.value = ''; // Reset file input
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(event.dataTransfer.files));
      event.dataTransfer.clearData();
    }
  };

  return (
    <div className="space-y-2">
      {/* Dropzone Label */}
      <Label
        htmlFor="photo-upload-interactive" // Ensure this ID is unique if component used multiple times or use a generated one
        data-testid="photo-dropzone-label"
        className={`flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors ${
          isDraggingOver ? 'border-blue-600 bg-blue-50' : ''
        } ${isProcessing ? 'cursor-not-allowed opacity-70' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-disabled={isProcessing}
      >
        <div className="text-center text-slate-500">
          <ImagePlus className="mx-auto h-8 w-8" />
          <span>Click or drag to upload</span>
        </div>
        {/* Hidden File Input */}
        <Input
          id="photo-upload-interactive" // Match with htmlFor
          type="file"
          multiple
          accept={acceptedFileTypes}
          className="sr-only"
          onChange={handlePhotoInputChange}
          disabled={isProcessing}
        />
      </Label>

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group w-full h-20" data-testid="photo-preview">
              {/* Image or Fallback based on status */}
              {photo.uploadStatus === 'completed' && photo.previewUrl ? (
                <img
                  src={photo.previewUrl}
                  alt={`preview ${photo.originalFile?.name || photo.serverId}`}
                  className="w-full h-full object-cover rounded-md"
                  onError={(e) => { // Fallback for broken image links
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none'; // Hide broken img
                    const fallbackEl = target.parentElement?.querySelector<HTMLElement>(`[data-fallback-id="${photo.id}"]`);
                    if (fallbackEl) fallbackEl.style.display = 'flex'; // Show text fallback
                  }}
                />
              ) : photo.uploadStatus === 'failed' ? (
                <div className="w-full h-full bg-red-100 rounded-md flex flex-col items-center justify-center text-center text-xs text-red-600 p-1 font-medium">
                  <X className="h-4 w-4 mb-1" />
                  <span className="break-words">Upload Failed</span>
                  {/* Optional: Retry button can be added here, calling onRetryUpload(photo.id) */}
                </div>
              ) : photo.uploadStatus === 'uploading' ? (
                <div className="w-full h-full bg-slate-100 rounded-md flex items-center justify-center text-center text-xs text-slate-400 p-1 animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : ( // Pending or Completed but no previewUrl (should ideally not happen for completed)
                <div
                  data-fallback-id={photo.id} // For img onError
                  className="w-full h-full bg-slate-100 rounded-md flex items-center justify-center text-center text-xs text-slate-500 p-1"
                >
                  <span className="break-words">{photo.originalFile?.name || 'Pending...'}</span>
                </div>
              )}

              {/* Fallback div for img onError, initially hidden */}
              <div
                data-fallback-id={photo.id}
                className="w-full h-full bg-slate-100 rounded-md items-center justify-center text-center text-xs text-slate-500 p-1"
                style={{ display: 'none' }}
              >
                 <span className="break-words">{photo.originalFile?.name || 'Preview N/A'}</span>
              </div>


              {/* Remove Button Overlay */}
              {(photo.uploadStatus === 'completed' || photo.uploadStatus === 'failed' || photo.uploadStatus === 'pending') && ( // Allow removing pending files too
                <button
                  type="button"
                  onClick={() => onRemovePhoto(photo.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
                  aria-label="Remove photo"
                  disabled={isProcessing} // Simplified: if button is shown, only parent processing state matters for disabling
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
