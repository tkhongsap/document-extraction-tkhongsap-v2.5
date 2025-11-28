import { create } from 'zustand';
import type { User } from '@shared/schema';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from './api';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  
  login: async () => {
    try {
      const { user } = await apiLogin();
      set({ isAuthenticated: true, user, isLoading: false });
    } catch (error) {
      console.error('Login failed:', error);
      set({ isAuthenticated: false, user: null, isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await apiLogout();
      set({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  checkAuth: async () => {
    try {
      const { user } = await getCurrentUser();
      set({ isAuthenticated: true, user, isLoading: false });
    } catch (error) {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
}));
