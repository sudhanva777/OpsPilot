import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Axios instance configured with base URL and auth interceptor.
 *
 * Token is stored in memory (authToken variable) and attached to every
 * request via the request interceptor. This avoids XSS exposure from
 * localStorage while keeping the token accessible for API calls.
 *
 * For session persistence across page reloads, we also store the token
 * in sessionStorage (scoped to the tab, cleared on close).
 */
let authToken: string | null = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor: attach Bearer token ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken && config.headers) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// ─── Response interceptor: normalize errors ──────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth state
      clearToken();
      // Only redirect if not already on auth pages
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Token management ────────────────────────────────────────────────────────

const TOKEN_KEY = 'opspilot_token';

export function setToken(token: string): void {
  authToken = token;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  authToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (authToken) return authToken;
  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (stored) {
    authToken = stored;
    return stored;
  }
  return null;
}

// Initialize from sessionStorage on module load (page refresh)
(() => {
  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (stored) authToken = stored;
})();

export default api;
