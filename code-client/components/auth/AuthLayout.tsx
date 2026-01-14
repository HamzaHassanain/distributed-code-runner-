"use client";

import { type ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper for authentication pages
 * Provides centered layout with gradient background and branding
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="gradient-bg flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo / Brand */}
      <div className="mb-8 text-center animate-fadeIn">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="gradient-accent bg-clip-text text-transparent">CodeRunner</span>
        </h1>
        <p className="mt-2 text-[var(--foreground-muted)]">
          Write, run, and test your code online
        </p>
      </div>

      {/* Main Content */}
      <div className="card-glass w-full max-w-md animate-fadeIn">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-[var(--foreground-muted)] animate-fadeIn">
        Guest sessions are temporary. Sign up to save your code.
      </p>
    </div>
  );
}

export default AuthLayout;
