// apps/api/src/middleware/errorHandler.ts
import type { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

import { env } from '../lib/env';
import { AppError, ERROR_CODES } from '../lib/errors';

import { getLogger } from './logger';

/**
 * Global error handler
 */
export const errorHandler: ErrorHandler = (error, c) => {
  const logger = getLogger(c);
  const requestId = c.get('requestId');
  
  // Handle known error types
  if (error instanceof AppError) {
    logger.warn({
      code: error.code,
      message: error.message,
      details: error.details,
    }, 'Application error');
    
    return c.json(error.toJSON(), error.statusCode as any);
  }
  
  if (error instanceof HTTPException) {
    const message = error.message || 'HTTP Error';
    
    logger.warn({
      status: error.status,
      message,
    }, 'HTTP exception');
    
    return c.json({
      success: false,
      error: {
        code: `E${error.status}`,
        message,
      },
    }, error.status);
  }
  
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    
    logger.warn({ issues }, 'Validation error');
    
    return c.json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { issues },
      },
    }, 400);
  }
  
  // Handle unexpected errors
  logger.error({
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  }, 'Unhandled error');
  
  // Don't expose internal errors in production
  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error instanceof Error ? error.message : 'Unknown error';
  
  return c.json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message,
      ...(requestId && { requestId }),
    },
  }, 500);
};

/**
 * Not found handler
 */
export function notFoundHandler(c: Context) {
  return c.json({
    success: false,
    error: {
      code: 'E404',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
  }, 404);
}
