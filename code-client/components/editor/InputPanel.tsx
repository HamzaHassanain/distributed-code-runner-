"use client";

import { useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react";

export interface InputPanelHandle {
  getValue: () => string;
  setValue: (value: string) => void;
}

interface InputPanelProps {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export const InputPanel = forwardRef<InputPanelHandle, InputPanelProps>(
  ({ initialValue = "", onChange }, ref) => {
    const [value, setValue] = useState(initialValue);
    const valueRef = useRef(value);

    // Keep ref in sync
    if (valueRef.current !== value) {
        valueRef.current = value;
    }

    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      setValue: (newValue: string) => {
        setValue(newValue);
        valueRef.current = newValue;
      },
    }));

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange?.(newValue);
      },
      [onChange],
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
  },
);

InputPanel.displayName = "InputPanel";

export default InputPanel;
