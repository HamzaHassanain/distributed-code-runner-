// Auth type definitions
import type { ObjectId } from "mongodb";

// User type for client-side (string _id)
export interface User {
  _id: string;
  email: string;
  name: string;
  role: "admin" | "author" | "user";
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB document type (ObjectId _id)
export interface UserDocument {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: "admin" | "author" | "user";
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  _id: string;
  email: string;
  name: string;
  role: "admin" | "author" | "user";
  isGuest: boolean;
}

export interface GuestUser {
  _id: "guest";
  email: null;
  name: "Guest";
  role: "user";
  isGuest: true;
}

export type CurrentUser = AuthUser | GuestUser | null;

export interface AuthState {
  user: CurrentUser;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "author" | "user";
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}
