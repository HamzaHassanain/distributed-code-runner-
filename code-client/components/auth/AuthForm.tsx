"use client";

import { useCallback, type FormEvent, type ChangeEvent, useState } from "react";
import { Input, Button, Alert } from "@/components/ui";
import { GuestIcon } from "@/components/icons";

export type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (data: AuthFormData) => Promise<{ success: boolean; error?: string }>;
  onGuestAccess: () => void;
  isSubmitting?: boolean;
}

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
}

/**
 * Auth form component with login/signup modes
 * Handles form state, validation, and submission
 */
export function AuthForm({
  mode,
  onSubmit,
  onGuestAccess,
  isSubmitting = false,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError("");

      const data: AuthFormData = { email, password };
      if (mode === "signup") {
        data.name = name;
      }

      const result = await onSubmit(data);
      if (!result.success) {
        setError(result.error || "An error occurred");
      }
    },
    [email, password, name, mode, onSubmit]
  );

  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const submitButtonText = mode === "login" ? "Sign In" : "Create Account";
  const loadingButtonText = mode === "login" ? "Signing in..." : "Creating account...";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="John Doe"
            required
            minLength={2}
          />
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="you@example.com"
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="••••••••"
          required
          minLength={6}
        />

        <Alert type="error" message={error} />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
        >
          {isSubmitting ? loadingButtonText : submitButtonText}
        </Button>
      </form>

      <div className="divider">or</div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={onGuestAccess}
        leftIcon={<GuestIcon />}
      >
        Continue as Guest
      </Button>
    </div>
  );
}

export default AuthForm;
