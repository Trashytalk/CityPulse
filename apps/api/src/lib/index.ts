// apps/api/src/lib/index.ts
// Core utilities barrel export

// Error handling
export * from './errors';

// Environment
export { env } from './env';
export type { Env } from './env';

// Authentication
export { lucia, validateSession, createSession, invalidateSession, invalidateAllUserSessions } from './lucia';

// OTP
export { generateOTP, verifyOTP, generateDevOTP, isDevPhone } from './otp';

// JWT
export { generateAccessToken, generateRefreshToken, verifyToken, generateTokenPair } from './jwt';

// Storage
export { s3, getUploadUrl, getDownloadUrl, uploadFile, downloadFile, deleteFile, fileExists, storageKeys } from './s3';

// Cache
export { redis, getCached, setCached, deleteCached, deleteCachedPattern, cacheKeys, checkRateLimit } from './redis';

// Queue
export {
  QUEUES,
  sessionQueue,
  earningsQueue,
  notificationQueue,
  withdrawalQueue,
  addJob,
  createWorker,
  type SessionProcessingJob,
  type EarningsCalculationJob,
  type NotificationJob,
  type WithdrawalJob,
} from './queue';

// Encryption
export { encrypt, decrypt, hash, generateSecureToken } from './encryption';

// Geo utilities
export {
  H3_RESOLUTION,
  getH3Index,
  getH3IndexesInBounds,
  getH3Boundary,
  getH3Center,
  getH3Neighbors,
  calculateDistance,
  isPointInBounds,
  h3ToGeoJSON,
} from './geo';

// SMS
export { sendSMS, sendOTPSMS, sendWithdrawalSMS } from './sms';

// Payment providers
export { initiateGCashPayout, getGCashPayoutStatus } from './gcash';
export { initiateGrabPayPayout, getGrabPayPayoutStatus } from './grabpay';

// Push notifications
export { sendPushNotification, sendBulkPushNotifications, notificationTemplates } from './notifications';

// Monitoring
export { captureError, captureMessage, setUserContext, clearUserContext, addBreadcrumb, startTransaction, axiomLogger } from './monitoring';

