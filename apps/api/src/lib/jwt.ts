// apps/api/src/lib/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from './env';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const issuer = 'citypulse';
const audience = 'citypulse-api';

interface TokenPayload extends JWTPayload {
  sub: string; // userId
  type: 'access' | 'refresh';
  role?: string;
}

/**
 * Generate access token
 */
export async function generateAccessToken(userId: string, role?: string): Promise<string> {
  const token = await new SignJWT({ type: 'access', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
  
  return token;
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN)
    .sign(secret);
  
  return token;
}

/**
 * Verify and decode token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer,
      audience,
    });
    
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(userId: string, role?: string) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, role),
    generateRefreshToken(userId),
  ]);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpiry(env.JWT_EXPIRES_IN),
  };
}

/**
 * Parse expiry string to seconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhdw])$/);
  if (!match) return 3600; // Default 1 hour
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  
  return value * (multipliers[unit] || 3600);
}
