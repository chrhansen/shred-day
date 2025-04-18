
interface SelectionPillProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
}

export function SelectionPill({ label, selected = false, onClick }: SelectionPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all
        ${selected 
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      {label}
    </button>
  );
}
