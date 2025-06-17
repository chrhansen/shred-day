import { Textarea } from "@/components/ui/textarea";

interface TextInputSectionProps {
  inputText: string;
  selectedFile: File | null;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

export function TextInputSection({
  inputText,
  selectedFile,
  onChange,
  isDisabled = false,
}: TextInputSectionProps) {
  return (
    <div>
      <Textarea
        value={inputText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Paste your ski day entries here... Example:
Jan 15 - Skied at Whistler
Sep. 21, Stubai, Atomic S9, with Viggo
2025-02-01: Revelstoke powder day`}
        className="min-h-[200px]"
        disabled={isDisabled || !!selectedFile}
      />
    </div>
  );
}