"use client";

interface LogoProps {
  className?: string; // Additional classes for the container
  size?: "sm" | "md" | "lg" | "xl"; // Responsive sizing
  showText?: boolean; // Toggle text visibility
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
} as const;

const iconSizes = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
  xl: "h-10 w-10",
} as const;

/**
 * Brand Logo Component
 * Renders the CodeRunner logo with consistent styling and gradient text.
 */
export function Logo({
  className = "",
  size = "md",
  showText = true,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 font-bold tracking-tight ${className}`}>
      {/* Icon Shape */}
      <div
        className={`flex items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-lg shadow-blue-500/20 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[60%] w-[60%]"
        >
          <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>

      {/* Text Branding */}
      {showText && (
        <span
          className={`${sizeClasses[size]}`}
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, #a855f7 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            display: "inline-block", // Fix for some browsers clipping block backgrounds incorrectly
          }}
        >
          CodeRunner
        </span>
      )}
    </div>
  );
}

export default Logo;
