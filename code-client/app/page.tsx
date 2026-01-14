"use client";

import { useState, useEffect, useCallback, useMemo, memo, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type AuthMode = "login" | "signup";

// Memoized Spinner Component
const Spinner = memo(function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
});

// Memoized Guest Icon
const GuestIcon = memo(function GuestIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
});

// Memoized Form Input Component
interface FormInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
}

const FormInput = memo(function FormInput({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
}: FormInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--foreground-muted)]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input"
        required={required}
        minLength={minLength}
      />
    </div>
  );
});

// Memoized Auth Tabs Component
interface AuthTabsProps {
  mode: AuthMode;
  onLoginClick: () => void;
  onSignupClick: () => void;
}

const AuthTabs = memo(function AuthTabs({ mode, onLoginClick, onSignupClick }: AuthTabsProps) {
  return (
    <div className="mb-6 flex rounded-lg bg-[var(--background)] p-1">
      <button
        type="button"
        onClick={onLoginClick}
        className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
          mode === "login"
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={onSignupClick}
        className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
          mode === "signup"
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Sign Up
      </button>
    </div>
  );
});

// Memoized Error Message Component
const ErrorMessage = memo(function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-[rgba(239,68,68,0.1)] p-3 text-sm text-[var(--error)]">
      {message}
    </div>
  );
});

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading, login, signup, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/editor");
    }
  }, [user, isLoading, router]);

  // Form submission handler - memoized
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");
      setIsSubmitting(true);

      try {
        let result: { success: boolean; error?: string };

        if (mode === "login") {
          result = await login(email, password);
        } else {
          result = await signup(email, password, name);
        }

        if (result.success) {
          router.push("/editor");
        } else {
          setError(result.error || "An error occurred");
        }
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, email, password, name, login, signup, router]
  );

  // Guest access handler - memoized
  const handleGuestAccess = useCallback(() => {
    continueAsGuest();
    router.push("/editor");
  }, [continueAsGuest, router]);

  // Mode toggle handlers - memoized
  const setLoginMode = useCallback(() => {
    setMode("login");
    setError("");
  }, []);

  const setSignupMode = useCallback(() => {
    setMode("signup");
    setError("");
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    setError("");
  }, []);

  // Input change handlers - memoized
  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  // Memoized submit button text
  const submitButtonText = useMemo(() => {
    if (isSubmitting) {
      return mode === "login" ? "Signing in..." : "Creating account...";
    }
    return mode === "login" ? "Sign In" : "Create Account";
  }, [mode, isSubmitting]);

  // Memoized toggle link text
  const toggleLinkContent = useMemo(() => {
    if (mode === "login") {
      return {
        text: "Don't have an account? ",
        action: "Sign up",
      };
    }
    return {
      text: "Already have an account? ",
      action: "Sign in",
    };
  }, [mode]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--foreground-muted)]">
          <Spinner className="h-5 w-5" />
          Loading...
        </div>
      </div>
    );
  }

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

      {/* Auth Card */}
      <div className="card-glass w-full max-w-md animate-fadeIn">
        {/* Tabs */}
        <AuthTabs mode={mode} onLoginClick={setLoginMode} onSignupClick={setSignupMode} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <FormInput
              id="name"
              label="Full Name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="John Doe"
              required
              minLength={2}
            />
          )}

          <FormInput
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="you@example.com"
            required
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            required
            minLength={6}
          />

          {/* Error message */}
          <ErrorMessage message={error} />

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
          >
            {isSubmitting && <Spinner />}
            {submitButtonText}
          </button>
        </form>

        {/* Divider */}
        <div className="divider my-6">or</div>

        {/* Guest Access */}
        <button
          type="button"
          onClick={handleGuestAccess}
          className="btn btn-secondary w-full"
        >
          <GuestIcon />
          Continue as Guest
        </button>

        {/* Toggle link */}
        <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
          {toggleLinkContent.text}
          <button
            type="button"
            onClick={toggleMode}
            className="text-[var(--accent)] hover:underline"
          >
            {toggleLinkContent.action}
          </button>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-[var(--foreground-muted)] animate-fadeIn">
        Guest sessions are temporary. Sign up to save your code.
      </p>
    </div>
  );
}
