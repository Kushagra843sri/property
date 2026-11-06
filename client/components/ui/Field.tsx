'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: (a11y: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Label + control + hint/error, wired with ids so screen readers read the error with the field. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': descId })}
      {(error || hint) && (
        <p
          id={descId}
          role={error ? 'alert' : undefined}
          className={cn('text-sm', error ? 'text-error' : 'text-muted')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const controlClass =
  'min-h-11 w-full rounded-md border border-line-strong bg-raised px-3.5 py-2 text-base text-ink placeholder:text-muted ' +
  'transition-[border-color,background-color] duration-150 hover:border-ink aria-[invalid=true]:border-error disabled:opacity-55';

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(controlClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClass, 'min-h-32 resize-y', className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<'select'>) {
  return <select className={cn(controlClass, 'pr-8', className)} {...rest} />;
}
