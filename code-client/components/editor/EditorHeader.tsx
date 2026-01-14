"use client";

import { useCallback, useMemo } from "react";
import { Badge, Button, Logo, Select } from "@/components/ui";

interface EditorHeaderProps {
  languageId: number;
  onLanguageChange: (id: number) => void;
  onRun: () => void;
  isRunning: boolean;
  runButtonLabel: string;
  languages: Array<{ id: number; name: string }>;
  viewMode: "standard" | "testcases";
  onViewModeChange: (mode: "standard" | "testcases") => void;
  user?: { name: string } | null;
  isGuest: boolean;
  onLogout: () => void;
  onSignup: () => void;
  runIcon?: React.ReactNode;
}

/**
 * Editor header with language selector, run button, and user info
 */
export function EditorHeader({
  languageId,
  onLanguageChange,
  onRun,
  isRunning,
  runButtonLabel,
  languages,
  viewMode,
  onViewModeChange,
  user,
  isGuest,
  onLogout,
  onSignup,
  runIcon,
}: EditorHeaderProps) {
  // Simplified handler for Custom Select (direct value)
  const handleLanguageChange = useCallback(
    (value: string | number) => {
      onLanguageChange(Number(value));
    },
    [onLanguageChange]
  );

  const languageOptions = useMemo(
    () =>
      languages.map((lang) => ({
        value: lang.id,
        label: lang.name,
      })),
    [languages]
  );

  const handleStandardMode = useCallback(() => onViewModeChange("standard"), [onViewModeChange]);
  const handleTestCasesMode = useCallback(() => onViewModeChange("testcases"), [onViewModeChange]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
      <div className="flex items-center gap-4">
        <Logo size="sm" />

        {/* Custom Language Selector */}
        <div className="w-40">
          <Select
            value={languageId}
            onChange={handleLanguageChange}
            options={languageOptions}
            placeholder="Select Language"
          />
        </div>

        {/* Run Button */}
        <Button
          variant="success"
          onClick={onRun}
          disabled={isRunning}
          isLoading={isRunning}
          leftIcon={!isRunning ? runIcon : undefined}
          size="sm"
        >
          {isRunning ? "Running..." : runButtonLabel}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* View Mode Toggle */}
        <ViewModeToggle
          viewMode={viewMode}
          onStandard={handleStandardMode}
          onTestCases={handleTestCasesMode}
        />

        {/* User Info */}
        <UserInfo
          user={user}
          isGuest={isGuest}
          onLogout={onLogout}
          onSignup={onSignup}
        />
      </div>
    </header>
  );
}

// View Mode Toggle Sub-component
interface ViewModeToggleProps {
  viewMode: "standard" | "testcases";
  onStandard: () => void;
  onTestCases: () => void;
  className?: string;
}

export function ViewModeToggle({
  viewMode,
  onStandard,
  onTestCases,
}: ViewModeToggleProps) {
  return (
    <div className="flex rounded-lg bg-[var(--background-secondary)] p-0.5">
      <button
        onClick={onStandard}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          viewMode === "standard"
            ? "bg-[var(--background-elevated)] text-[var(--foreground)]"
            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Standard
      </button>
      <button
        onClick={onTestCases}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          viewMode === "testcases"
            ? "bg-[var(--background-elevated)] text-[var(--foreground)]"
            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Test Cases
      </button>
    </div>
  );
}

// User Info Sub-component
interface UserInfoProps {
  user?: { name: string } | null;
  isGuest: boolean;
  onLogout: () => void;
  onSignup: () => void;
}

export function UserInfo({
  user,
  isGuest,
  onLogout,
  onSignup,
}: UserInfoProps) {
  return (
    <div className="flex items-center gap-3">
      {isGuest ? (
        <Badge variant="warning">Guest Mode</Badge>
      ) : user ? (
        <span className="text-sm text-[var(--foreground-muted)]">{user.name}</span>
      ) : null}

      {isGuest ? (
        <Button variant="primary" size="sm" onClick={onSignup}>
          Sign Up
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Logout
        </Button>
      )}
    </div>
  );
}

export default EditorHeader;
