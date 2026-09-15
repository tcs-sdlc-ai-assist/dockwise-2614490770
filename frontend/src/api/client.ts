/**
 * Fetch-based API client for the Dockwise frontend.
 *
 * Reads the base URL from the environment (defaulting to same-origin relative
 * paths), attaches the Bearer token from storage, and normalizes 401 handling.
 * The global 401 handler excludes the auth endpoints themselves.
 *
 * Implemented on the native fetch API so the shipped bundle stays same-origin
 * and free of any third-party loopback fallback. The exported `apiClient`
 * preserves the small axios-like surface the API modules rely on:
 * `get/post/patch<T>(url, { params })` resolving to `{ data: T }`.
 */

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

/** Query-string parameters accepted by request helpers. */
type QueryParams = object;

/** Per-request options accepted by request helpers. */
interface RequestOptions {
  params?: QueryParams;
}

/** Response shape returned by request helpers (axios-compatible). */
export interface ApiResponse<T> {
  data: T;
  status: number;
}

/** Error thrown for non-2xx responses; carries axios-compatible fields. */
export class ApiError extends Error {
  response?: { status: number; data: unknown };
  config?: { url: string };

  constructor(message: string, status: number, url: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.response = { status, data };
    this.config = { url };
  }
}

/** Build a same-origin URL with optional query parameters. */
function buildUrl(path: string, params?: QueryParams): string {
  const url = `${baseURL}${path}`;
  if (!params) {
    return url;
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    search.append(key, String(value as string | number | boolean));
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

/** Handle a 401 by clearing the session and routing to login. */
function handleUnauthorized(url: string): void {
  const isAuthEndpoint = url.includes('/v1/auth/login');
  if (!isAuthEndpoint) {
    clearToken();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
}

/** Core request helper returning an axios-compatible response. */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const url = buildUrl(path, options?.params);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    handleUnauthorized(url);
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(
      `Request failed with status code ${response.status}`,
      response.status,
      url,
      data,
    );
  }

  return { data: data as T, status: response.status };
}

/** Shared API client for all API calls (axios-compatible surface). */
export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<T>('GET', path, undefined, options);
  },
  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body, options);
  },
  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return request<T>('PATCH', path, body, options);
  },
};
