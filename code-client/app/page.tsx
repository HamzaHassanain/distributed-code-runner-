"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner, Tabs } from "@/components/ui";
import { AuthForm, AuthLayout, type AuthFormData, type AuthMode } from "@/components/auth";

// Tab configuration
const AUTH_TABS = [
  { value: "login", label: "Sign In" },
  { value: "signup", label: "Sign Up" },
] as const;

/**
 * Authentication Page
 * 
 * Features:
 * - Login/Signup toggle with smooth transitions
 * - Guest access option
 * - Auto-redirect for authenticated users
 * - Form validation and error handling
 */
export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading, login, signup, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/editor");
    }
  }, [user, isLoading, router]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: AuthFormData) => {
      setIsSubmitting(true);

      try {
        let result: { success: boolean; error?: string };

        if (mode === "login") {
          result = await login(data.email, data.password);
        } else {
          result = await signup(data.email, data.password, data.name || "");
        }

        if (result.success) {
          router.push("/editor");
        }

        return result;
      } catch {
        return { success: false, error: "An unexpected error occurred" };
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, login, signup, router]
  );

  // Handle mode change
  const handleModeChange = useCallback((value: string) => {
    setMode(value as AuthMode);
  }, []);

  // Handle guest access
  const handleGuestAccess = useCallback(() => {
    continueAsGuest();
    router.push("/editor");
  }, [continueAsGuest, router]);

  // Handle toggle link click
  const handleToggleMode = useCallback(() => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  }, []);

  // Toggle link content
  const toggleContent = useMemo(
    () =>
      mode === "login"
        ? { text: "Don't have an account? ", action: "Sign up" }
        : { text: "Already have an account? ", action: "Sign in" },
    [mode]
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
          <Spinner size="md" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <AuthLayout>
      {/* Mode Tabs */}
      <Tabs
        tabs={AUTH_TABS as unknown as Array<{ value: string; label: string }>}
        activeTab={mode}
        onTabChange={handleModeChange}
        className="mb-6"
      />

      {/* Auth Form */}
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        onGuestAccess={handleGuestAccess}
        isSubmitting={isSubmitting}
      />

      {/* Toggle Link */}
      <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
        {toggleContent.text}
        <button
          type="button"
          onClick={handleToggleMode}
          className="text-[var(--accent)] hover:underline"
        >
          {toggleContent.action}
        </button>
      </p>
    </AuthLayout>
  );
}
