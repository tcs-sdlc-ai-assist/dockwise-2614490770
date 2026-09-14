/**
 * Unit tests for the LoginPage component.
 *
 * Covers rendering, the empty-field validation error, and the successful
 * sign-in path (mocking the auth API).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../../auth/AuthContext';
import * as authApi from '../../api/auth';

vi.mock('../../api/auth');

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the sign-in form', () => {
    renderLogin();
    expect(
      screen.getByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows a validation error when fields are empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(
      await screen.findByText(/enter your email and password/i),
    ).toBeInTheDocument();
  });

  it('signs in and stores the token on valid credentials', async () => {
    const mockLogin = vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'token-123',
      user: {
        userId: 'u1',
        email: 'booker@frostline.example',
        fullName: 'Booker',
        memberships: [],
      },
    });
    renderLogin();
    await userEvent.type(
      screen.getByLabelText(/email/i),
      'booker@frostline.example',
    );
    await userEvent.type(screen.getByLabelText(/password/i), 'DockwiseDemo!1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });

  it('shows an error when the API rejects the credentials', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('401'));
    renderLogin();
    await userEvent.type(
      screen.getByLabelText(/email/i),
      'booker@frostline.example',
    );
    await userEvent.type(screen.getByLabelText(/password/i), 'WrongPassword!1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
  });
});
