import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none ' +
  'transition-[transform,background-color,color,border-color,opacity] duration-150 ease-out ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55';

const variants: Record<Variant, string> = {
  primary: 'bg-forest text-on-forest hover:bg-forest-hover',
  secondary: 'border border-forest text-forest hover:bg-forest hover:text-on-forest',
  ghost: 'text-forest hover:bg-sunken',
  danger: 'bg-error text-on-forest hover:opacity-90',
};
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 text-[0.9375rem]',
  lg: 'min-h-12 px-7 text-base',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cn(base, variants[variant], sizes[size], extra);

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Common & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  className,
  children,
  ...rest
}: Omit<Common, 'loading'> & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
