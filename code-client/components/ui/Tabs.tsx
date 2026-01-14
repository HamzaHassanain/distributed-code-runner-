"use client";

import { useCallback } from "react";

type TabValue = string;

interface Tab {
  value: TabValue;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: TabValue;
  onTabChange: (value: TabValue) => void;
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabsProps) {
  return (
    <div className={`flex rounded-lg bg-[var(--background)] p-1 ${className}`}>
      {tabs.map((tab) => (
        <TabButton
          key={tab.value}
          value={tab.value}
          label={tab.label}
          isActive={activeTab === tab.value}
          onClick={onTabChange}
        />
      ))}
    </div>
  );
}

interface TabButtonProps {
  value: TabValue;
  label: string;
  isActive: boolean;
  onClick: (value: TabValue) => void;
}

export function TabButton({ value, label, isActive, onClick }: TabButtonProps) {
  const handleClick = useCallback(() => {
    onClick(value);
  }, [onClick, value]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
        isActive
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

export default Tabs;
