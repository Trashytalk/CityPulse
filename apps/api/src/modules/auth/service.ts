// apps/api/src/modules/auth/service.ts
import { authRepository } from './repository';
import { generateOTP, verifyOTP, isDevPhone, generateDevOTP } from '../../lib/otp';
import { generateTokenPair, verifyToken } from '../../lib/jwt';
import { lucia, invalidateSession, invalidateAllUserSessions } from '../../lib/lucia';
import { sendOTPSMS } from '../../lib/sms';
import { AppError, ERROR_CODES } from '../../lib/errors';
import { env } from '../../lib/env';

interface DeviceInfo {
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
  appVersion?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const authService = {
  // ==========================================================================
  // SEND OTP
  // ==========================================================================
  async sendOtp(phone: string) {
    // Check rate limit for this phone
    const recentAttempts = await authRepository.countRecentOtpAttempts(phone);
    if (recentAttempts >= 5) {
      throw new AppError(
        ERROR_CODES.RATE_LIMITED,
        'Too many OTP requests. Please try again later.',
        429
      );
    }
    
    // Use dev OTP for test phones
    const otp = isDevPhone(phone) ? generateDevOTP() : await generateOTP(phone);
    
    // Send SMS (or log in development)
    if (env.SMS_PROVIDER === 'console' || isDevPhone(phone)) {
      console.log(`[OTP] ${phone}: ${otp}`);
    } else {
      await sendOTPSMS(phone, otp);
    }
    
    return {
      expiresIn: env.OTP_EXPIRY_MINUTES * 60,
      otp: env.NODE_ENV === 'development' ? otp : undefined,
    };
  },

  // ==========================================================================
  // VERIFY OTP
  // ==========================================================================
  async verifyOtp(phone: string, code: string, deviceInfo: DeviceInfo) {
    // Verify OTP
    const isValid = await verifyOTP(phone, code);
    
    if (!isValid) {
      throw new AppError(ERROR_CODES.INVALID_OTP, 'Invalid or expired OTP', 401);
    }
    
    // Import user service lazily to avoid circular dependencies
    const { usersService } = await import('../users/service');
    
    // Get or create user
    let user = await usersService.findByPhone(phone);
    let isNewUser = false;
    
    if (!user) {
      // Create new user
      user = await usersService.create({ phone });
      isNewUser = true;
    }
    
    // Generate tokens
    const tokens = await generateTokenPair(user.id, user.role);
    
    // Update last active
    await usersService.updateLastActive(user.id);
    
    // Get user with profile
    const fullUser = await usersService.getFullProfile(user.id);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: fullUser,
      isNewUser,
    };
  },

  // ==========================================================================
  // REFRESH TOKEN
  // ==========================================================================
  async refreshToken(refreshToken: string) {
    const payload = await verifyToken(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      throw new AppError(ERROR_CODES.INVALID_TOKEN, 'Invalid or expired refresh token', 401);
    }
    
    // Import user service
    const { usersService } = await import('../users/service');
    
    // Verify user still exists and is active
    const user = await usersService.findById(payload.sub!);
    
    if (!user || user.status !== 'active') {
      throw new AppError(ERROR_CODES.INVALID_TOKEN, 'User not found or inactive', 401);
    }
    
    // Generate new tokens
    const tokens = await generateTokenPair(user.id, user.role);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  },

  // ==========================================================================
  // LOGOUT
  // ==========================================================================
  async logout(sessionId: string) {
    await invalidateSession(sessionId);
  },

  // ==========================================================================
  // LOGOUT ALL
  // ==========================================================================
  async logoutAll(userId: string) {
    const sessions = await authRepository.getUserSessions(userId);
    await invalidateAllUserSessions(userId);
    return sessions.length;
  },

  // ==========================================================================
  // LIST SESSIONS
  // ==========================================================================
  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await authRepository.getUserSessions(userId);
    
    return sessions.map((session) => ({
      id: session.id,
      deviceType: session.deviceType,
      deviceName: session.deviceName,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      isCurrent: session.id === currentSessionId,
    }));
  },

  // ==========================================================================
  // REVOKE SESSION
  // ==========================================================================
  async revokeSession(userId: string, sessionId: string) {
    // Verify session belongs to user
    const session = await authRepository.getSessionById(sessionId);
    
    if (!session || session.userId !== userId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Session not found', 404);
    }
    
    await invalidateSession(sessionId);
  },
};
