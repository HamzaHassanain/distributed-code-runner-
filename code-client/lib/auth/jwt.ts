import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production",
);

const JWT_EXPIRY = "7d";

export async function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.userId || !payload.email || !payload.name || !payload.role) {
      return null;
    }

    const validRoles = ["admin", "author", "user"];
    if (!validRoles.includes(payload.role as string)) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "admin" | "author" | "user",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
