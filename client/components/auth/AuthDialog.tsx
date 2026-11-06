'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import type { User } from '@/lib/types';
import {
  codeSchema,
  fieldErrors,
  loginSchema,
  serverFieldErrors,
  signupSchema,
  type FieldErrors,
} from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';

type Mode = 'signup' | 'login' | 'verify';
const RESEND_SECONDS = 60;

interface Props {
  open: boolean;
  initialMode: 'signup' | 'login';
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

export function AuthDialog({ open, initialMode, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrors({});
      setFormError('');
      setCooldown(0);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const fail = (err: unknown) => {
    if (err instanceof ApiError) {
      setErrors(serverFieldErrors(err.details));
      setFormError(
        err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : err.message,
      );
    } else setFormError('Something went wrong. Please try again.');
  };

  async function submitSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return; // double-submit guard
    const fd = new FormData(e.currentTarget);
    const values = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      consent: fd.get('consent') === 'on',
    };
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) return (setErrors(fieldErrors(parsed.error)), setFormError(''));
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      await api('/auth/signup', {
        method: 'POST',
        body: { ...values, consent: true, website: String(fd.get('website') ?? '') },
      });
      setIdentifier(values.email.trim().toLowerCase());
      setCooldown(RESEND_SECONDS);
      setMode('verify');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ identifier: String(fd.get('identifier') ?? '') });
    if (!parsed.success) return (setErrors(fieldErrors(parsed.error)), setFormError(''));
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      await api('/auth/otp/request', {
        method: 'POST',
        body: { identifier: parsed.data.identifier, website: String(fd.get('website') ?? '') },
      });
      setIdentifier(parsed.data.identifier);
      setCooldown(RESEND_SECONDS);
      setMode('verify');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const parsed = codeSchema.safeParse({ code: String(fd.get('code') ?? '').trim() });
    if (!parsed.success) return (setErrors(fieldErrors(parsed.error)), setFormError(''));
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const res = await api<{ user: User }>('/auth/otp/verify', {
        method: 'POST',
        body: { identifier, code: parsed.data.code },
      });
      onAuthenticated(res.data.user);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setFormError('');
    try {
      await api('/auth/otp/request', { method: 'POST', body: { identifier } });
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'signup'
      ? 'Create your account'
      : mode === 'login'
        ? 'Welcome back'
        : 'Enter your code';

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <h2 className="pr-10 text-2xl">{title}</h2>

      {mode === 'signup' && (
        <>
          <p className="mt-2 text-muted">
            Sign up to tell us which properties interest you. We will contact you about them.
          </p>
          <form onSubmit={submitSignup} noValidate className="mt-6 flex flex-col gap-4">
            <Field label="Full name" error={errors.name}>
              {(a) => <Input {...a} name="name" autoComplete="name" required />}
            </Field>
            <Field label="Email" error={errors.email}>
              {(a) => <Input {...a} name="email" type="email" autoComplete="email" required />}
            </Field>
            <Field label="Phone" error={errors.phone}>
              {(a) => <Input {...a} name="phone" type="tel" autoComplete="tel" required />}
            </Field>
            {/* Honeypot: invisible to people, tempting to bots. */}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <div>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="consent"
                  className="mt-0.5 size-5 shrink-0 accent-[var(--forest)]"
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                />
                <span>
                  I agree to be contacted by phone, WhatsApp or email about properties. I have read
                  the{' '}
                  <Link href="/privacy" className="underline underline-offset-2" target="_blank">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" className="underline underline-offset-2" target="_blank">
                    Terms
                  </Link>
                  .
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" role="alert" className="mt-1 text-sm text-error">
                  {errors.consent}
                </p>
              )}
            </div>
            {formError && (
              <p role="alert" className="rounded-md bg-error-bg px-3 py-2 text-sm text-error">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" loading={busy}>
              Send me a code
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            Already have an account?{' '}
            <button
              type="button"
              className="font-medium text-forest underline underline-offset-2"
              onClick={() => {
                setMode('login');
                setErrors({});
                setFormError('');
              }}
            >
              Sign in
            </button>
          </p>
        </>
      )}

      {mode === 'login' && (
        <>
          <p className="mt-2 text-muted">We will send a one-time code to your email or phone.</p>
          <form onSubmit={submitLogin} noValidate className="mt-6 flex flex-col gap-4">
            <Field label="Email or phone" error={errors.identifier}>
              {(a) => <Input {...a} name="identifier" autoComplete="username" required />}
            </Field>
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            {formError && (
              <p role="alert" className="rounded-md bg-error-bg px-3 py-2 text-sm text-error">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" loading={busy}>
              Send me a code
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            New here?{' '}
            <button
              type="button"
              className="font-medium text-forest underline underline-offset-2"
              onClick={() => {
                setMode('signup');
                setErrors({});
                setFormError('');
              }}
            >
              Create an account
            </button>
          </p>
        </>
      )}

      {mode === 'verify' && (
        <>
          <p className="mt-2 text-muted">
            If that account exists, we have sent a 6-digit code to{' '}
            <strong className="text-ink">{identifier}</strong>. It expires in 10 minutes.
          </p>
          <form onSubmit={submitCode} noValidate className="mt-6 flex flex-col gap-4">
            <Field label="6-digit code" error={errors.code}>
              {(a) => (
                <Input
                  {...a}
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="\d{6}"
                  className="text-center text-2xl tracking-[0.4em]"
                  autoFocus
                />
              )}
            </Field>
            {formError && (
              <p role="alert" className="rounded-md bg-error-bg px-3 py-2 text-sm text-error">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" loading={busy}>
              Verify and continue
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            Did not get it?{' '}
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || busy}
              className="font-medium text-forest underline underline-offset-2 disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
            </button>
          </p>
        </>
      )}
    </Dialog>
  );
}
