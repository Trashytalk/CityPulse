// apps/mobile/src/stores/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended';
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    cityId: string | null;
  };
  wallet: {
    creditBalance: number;
    cashBalance: number;
    lifetimeEarnings: number;
  };
  progression: {
    level: number;
    totalXp: number;
    title: string;
    currentStreak: number;
    longestStreak: number;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  phone: string | null;
  
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setPhone: (phone: string) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      phone: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          phone: null,
        }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setPhone: (phone) =>
        set({ phone }),

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      initialize: async () => {
        // Zustand persist auto-hydrates, just mark as not loading
        set({ isLoading: false });
      },
    }),
    {
      name: 'citypulse-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
