"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@/components/icons";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  value?: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Custom styled select component
 * Replaces native select with a fully styleable dropdown
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  className = "",
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-[var(--foreground-muted)]">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] px-3 py-2 text-sm transition-all hover:border-[var(--border-hover)] ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${isOpen ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : ""}`}
      >
        <span className={selectedOption ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`ml-2 h-4 w-4 text-[var(--foreground-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] py-1 shadow-xl animate-fadeIn">
          {options.length > 0 ? (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-[var(--background-secondary)] ${
                  option.value === value
                    ? "bg-[var(--accent-glow)] text-[var(--accent)] font-medium"
                    : "text-[var(--foreground)]"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-[var(--foreground-muted)]">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Select;
