// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { requestId } from './middleware/requestId';
import { requestLogger, logger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiters } from './middleware/rateLimit';
import { env } from './lib/env';

// Import routes
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/users/routes';
import { collectionRoutes } from './modules/collection/routes';
import { gamificationRoutes } from './modules/gamification/routes';
import { wifiRoutes } from './modules/wifi/routes';
import { paymentRoutes } from './modules/payments/routes';
import { mapRoutes } from './modules/maps/routes';

const app = new Hono();

// Global middleware
app.use('*', secureHeaders());
app.use('*', cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://citypulse.app', 'https://www.citypulse.app']
    : '*',
  credentials: true,
}));
app.use('*', requestId);
app.use('*', requestLogger);
app.use('*', rateLimiters.standard);

// Health check
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  version: '0.1.0',
}));

// API routes v1
const api = new Hono();
api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/collection', collectionRoutes);
api.route('/gamification', gamificationRoutes);
api.route('/wifi', wifiRoutes);
api.route('/payments', paymentRoutes);
api.route('/maps', mapRoutes);

app.route('/api/v1', api);

// Error handling
app.onError(errorHandler);
app.notFound(notFoundHandler);

// Start server
const port = env.PORT;
logger.info({ port, env: env.NODE_ENV }, '🚀 CityPulse API starting');

export default {
  port,
  fetch: app.fetch,
};
