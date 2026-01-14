"use client";

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "glass";
  className?: string;
}

/**
 * Card container component with variants
 */
export function Card({
  children,
  variant = "default",
  className = "",
}: CardProps) {
  const variantClass = variant === "glass" ? "card-glass" : "card";

  return (
    <div className={`${variantClass} ${className}`}>
      {children}
    </div>
  );
}

export default Card;
