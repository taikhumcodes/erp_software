import { api } from './api';

export interface UserSession {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  isDemo: boolean;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  loggedInAt: string;
  lastActiveAt: string;
  expiresAt?: string;
  terminatedAt?: string;
  terminatedBy?: string;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  nameAr?: string;
  isActive: boolean;
  isDemo: boolean;
  demoExpiresAt?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  role: { name: string };
  initialPassword?: string;
}

export const DeveloperAPI = {
  getSessions: (limit = 100) =>
    api.get<{ success: boolean; data: UserSession[] }>(`/developer/sessions?limit=${limit}`),

  terminateSession: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/developer/sessions/${id}/terminate`, {}),

  terminateAllUserSessions: (userId: string) =>
    api.post<{ success: boolean; message: string }>(`/developer/users/${userId}/terminate-sessions`, {}),

  getDemoUsers: () =>
    api.get<{ success: boolean; data: DemoUser[] }>('/developer/demo-users'),

  createDemoUser: (data: { email: string; password?: string; name?: string; nameAr?: string; expiresInDays?: number }) =>
    api.post<{ success: boolean; message: string; data: DemoUser }>('/developer/demo-users', data),

  toggleDemoUser: (id: string) =>
    api.post<{ success: boolean; message: string; data: DemoUser }>(`/developer/demo-users/${id}/toggle`, {}),

  extendDemoUser: (id: string, days = 7) =>
    api.post<{ success: boolean; message: string; data: DemoUser }>(`/developer/demo-users/${id}/extend`, { days }),

  resetDemoData: () =>
    api.post<{ success: boolean; message: string }>('/developer/demo-data/reset', {}),
};
