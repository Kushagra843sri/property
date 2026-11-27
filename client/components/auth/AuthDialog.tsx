'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import type { User } from '@/lib/types';
import {
  PASSWORD_MIN,
  codeSchema,
  fieldErrors,
  forgotSchema,
  loginSchema,
  serverFieldErrors,
  signupSchema,
  type FieldErrors,
} from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';

type Mode = 'signup' | 'login' | 'forgot' | 'verify';
const RESEND_SECONDS = 60;
/** Public OAuth client ID. When unset, the Google button is simply not shown. */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleId {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

interface Props {
  open: boolean;
  initialMode: 'signup' | 'login';
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

export function AuthDialog({ open, initialMode, onClose, onAuthenticated }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Sign in or create an account">
      {/* Mounted only while open, so every opening starts from fresh state. */}
      <AuthFlow initialMode={initialMode} onAuthenticated={onAuthenticated} />
    </Dialog>
  );
}

/** Google's own sign-in button (popup flow). Hidden unless a client ID is configured. */
function GoogleButton({
  text,
  onCredential,
}: {
  text: 'signin_with' | 'signup_with';
  onCredential: (credential: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.google);

  useEffect(() => {
    latest.current = onCredential;
  });
  useEffect(() => {
    if (!ready || !box.current || !window.google || !GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r) => latest.current(r.credential),
    });
    window.google.accounts.id.renderButton(box.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      width: 300,
    });
  }, [ready, text]);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <>
      <p className="my-1 text-center text-sm text-muted">or</p>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={box} className="flex min-h-11 justify-center" />
    </>
  );
}

const Honeypot = () => (
  <input
    name="website"
    tabIndex={-1}
    autoComplete="off"
    aria-hidden
    className="absolute -left-[9999px] h-0 w-0 opacity-0"
  />
);

const FormError = ({ text }: { text: string }) =>
  text ? (
    <p role="alert" className="rounded-md bg-error-bg px-3 py-2 text-sm text-error">
      {text}
    </p>
  ) : null;

