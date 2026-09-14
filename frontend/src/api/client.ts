/**
 * Axios API client for the Dockwise frontend.
 *
 * Reads the base URL from the environment (defaulting to same-origin relative
 * paths), attaches the Bearer token from storage, and normalizes 401 handling.
 * The global 401 interceptor excludes the auth endpoints themselves.
 */
import axios, { AxiosInstance } from 'axios';

/** Storage key for the access token. */
const TOKEN_KEY = 'dockwise.accessToken';

/**
 * Read the stored access token.
 *
 * Returns:
 *   The token string, or null when absent.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Persist the access token.
 *
 * Args:
 *   token: The token to store.
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Clear the stored access token. */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/** Shared axios instance for all API calls. */
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the Bearer token to every request when present.
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 (except for the auth endpoints), clear the session and route to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    const isAuthEndpoint = url.includes('/v1/auth/login');
    if (status === 401 && !isAuthEndpoint) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
