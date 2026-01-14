"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, error, id, className = "", ...props }, ref) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-[var(--foreground-muted)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`textarea ${error ? "input-error" : ""} ${className}`}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default TextArea;
