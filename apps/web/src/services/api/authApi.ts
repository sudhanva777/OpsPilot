import api, { setToken } from './client';
import type { AuthResponse, UserProfile } from '../../types';

export const authApi = {
  register: async (data: { email: string; password: string; name: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/api/auth/register', data);
    setToken(res.data.accessToken);
    return res.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/api/auth/login', data);
    setToken(res.data.accessToken);
    return res.data;
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await api.get<UserProfile>('/api/auth/me');
    return res.data;
  },
};