function AuthFlow({
  initialMode,
  onAuthenticated,
}: Pick<Props, 'initialMode' | 'onAuthenticated'>) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [identifier, setIdentifier] = useState('');
  // Held only in memory: sent together with the emailed code, which is what proves the inbox is theirs.
  const [pendingPassword, setPendingPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [needNewPassword, setNeedNewPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const reset = () => {
    setErrors({});
    setFormError('');
  };
  const goto = (m: Mode) => {
    setMode(m);
    reset();
  };

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
      password: String(fd.get('password') ?? ''),
      consent,
    };
    const parsed = signupSchema.safeParse(values);
    if (!parsed.success) return (setErrors(fieldErrors(parsed.error)), setFormError(''));
    setBusy(true);
    reset();
    try {
      // The password is deliberately NOT sent here; it goes with the code in the next step.
      await api('/auth/signup', {
        method: 'POST',
        body: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          consent: true,
          website: String(fd.get('website') ?? ''),
        },
      });
      setIdentifier(values.email.trim().toLowerCase());
      setPendingPassword(values.password);
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
    const parsed = loginSchema.safeParse({
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
    });
    if (!parsed.success) return (setErrors(fieldErrors(parsed.error)), setFormError(''));
    setBusy(true);
    reset();
    try {
      const res = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: parsed.data,
      });
      onAuthenticated(res.data.user);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const parsed = forgotSchema.safeParse({
      email: String(fd.get('email') ?? ''),
      password: String(fd.get('password') ?? ''),
    });
    if (!parsed.success) return (setErrors(fieldErrors(parsed.error)), setFormError(''));
    setBusy(true);
    reset();
    try {
      await api('/auth/otp/request', {
        method: 'POST',
        body: { identifier: parsed.data.email, website: String(fd.get('website') ?? '') },
      });
      setIdentifier(parsed.data.email.trim().toLowerCase());
      setPendingPassword(parsed.data.password);
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
    const replacement = String(fd.get('password') ?? '');
    const password = needNewPassword ? replacement : pendingPassword;
    if (needNewPassword && replacement.length < PASSWORD_MIN)
      return (setErrors({ password: `Use at least ${PASSWORD_MIN} characters` }), setFormError(''));
    setBusy(true);
    reset();
    try {
      const res = await api<{ user: User }>('/auth/otp/verify', {
        method: 'POST',
        body: { identifier, code: parsed.data.code, password },
      });
      onAuthenticated(res.data.user);
    } catch (err) {
      // The server checks the password before spending the code, so the same code still works.
      if (err instanceof ApiError && err.details?.some((d) => d.path.endsWith('password'))) {
        setNeedNewPassword(true);
        setErrors(serverFieldErrors(err.details)); // shown once, on the new password field
        setFormError('');
      } else fail(err);
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

  async function googleSignIn(credential: string) {
    if (busy) return;
    setBusy(true);
    reset();
    try {
      const res = await api<{ user: User }>('/auth/google', {
        method: 'POST',
        body: { credential, consent },
      });
      onAuthenticated(res.data.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'consent_required') {
        // A new account needs the consent box; send them to the form that has it.
        setMode('signup');
        setErrors({ consent: 'Please tick the box to continue' });
        setFormError('Tick the box below, then choose Google again to create your account.');
      } else fail(err);
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'signup'
      ? 'Create your account'
      : mode === 'login'
        ? 'Welcome back'
        : mode === 'forgot'
          ? 'Reset your password'
          : 'Enter your code';

  const linkBtn = 'font-medium text-forest underline underline-offset-2';

  return (
    <>
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
            <Field
              label="Password"
              error={errors.password}
              hint={`At least ${PASSWORD_MIN} characters`}
            >
              {(a) => (
                <Input
                  {...a}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              )}
            </Field>
            <Honeypot />
            <div>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
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
            <FormError text={formError} />
            <Button type="submit" size="lg" loading={busy}>
              Create account
            </Button>
            <GoogleButton text="signup_with" onCredential={googleSignIn} />
          </form>
          <p className="mt-5 text-sm text-muted">
            Already have an account?{' '}
            <button type="button" className={linkBtn} onClick={() => goto('login')}>
              Sign in
            </button>
          </p>
        </>
      )}

      {mode === 'login' && (
        <>
          <p className="mt-2 text-muted">Sign in with your email and password.</p>
          <form onSubmit={submitLogin} noValidate className="mt-6 flex flex-col gap-4">
            <Field label="Email" error={errors.email}>
              {(a) => <Input {...a} name="email" type="email" autoComplete="username" required />}
            </Field>
            <Field label="Password" error={errors.password}>
              {(a) => (
                <Input
                  {...a}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              )}
            </Field>
            <FormError text={formError} />
            <Button type="submit" size="lg" loading={busy}>
              Sign in
            </Button>
            <GoogleButton text="signin_with" onCredential={googleSignIn} />
          </form>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <button type="button" className={linkBtn} onClick={() => goto('forgot')}>
              Forgot password?
            </button>
            <span>
              New here?{' '}
              <button type="button" className={linkBtn} onClick={() => goto('signup')}>
                Create an account
              </button>
            </span>
          </p>
        </>
      )}

      {mode === 'forgot' && (
        <>
          <p className="mt-2 text-muted">
            Choose a new password. We will email a code to confirm it is you.
          </p>
          <form onSubmit={submitForgot} noValidate className="mt-6 flex flex-col gap-4">
            <Field label="Email" error={errors.email}>
              {(a) => <Input {...a} name="email" type="email" autoComplete="email" required />}
            </Field>
            <Field
              label="New password"
              error={errors.password}
              hint={`At least ${PASSWORD_MIN} characters`}
            >
              {(a) => (
                <Input
                  {...a}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              )}
            </Field>
            <Honeypot />
            <FormError text={formError} />
            <Button type="submit" size="lg" loading={busy}>
              Send me a code
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            <button type="button" className={linkBtn} onClick={() => goto('login')}>
              Back to sign in
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
            {needNewPassword && (
              <Field label="Choose a different password" error={errors.password}>
                {(a) => (
                  <Input
                    {...a}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                )}
              </Field>
            )}
            <FormError text={formError} />
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
              className={`${linkBtn} disabled:no-underline disabled:opacity-60`}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
            </button>
          </p>
        </>
      )}
    </>
  );
}
