import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

/**
 * @intent Enriched payload structure matching the main application.
 */
export interface EnrichedJWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'author' | 'user';
  iat?: number;
  exp?: number;
}

/**
 * @intent Verifies JWT token and checks for required fields.
 * Returns null for guests (no token) or invalid tokens.
 */
export function verifyToken(token: string): EnrichedJWTPayload | null {
  if (!ENV.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET is not set in env');
    return null;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as EnrichedJWTPayload;

    // Enforce enriched JWT structure
    if (!decoded.email || !decoded.name || !decoded.role) {
      return null;
    }

    // Validate role
    const validRoles = ['admin', 'author', 'user'];
    if (!validRoles.includes(decoded.role)) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}
