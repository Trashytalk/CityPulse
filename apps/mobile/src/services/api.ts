// apps/mobile/src/services/api.ts
import { useAuthStore } from '../stores/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.citypulse.app';

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { authenticated = true, headers: customHeaders, ...rest } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders as Record<string, string>,
    };

    if (authenticated) {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...rest,
      headers,
    });

    if (response.status === 401) {
      // Try refresh token
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${useAuthStore.getState().accessToken}`;
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...rest,
          headers,
        });
        if (!retryResponse.ok) {
          throw await this.handleError(retryResponse);
        }
        return retryResponse.json();
      }
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  private async handleError(response: Response): Promise<Error> {
    try {
      const data = await response.json();
      return new Error(data.error?.message || 'An error occurred');
    } catch {
      return new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  auth = {
    sendOtp: (phone: string) =>
      this.request<{ success: boolean; expiresIn: number }>(
        '/api/v1/auth/send-otp',
        {
          method: 'POST',
          body: JSON.stringify({ phone }),
          authenticated: false,
        }
      ),

    verifyOtp: (phone: string, code: string, deviceId?: string) =>
      this.request<{
        accessToken: string;
        refreshToken: string;
        user: any;
        isNewUser: boolean;
      }>('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code, deviceId: deviceId || 'mobile-app' }),
        authenticated: false,
      }),

    refresh: (refreshToken: string) =>
      this.request<{ accessToken: string; refreshToken: string }>(
        '/api/v1/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          authenticated: false,
        }
      ),

    logout: () =>
      this.request<{ success: boolean }>('/api/v1/auth/logout', {
        method: 'POST',
      }),
  };

  // Users endpoints
  users = {
    me: () => this.request<any>('/api/v1/users/me'),

    stats: () => this.request<any>('/api/v1/users/me/stats'),

    updateProfile: (data: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    }) =>
      this.request<any>('/api/v1/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    sessions: (params?: { limit?: number; offset?: number }) =>
      this.request<any>(
        `/api/v1/users/me/sessions?${new URLSearchParams(params as any)}`
      ),
  };

  // Collection endpoints
  collection = {
    startSession: (data: { mode: 'passive' | 'dashcam'; lat: number; lng: number }) =>
      this.request<{ sessionId: string }>('/api/v1/collection/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    submitPoints: (sessionId: string, points: any[]) =>
      this.request<{ processed: number; duplicates: number }>(
        `/api/v1/collection/sessions/${sessionId}/points`,
        {
          method: 'POST',
          body: JSON.stringify({ points }),
        }
      ),

    uploadPhoto: async (sessionId: string, photoUri: string, metadata: any) => {
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      formData.append('metadata', JSON.stringify(metadata));

      const token = useAuthStore.getState().accessToken;
      const response = await fetch(
        `${this.baseUrl}/api/v1/collection/sessions/${sessionId}/photos`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw await this.handleError(response);
      }

      return response.json();
    },

    endSession: (sessionId: string, summary: any) =>
      this.request<any>(`/api/v1/collection/sessions/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify(summary),
      }),
  };

  // WiFi endpoints
  wifi = {
    nearby: (lat: number, lng: number, radius: number = 500) =>
      this.request<{ networks: any[] }>(
        `/api/v1/wifi/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      ),

    unlock: (networkId: string) =>
      this.request<{ password: string }>(`/api/v1/wifi/${networkId}/unlock`, {
        method: 'POST',
      }),

    report: (networkId: string, status: 'working' | 'not_working') =>
      this.request<{ success: boolean }>(`/api/v1/wifi/${networkId}/report`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),

    submit: (data: any) =>
      this.request<any>('/api/v1/wifi', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Gamification endpoints
  gamification = {
    achievements: () =>
      this.request<{ achievements: any[] }>('/api/v1/gamification/achievements'),

    leaderboard: (type: 'daily' | 'weekly' | 'monthly' | 'allTime') =>
      this.request<{ entries: any[] }>(
        `/api/v1/gamification/leaderboard?type=${type}`
      ),

    challenges: () =>
      this.request<{ challenges: any[] }>('/api/v1/gamification/challenges'),
  };

  // Payments endpoints
  payments = {
    withdraw: (amount: number, method: 'gcash' | 'paymaya' | 'bank', details: any) =>
      this.request<any>('/api/v1/payments/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, method, ...details }),
      }),

    transactions: (params?: { limit?: number; offset?: number }) =>
      this.request<{ transactions: any[] }>(
        `/api/v1/payments/transactions?${new URLSearchParams(params as any)}`
      ),
  };

  // Maps endpoints
  maps = {
    coverage: (bbox: { north: number; south: number; east: number; west: number }) =>
      this.request<{ cells: any[] }>(
        `/api/v1/maps/coverage?north=${bbox.north}&south=${bbox.south}&east=${bbox.east}&west=${bbox.west}`
      ),

    search: (query: string, lat?: number, lng?: number) =>
      this.request<{ results: any[] }>(
        `/api/v1/maps/search?q=${encodeURIComponent(query)}${lat ? `&lat=${lat}&lng=${lng}` : ''}`
      ),
  };
}

export const api = new ApiClient(API_URL);
