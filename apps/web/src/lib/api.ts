const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiError {
  message: string;
  code?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...init } = config;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...init.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = {
        message: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        error.message = data.message || data.error || error.message;
        error.code = data.code;
      } catch {
        // Response is not JSON
      }

      throw error;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    requestOtp: (phone: string) =>
      this.request<{ message: string }>('/api/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),

    verifyOtp: (phone: string, code: string) =>
      this.request<{ token: string; user: User }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),

    logout: () =>
      this.request<void>('/api/auth/logout', { method: 'POST' }),

    me: () => this.request<User>('/api/auth/me'),
  };

  // User endpoints
  users = {
    getProfile: () => this.request<User>('/api/users/me'),

    updateProfile: (data: Partial<User>) =>
      this.request<User>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
      this.request<PaginatedResponse<User>>('/api/admin/users', { params }),

    getById: (id: string) => this.request<User>(`/api/admin/users/${id}`),

    updateStatus: (id: string, status: string) =>
      this.request<User>(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  // Collection endpoints
  collection = {
    getSessions: (params?: { page?: number; limit?: number; status?: string }) =>
      this.request<PaginatedResponse<CollectionSession>>('/api/collection/sessions', { params }),

    getSession: (id: string) =>
      this.request<CollectionSession>(`/api/collection/sessions/${id}`),

    getStats: () => this.request<CollectionStats>('/api/collection/stats'),
  };

  // Wallet endpoints
  wallet = {
    getBalance: () => this.request<WalletBalance>('/api/wallet/balance'),

    getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
      this.request<PaginatedResponse<Transaction>>('/api/wallet/transactions', { params }),

    requestWithdrawal: (data: { amount: number; method: string; destination: string }) =>
      this.request<Withdrawal>('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getPayoutMethods: () => this.request<PayoutMethod[]>('/api/wallet/payout-methods'),

    addPayoutMethod: (data: { type: string; details: Record<string, string> }) =>
      this.request<PayoutMethod>('/api/wallet/payout-methods', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Gamification endpoints
  gamification = {
    getProgress: () => this.request<GamificationProgress>('/api/gamification/progress'),

    getAchievements: () => this.request<Achievement[]>('/api/gamification/achievements'),

    getLeaderboard: (params?: { period?: string; limit?: number }) =>
      this.request<LeaderboardEntry[]>('/api/gamification/leaderboard', { params }),
  };

  // Admin endpoints
  admin = {
    getStats: () => this.request<AdminStats>('/api/admin/stats'),

    getAnalytics: (params?: { period?: string; metric?: string }) =>
      this.request<AnalyticsData>('/api/admin/analytics', { params }),

    getWithdrawals: (params?: { page?: number; limit?: number; status?: string }) =>
      this.request<PaginatedResponse<Withdrawal>>('/api/admin/withdrawals', { params }),

    approveWithdrawal: (id: string) =>
      this.request<Withdrawal>(`/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
      }),

    rejectWithdrawal: (id: string, reason: string) =>
      this.request<Withdrawal>(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  };
}

export const api = new ApiClient(API_URL);

// Types
export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface CollectionSession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  itemsCollected: number;
  weight: number;
  earnings: number;
  status: 'active' | 'completed' | 'cancelled';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface CollectionStats {
  totalSessions: number;
  totalItems: number;
  totalWeight: number;
  totalEarnings: number;
  thisWeek: {
    sessions: number;
    items: number;
    earnings: number;
  };
}

export interface WalletBalance {
  available: number;
  pending: number;
  lifetime: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'bonus' | 'referral';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: string;
  destination: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  processedAt?: string;
  user?: User;
}

export interface PayoutMethod {
  id: string;
  type: 'mpesa' | 'bank';
  details: Record<string, string>;
  isDefault: boolean;
}

export interface GamificationProgress {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXp: number;
  rank: number;
  streakDays: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: number;
  progress: number;
  unlockedAt?: string;
  reward: {
    type: 'xp' | 'badge' | 'bonus';
    amount: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  level: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  pendingWithdrawalsAmount: number;
  growth: {
    users: number;
    sessions: number;
    earnings: number;
  };
}

export interface AnalyticsData {
  period: string;
  data: {
    date: string;
    users: number;
    sessions: number;
    earnings: number;
    items: number;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
