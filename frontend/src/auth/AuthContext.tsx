/**
 * Authentication context for the Dockwise frontend.
 *
 * Holds the authenticated principal, exposes login/logout, and restores the
 * session from the stored token on mount. The companion useAuth hook throws
 * when used outside the provider.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthPrincipal } from '../types';
import * as authApi from '../api/auth';
import { getToken, setToken, clearToken } from '../api/client';

interface AuthContextValue {
  /** The authenticated principal, or null when signed out. */
  user: AuthPrincipal | null;
  /** Whether the session is being restored on initial load. */
  loading: boolean;
  /** Sign in with email and password. */
  login: (email: string, password: string) => Promise<void>;
  /** Sign out and clear the stored session. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provide authentication state to the component tree.
 *
 * Args:
 *   children: The subtree that can access auth state.
 *
 * Returns:
 *   The provider element.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthPrincipal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.fetchMe();
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        clearToken();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Access the authentication context.
 *
 * Returns:
 *   The auth context value.
 *
 * Throws:
 *   Error: When used outside an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
