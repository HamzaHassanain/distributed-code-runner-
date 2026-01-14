import bcryptjs from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(SALT_ROUNDS);
  return bcryptjs.hash(password, salt);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcryptjs.compare(plainPassword, hashedPassword);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }
  if (password.length > 100) {
    return "Password must be less than 100 characters";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }
  return null;
}
