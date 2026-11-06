'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { enquirySchema, fieldErrors, serverFieldErrors, type FieldErrors } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';

interface Props {
  propertyId?: string | undefined;
  propertyTitle?: string | undefined;
}

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export function EnquiryForm({ propertyId, propertyTitle }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return; // double-submit guard
    const fd = new FormData(e.currentTarget);
    const values = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      message: String(fd.get('message') ?? ''),
    };
    const parsed = enquirySchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError('');
      return;
    }
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      await api('/enquiries', {
        method: 'POST',
        body: {
          ...values,
          website: String(fd.get('website') ?? ''),
          ...(propertyId && OBJECT_ID.test(propertyId) ? { propertyId } : {}),
        },
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(serverFieldErrors(err.details));
        setFormError(
          err.status === 429
            ? 'You have sent several messages already. Please wait a while or call us.'
            : err.message,
        );
      } else setFormError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded-lg border border-line bg-raised p-8">
        <CheckCircle2 className="text-success" size={32} aria-hidden />
        <h2 className="mt-4 text-2xl">Thank you, we have your message</h2>
        <p className="mt-2 text-muted">
          We will get back to you shortly, usually the same working day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-label="Enquiry form">
      {propertyTitle && (
        <p className="rounded-md bg-sunken px-4 py-3 text-sm">
          About: <strong>{propertyTitle}</strong>
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>
          {(a) => <Input {...a} name="name" autoComplete="name" required />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(a) => <Input {...a} name="phone" type="tel" autoComplete="tel" required />}
        </Field>
      </div>
      <Field label="Email" error={errors.email}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" required />}
      </Field>
      <Field label="How can we help?" error={errors.message}>
        {(a) => <Textarea {...a} name="message" maxLength={2000} required />}
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
      <Button type="submit" size="lg" loading={busy} className="self-start">
        Send message
      </Button>
      <p className="text-sm text-muted">We use your details only to reply to this enquiry.</p>
    </form>
  );
}
