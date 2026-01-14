/**
 * @file types/api.ts
 * @description API-related types
 * @playbook-ref 01-environment-setup/02-shared-package.md
 * @deviations None
 */

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

// Geographic
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// File upload
export interface UploadUrl {
  uploadUrl: string;
  uploadId: string;
  expiresAt: Date;
}

export interface UploadComplete {
  fileUrl: string;
  fileSize: number;
  checksum: string;
}
