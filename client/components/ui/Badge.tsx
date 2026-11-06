import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'forest' | 'success' | 'warn' | 'error';
const tones: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink',
  forest: 'bg-forest text-on-forest',
  success: 'bg-success-bg text-success',
  warn: 'bg-warn-bg text-warn',
  error: 'bg-error-bg text-error',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-[0.8125rem] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
