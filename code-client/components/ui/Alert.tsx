"use client";

interface AlertProps {
  type: "error" | "success" | "warning" | "info";
  message: string;
  className?: string;
}

const typeStyles = {
  error: "bg-[rgba(239,68,68,0.1)] text-[var(--error)]",
  success: "bg-[rgba(34,197,94,0.1)] text-[var(--success)]",
  warning: "bg-[rgba(245,158,11,0.1)] text-[var(--warning)]",
  info: "bg-[rgba(59,130,246,0.1)] text-[var(--accent)]",
};

/**
 * Alert component for displaying feedback messages
 */
export function Alert({ type, message, className = "" }: AlertProps) {
  if (!message) return null;

  return (
    <div
      className={`rounded-lg p-3 text-sm ${typeStyles[type]} ${className}`}
      role="alert"
    >
      {message}
    </div>
  );
}

export default Alert;
