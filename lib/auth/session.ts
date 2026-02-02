// JWT Session Management

import jwt from 'jsonwebtoken';
import { AuthError } from './errors';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface SessionPayload {
  userId: string;
  role: string;
  sv: number; // sessionVersion
}

export interface SessionData {
  userId: string;
  role: string;
  sessionVersion: number;
}

/**
 * セッショントークン生成
 */
export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'pace-app',
    audience: 'pace-users',
  });
}

/**
 * セッショントークン検証
 */
export function verifySessionToken(token: string): SessionData {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pace-app',
      audience: 'pace-users',
    }) as jwt.JwtPayload;

    if (!decoded.userId || !decoded.role || typeof decoded.sv !== 'number') {
      throw new AuthError('SESSION_INVALID', 401, 'Invalid token payload');
    }

    return {
      userId: decoded.userId,
      role: decoded.role,
      sessionVersion: decoded.sv,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('SESSION_EXPIRED', 401, 'Session expired');
    }
    throw new AuthError('SESSION_INVALID', 401, 'Invalid session token');
  }
}
