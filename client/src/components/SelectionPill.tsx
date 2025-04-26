import React from 'react';

interface SelectionPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function SelectionPill({ label, selected = false, onClick, disabled = false, className, ...rest }: SelectionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${selected
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        } ${className || ''}`}
      {...rest}
    >
      {label}
    </button>
  );
}
