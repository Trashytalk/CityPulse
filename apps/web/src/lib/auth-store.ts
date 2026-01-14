import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, type User } from './api';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;

  // Actions
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,

      setAuth: (token: string, user: User) => {
        api.setToken(token);
        set({
          token,
          user,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
          isLoading: false,
        });
      },

      logout: () => {
        api.setToken(null);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isLoading: false,
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        api.setToken(token);

        try {
          const user = await api.auth.me();
          set({
            user,
            isAuthenticated: true,
            isAdmin: user.role === 'admin',
            isLoading: false,
          });
        } catch {
          // Token is invalid
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'citypulse-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
        }
        state?.checkAuth();
      },
    }
  )
);
