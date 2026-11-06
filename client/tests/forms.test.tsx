import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: (...a: unknown[]) => api(...a) };
});

const auth = { user: null as null | { id: string }, openAuth: vi.fn() };
vi.mock('@/components/auth/AuthProvider', () => ({ useAuth: () => auth }));

const interests = {
  has: vi.fn(() => false),
  pending: vi.fn(() => false),
  add: vi.fn(async () => true),
  remove: vi.fn(),
};
vi.mock('@/components/listings/InterestContext', () => ({ useInterests: () => interests }));

import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { InterestButton } from '@/components/listings/InterestButton';
import { ApiError } from '@/lib/api';

beforeEach(() => {
  api.mockReset();
  auth.user = null;
  auth.openAuth.mockReset();
  interests.add.mockClear();
  interests.has.mockReturnValue(false);
  interests.pending.mockReturnValue(false);
});

const fill = async (u: ReturnType<typeof userEvent.setup>) => {
  await u.type(screen.getByLabelText('Full name'), 'Asha Verma');
  await u.type(screen.getByLabelText('Phone'), '9876543210');
  await u.type(screen.getByLabelText('Email'), 'asha@example.com');
  await u.type(screen.getByLabelText('How can we help?'), 'Is it available?');
};

describe('EnquiryForm', () => {
  it('shows validation messages and sends nothing when invalid', async () => {
    const u = userEvent.setup();
    render(<EnquiryForm />);
    await u.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('prevents double submission and shows the success state', async () => {
    let resolve!: () => void;
    api.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const u = userEvent.setup();
    render(<EnquiryForm propertyId="64b7f0f0f0f0f0f0f0f0f0f0" propertyTitle="Lake flat" />);
    expect(screen.getByText('Lake flat')).toBeInTheDocument();
    await fill(u);
    const btn = screen.getByRole('button', { name: 'Send message' });
    await u.click(btn);
    expect(btn).toBeDisabled();
    fireEvent.submit(btn.closest('form')!); // a second submit while the first is in flight
    expect(api).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[0]![1].body).toMatchObject({
      email: 'asha@example.com',
      propertyId: '64b7f0f0f0f0f0f0f0f0f0f0',
    });
    resolve();
    expect(await screen.findByText('Thank you, we have your message')).toBeInTheDocument();
  });

  it('ignores a malformed property id and surfaces server errors', async () => {
    api.mockRejectedValue(new ApiError(429, 'rate_limited', 'Too many requests'));
    const u = userEvent.setup();
    render(<EnquiryForm propertyId="not-an-id" />);
    await fill(u);
    await u.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/too many messages/i);
    expect(api.mock.calls[0]![1].body).not.toHaveProperty('propertyId');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled(); // can retry
  });
});

describe('InterestButton', () => {
  it('asks logged-out visitors to sign up and resumes the action afterwards', async () => {
    const u = userEvent.setup();
    render(<InterestButton propertyId="p1" />);
    await u.click(screen.getByRole('button', { name: /I am interested/ }));
    expect(interests.add).not.toHaveBeenCalled();
    expect(auth.openAuth).toHaveBeenCalledTimes(1);
    const { onSuccess, mode } = auth.openAuth.mock.calls[0]![0];
    expect(mode).toBe('signup');
    onSuccess(); // what AuthProvider calls after a successful login
    expect(interests.add).toHaveBeenCalledWith('p1');
  });

  it('registers interest directly for logged-in users', async () => {
    auth.user = { id: 'u1' };
    const u = userEvent.setup();
    render(<InterestButton propertyId="p2" />);
    await u.click(screen.getByRole('button', { name: /I am interested/ }));
    expect(auth.openAuth).not.toHaveBeenCalled();
    expect(interests.add).toHaveBeenCalledWith('p2');
  });

  it('shows the sent state, a busy state, and nothing for unavailable listings', () => {
    auth.user = { id: 'u1' };
    interests.has.mockReturnValue(true);
    const { rerender } = render(<InterestButton propertyId="p3" />);
    expect(screen.getByRole('status')).toHaveTextContent('Interest sent');
    interests.has.mockReturnValue(false);
    interests.pending.mockReturnValue(true);
    rerender(<InterestButton propertyId="p3" />);
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<InterestButton propertyId="p3" available={false} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
