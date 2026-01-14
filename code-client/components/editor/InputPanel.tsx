"use client";

import { useCallback } from "react";

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Input panel for stdin
 */
export function InputPanel({ value, onChange }: InputPanelProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="flex h-1/3 flex-col border-b border-[var(--border)]">
      <div className="flex items-center border-b border-[var(--border)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--foreground-muted)]">
          Input (stdin)
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Enter input here..."
        className="flex-1 resize-none border-0 bg-[var(--background-secondary)] p-3 font-mono text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none"
      />
    </div>
  );
}

export default InputPanel;
