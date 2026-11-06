'use client';

import { Check, Heart } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useInterests } from './InterestContext';

interface Props {
  propertyId: string;
  available?: boolean;
  variant?: 'card' | 'panel';
  className?: string;
}

/**
 * The "Interested" action. Logged-out visitors get the sign-up dialog and the action resumes
 * automatically once they are signed in. One interest per listing; repeats are harmless.
 */
export function InterestButton({
  propertyId,
  available = true,
  variant = 'card',
  className,
}: Props) {
  const { user, openAuth } = useAuth();
  const interests = useInterests();
  const done = !!user && interests.has(propertyId);
  const pending = interests.pending(propertyId);

  if (!available) return null;

  if (done) {
    return (
      <span
        role="status"
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 animate-[fade-in_200ms_ease-out] rounded-md bg-success-bg px-5 font-medium text-success',
          variant === 'panel' && 'min-h-12 w-full',
          className,
        )}
      >
        <Check size={18} aria-hidden /> Interest sent
      </span>
    );
  }

  const onClick = () => {
    if (!user) {
      openAuth({ mode: 'signup', onSuccess: () => void interests.add(propertyId) });
      return;
    }
    void interests.add(propertyId);
  };

  return (
    <Button
      variant={variant === 'panel' ? 'primary' : 'secondary'}
      size={variant === 'panel' ? 'lg' : 'md'}
      className={cn(variant === 'panel' && 'w-full', className)}
      loading={pending}
      onClick={onClick}
    >
      <Heart size={18} aria-hidden /> I am interested
    </Button>
  );
}
