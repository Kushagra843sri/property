import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: (...a: unknown[]) => api(...a) };
});
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const auth = {
  user: null as null | { id: string; phone: string | null },
  setUser: vi.fn(),
  openAuth: vi.fn(),
};
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => auth }));

import { AuthDialog } from '@/components/auth/AuthDialog';
import { InterestProvider, useInterests } from '@/components/listings/InterestContext';
import { ApiError } from '@/lib/api';

// jsdom has no native modal <dialog>: mark it open so its contents are accessible.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
  api.mockReset();
  auth.user = null;
  auth.setUser.mockReset();
});

const open = (mode: 'signup' | 'login' = 'signup') => {
  const onAuthenticated = vi.fn();
  render(
    <AuthDialog
      open
      initialMode={mode}
      onClose={() => undefined}
      onAuthenticated={onAuthenticated}
    />,
  );
  return onAuthenticated;
};

const signupFields = async (
  u: ReturnType<typeof userEvent.setup>,
  password = 'a long passphrase 7',
) => {
  await u.type(screen.getByLabelText('Full name'), 'Asha Verma');
  await u.type(screen.getByLabelText('Email'), 'Asha@Example.com');
  await u.type(screen.getByLabelText('Phone'), '9876543210');
  await u.type(screen.getByLabelText('Password'), password);
  await u.click(screen.getByRole('checkbox'));
};

describe('sign up', () => {
  it('keeps the password out of the sign-up request and sends it with the emailed code', async () => {
    api.mockResolvedValueOnce({ data: { sent: true } });
    const done = open();
    const u = userEvent.setup();
    await signupFields(u);
    await u.click(screen.getByRole('button', { name: 'Create account' }));

    const [path, opts] = api.mock.calls[0]!;
    expect(path).toBe('/auth/signup');
    expect(opts.body).toMatchObject({ email: 'Asha@Example.com', consent: true });
    expect(opts.body).not.toHaveProperty('password');

    api.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });
    await u.type(await screen.findByLabelText('6-digit code'), '123456');
    await u.click(screen.getByRole('button', { name: 'Verify and continue' }));
    const [path2, opts2] = api.mock.calls[1]!;
    expect(path2).toBe('/auth/otp/verify');
    expect(opts2.body).toEqual({
      identifier: 'asha@example.com',
      code: '123456',
      password: 'a long passphrase 7',
    });
    await waitFor(() => expect(done).toHaveBeenCalledWith({ id: 'u1' }));
  });

  it('shows validation messages for a short password and a missing consent, sending nothing', async () => {
    open();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText('Full name'), 'Asha Verma');
    await u.type(screen.getByLabelText('Email'), 'asha@example.com');
    await u.type(screen.getByLabelText('Phone'), '9876543210');
    await u.type(screen.getByLabelText('Password'), 'short');
    await u.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Please tick the box to continue')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('asks for a different password when the server rejects it, without losing the code', async () => {
    api.mockResolvedValueOnce({ data: { sent: true } });
    open();
    const u = userEvent.setup();
    await signupFields(u, 'password123');
    await u.click(screen.getByRole('button', { name: 'Create account' }));
    api.mockRejectedValueOnce(
      new ApiError(400, 'bad_request', 'Password is too common', [
        { path: 'body.password', message: 'Password is too common' },
      ]),
    );
    await u.type(await screen.findByLabelText('6-digit code'), '123456');
    await u.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(await screen.findByLabelText('Choose a different password')).toBeInTheDocument();
    expect(screen.getByText('Password is too common')).toBeInTheDocument();
  });

  it('hides the Google button when no client ID is configured', () => {
    open();
    expect(screen.queryByText('or')).toBeNull();
  });
});

describe('sign in', () => {
  it('posts the email and password and reports the user', async () => {
    api.mockResolvedValueOnce({ data: { user: { id: 'u9' } } });
    const done = open('login');
    const u = userEvent.setup();
    await u.type(screen.getByLabelText('Email'), 'asha@example.com');
    await u.type(screen.getByLabelText('Password'), 'whatever');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(api).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'asha@example.com', password: 'whatever' },
    });
    await waitFor(() => expect(done).toHaveBeenCalledWith({ id: 'u9' }));
  });

  it('shows one generic error for bad credentials', async () => {
    api.mockRejectedValueOnce(new ApiError(401, 'unauthorized', 'Invalid email or password'));
    open('login');
    const u = userEvent.setup();
    await u.type(screen.getByLabelText('Email'), 'asha@example.com');
    await u.type(screen.getByLabelText('Password'), 'nope');
    await u.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('resets a forgotten password through an emailed code', async () => {
    api.mockResolvedValueOnce({ data: { sent: true } });
    open('login');
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await u.type(screen.getByLabelText('Email'), 'asha@example.com');
    await u.type(screen.getByLabelText('New password'), 'brand new passphrase 9');
    await u.click(screen.getByRole('button', { name: 'Send me a code' }));
    expect(api.mock.calls[0]![0]).toBe('/auth/otp/request');
    api.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });
    await u.type(await screen.findByLabelText('6-digit code'), '654321');
    await u.click(screen.getByRole('button', { name: 'Verify and continue' }));
    expect(api.mock.calls[1]![1].body).toMatchObject({
      code: '654321',
      password: 'brand new passphrase 9',
    });
  });
});

function Probe() {
  const i = useInterests();
  return <button onClick={() => void i.add('p1')}>add</button>;
}

describe('phone prompt (Google sign-ups)', () => {
  it('asks for a phone number when the server requires one, saves it, then retries the interest', async () => {
    auth.user = { id: 'u1', phone: null };
    api.mockImplementation((path: string) =>
      path === '/me/interest-ids'
        ? Promise.resolve({ data: [] })
        : Promise.reject(new Error('unset')),
    );
    render(
      <InterestProvider>
        <Probe />
      </InterestProvider>,
    );
    api.mockReset();
    api.mockRejectedValueOnce(
      new ApiError(400, 'phone_required', 'Please add your phone number first'),
    );
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'add' }));
    expect(api).toHaveBeenLastCalledWith('/properties/p1/interest', { method: 'POST' });

    api.mockResolvedValueOnce({ data: { user: { id: 'u1', phone: '+919876543210' } } });
    api.mockResolvedValueOnce({ data: { interested: true } });
    await u.type(await screen.findByLabelText('Phone'), '9876543210');
    await u.click(screen.getByRole('button', { name: 'Save and send my interest' }));

    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith('/properties/p1/interest', { method: 'POST' }),
    );
    expect(api).toHaveBeenCalledWith('/me', { method: 'PATCH', body: { phone: '9876543210' } });
    expect(auth.setUser).toHaveBeenCalledWith({ id: 'u1', phone: '+919876543210' });
  });
});
