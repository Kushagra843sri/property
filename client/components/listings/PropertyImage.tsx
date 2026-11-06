'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  src?: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** next/image in a fixed-ratio frame. Missing or broken images fall back to a deliberate empty tile. */
export function PropertyImage({ src, alt, sizes, priority, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no photo available)`}
        className={cn('grid size-full place-items-center bg-sunken text-muted', className)}
      >
        <ImageOff size={28} aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith('.svg')}
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
