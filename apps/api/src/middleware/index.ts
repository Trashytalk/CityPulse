// apps/api/src/middleware/index.ts
// Middleware barrel export

export { requireAuth, optionalAuth, requireAdmin, requireModerator } from './auth';
export { rateLimit, rateLimiters, userKeyGenerator, endpointKeyGenerator } from './rateLimit';
export { requestId } from './requestId';
export { logger, requestLogger, getLogger } from './logger';
export { errorHandler, notFoundHandler } from './errorHandler';
