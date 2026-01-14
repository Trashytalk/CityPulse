// apps/api/src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('E0001', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('E1000', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super('E1001', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('E2000', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('E3000', message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('E5001', 'Rate limit exceeded', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super('E9001', message, 500);
    this.name = 'InternalError';
  }
}

// Error codes registry
export const ERROR_CODES = {
  // Validation (E0xxx)
  VALIDATION_ERROR: 'E0001',
  INVALID_INPUT: 'E0002',
  
  // Auth (E1xxx)
  AUTH_REQUIRED: 'E1000',
  INVALID_TOKEN: 'E1001',
  TOKEN_EXPIRED: 'E1002',
  INVALID_OTP: 'E1003',
  OTP_EXPIRED: 'E1004',
  INVALID_PHONE: 'E1005',
  SESSION_EXPIRED: 'E1006',
  
  // Resource (E2xxx)
  NOT_FOUND: 'E2000',
  USER_NOT_FOUND: 'E2001',
  SESSION_NOT_FOUND: 'E2002',
  NETWORK_NOT_FOUND: 'E2003',
  
  // Conflict (E3xxx)
  ALREADY_EXISTS: 'E3000',
  SESSION_ACTIVE: 'E3001',
  ALREADY_UNLOCKED: 'E3002',
  REFERRAL_USED: 'E3003',
  
  // Payment (E4xxx)
  INSUFFICIENT_BALANCE: 'E4001',
  WITHDRAWAL_MIN: 'E4002',
  WITHDRAWAL_MAX: 'E4003',
  INVALID_PAYOUT_METHOD: 'E4004',
  
  // Rate limit (E5xxx)
  RATE_LIMITED: 'E5001',
  
  // Internal (E9xxx)
  INTERNAL_ERROR: 'E9001',
  DATABASE_ERROR: 'E9002',
  EXTERNAL_SERVICE_ERROR: 'E9003',
} as const;
