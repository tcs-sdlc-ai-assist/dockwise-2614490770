/**
 * Auth API calls for the Dockwise frontend.
 */
import { apiClient } from './client';
import type { LoginResponse, AuthPrincipal } from '../types';

/**
 * Authenticate with email and password.
 *
 * Args:
 *   email: The account email.
 *   password: The account password.
 *
 * Returns:
 *   The login response with an access token and principal.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
    email,
    password,
  });
  return res.data;
}

/**
 * Fetch the authenticated principal for the current token.
 *
 * Returns:
 *   The authenticated principal.
 */
export async function fetchMe(): Promise<AuthPrincipal> {
  const res = await apiClient.get<AuthPrincipal>('/api/v1/auth/me');
  return res.data;
}
