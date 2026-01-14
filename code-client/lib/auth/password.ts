import bcryptjs from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(SALT_ROUNDS);
  return bcryptjs.hash(password, salt);
}

/**
 * Verify a plain text password against a hash
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptjs.compare(plainPassword, hashedPassword);
}

/**
 * Validate password strength
 * Returns null if valid, error message if invalid
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }
  if (password.length > 100) {
    return "Password must be less than 100 characters";
  }
  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }
  return null;
}
