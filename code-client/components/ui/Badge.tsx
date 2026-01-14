"use client";

import { type ReactNode } from "react";

type BadgeVariant = "success" | "error" | "warning" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "badge-success",
  error: "badge-error",
  warning: "badge-warning",
  info: "badge-info",
};

export function Badge({
  children,
  variant = "info",
  className = "",
}: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
