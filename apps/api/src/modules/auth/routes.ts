// apps/api/src/modules/auth/routes.ts
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { requireAuth } from '../../middleware/auth';
import { rateLimiters } from '../../middleware/rateLimit';

import { authService } from './service';
import * as v from './validators';

export const authRoutes = new Hono();

// ============================================================================
// POST /auth/otp/send
// Send OTP to phone number
// ============================================================================
authRoutes.post('/otp/send',
  rateLimiters.auth,
  zValidator('json', v.sendOtpSchema),
  async (c) => {
    const { phone } = c.req.valid('json');
    
    const result = await authService.sendOtp(phone);
    
    return c.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: result.expiresIn,
      // In development, include OTP for testing
      ...(result.otp && { otp: result.otp }),
    });
  }
);

// ============================================================================
// POST /auth/otp/verify
// Verify OTP and get tokens
// ============================================================================
authRoutes.post('/otp/verify',
  rateLimiters.auth,
  zValidator('json', v.verifyOtpSchema),
  async (c) => {
    const { phone, code } = c.req.valid('json');
    const deviceInfo = {
      deviceId: c.req.header('X-Device-ID'),
      deviceType: c.req.header('X-Device-Type'),
      deviceName: c.req.header('X-Device-Name'),
      appVersion: c.req.header('X-App-Version'),
      userAgent: c.req.header('User-Agent'),
      ipAddress: c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP'),
    };
    
    const result = await authService.verifyOtp(phone, code, deviceInfo);
    
    return c.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
      isNewUser: result.isNewUser,
    });
  }
);

// ============================================================================
// POST /auth/refresh
// Refresh access token
// ============================================================================
authRoutes.post('/refresh',
  zValidator('json', v.refreshTokenSchema),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    
    const result = await authService.refreshToken(refreshToken);
    
    return c.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
  }
);

// ============================================================================
// POST /auth/logout
// Invalidate current session
// ============================================================================
authRoutes.post('/logout',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    
    // For now, just return success (session invalidation requires session tracking)
    await authService.logoutAll(userId);
    
    return c.json({ success: true });
  }
);

// ============================================================================
// POST /auth/logout/all
// Invalidate all sessions for user
// ============================================================================
authRoutes.post('/logout/all',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    
    const count = await authService.logoutAll(userId);
    
    return c.json({ 
      success: true,
      sessionsRevoked: count,
    });
  }
);

// ============================================================================
// GET /auth/sessions
// List active sessions
// ============================================================================
authRoutes.get('/sessions',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    // Use userId as current session identifier for now
    const sessions = await authService.listSessions(userId, userId);
    
    return c.json({ 
      success: true,
      sessions,
    });
  }
);

// ============================================================================
// DELETE /auth/sessions/:id
// Revoke specific session
// ============================================================================
authRoutes.delete('/sessions/:id',
  requireAuth,
  async (c) => {
    const userId = c.get('userId');
    const sessionId = c.req.param('id');
    
    await authService.revokeSession(userId, sessionId);
    
    return c.json({ success: true });
  }
);
