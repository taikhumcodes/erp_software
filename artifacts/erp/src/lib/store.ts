import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (access: string, refresh: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('erp_access_token'),
  accessToken: localStorage.getItem('erp_access_token'),
  refreshToken: localStorage.getItem('erp_refresh_token'),
  login: (access: string, refresh: string) => {
    localStorage.setItem('erp_access_token', access);
    localStorage.setItem('erp_refresh_token', refresh);
    set({ isAuthenticated: true, accessToken: access, refreshToken: refresh });
  },
  logout: () => {
    localStorage.removeItem('erp_access_token');
    localStorage.removeItem('erp_refresh_token');
    set({ isAuthenticated: false, accessToken: null, refreshToken: null });
  }
}));
