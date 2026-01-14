"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  CurrentUser,
  AuthUser,
  GuestUser,
  AuthResponse,
} from "@/lib/auth/types";

const TOKEN_KEY = "auth_token";
const GUEST_KEY = "is_guest";

interface AuthContextType {
  user: CurrentUser;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  continueAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const guestMode = localStorage.getItem(GUEST_KEY);
        if (guestMode === "true") {
          const guestUser: GuestUser = {
            _id: "guest",
            email: null,
            name: "Guest",
            role: "user",
            isGuest: true,
          };
          setUser(guestUser);
          setIsGuest(true);
          setIsLoading(false);
          return;
        }

        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const data: AuthResponse = await response.json();

        if (data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const storeToken = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);

    const expires = new Date();
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(newToken)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GUEST_KEY);

    document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    setUser(null);
    setToken(null);
    setIsGuest(false);
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data: AuthResponse = await response.json();

        if (data.success && data.user && data.token) {
          localStorage.removeItem(GUEST_KEY);
          storeToken(data.token);
          setUser(data.user);
          setToken(data.token);
          setIsGuest(false);
          return { success: true };
        }

        return { success: false, error: data.error || "Login failed" };
      } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [storeToken],
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const data: AuthResponse = await response.json();

        if (data.success && data.user && data.token) {
          localStorage.removeItem(GUEST_KEY);
          storeToken(data.token);
          setUser(data.user);
          setToken(data.token);
          setIsGuest(false);
          return { success: true };
        }

        return { success: false, error: data.error || "Signup failed" };
      } catch (error) {
        console.error("Signup error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [storeToken],
  );

  const continueAsGuest = useCallback(() => {
    clearAuth();
    localStorage.setItem(GUEST_KEY, "true");
    const guestUser: GuestUser = {
      _id: "guest",
      email: null,
      name: "Guest",
      role: "user",
      isGuest: true,
    };
    setUser(guestUser);
    setIsGuest(true);
  }, [clearAuth]);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isGuest,
    isAuthenticated: !!user && !isGuest,
    login,
    signup,
    continueAsGuest,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
