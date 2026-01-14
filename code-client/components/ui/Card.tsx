"use client";

import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "glass";
  className?: string;
}

export function Card({
  children,
  variant = "default",
  className = "",
}: CardProps) {
  const variantClass = variant === "glass" ? "card-glass" : "card";

  return <div className={`${variantClass} ${className}`}>{children}</div>;
}

export default Card;
