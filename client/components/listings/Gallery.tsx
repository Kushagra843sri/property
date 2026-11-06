'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import type { PropertyImage as Img } from '@/lib/types';
import { cn } from '@/lib/cn';
import { Dialog } from '@/components/ui/Dialog';
import { PropertyImage } from './PropertyImage';

export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (count === 0) {
    return (
      <div className="aspect-[16/10] overflow-hidden rounded-lg">
        <PropertyImage alt={title} sizes="100vw" />
      </div>
    );
  }

  const current = images[index] ?? images[0]!;
  const alt = current.alt || `${title}, photo ${index + 1} of ${count}`;

  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-lg bg-sunken">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open photo ${index + 1} of ${count} full screen`}
          className="absolute inset-0 z-10 cursor-zoom-in"
        />
        <div key={index} className="absolute inset-0 animate-[fade-in_250ms_ease-out]">
          <PropertyImage
            src={current.url}
            alt={alt}
            sizes="(min-width: 1024px) 760px, 100vw"
            priority={index === 0}
          />
        </div>
        <span className="pointer-events-none absolute bottom-3 right-3 z-20 inline-flex items-center gap-2 rounded-md bg-raised px-3 py-1.5 text-sm">
          <Expand size={16} aria-hidden /> {index + 1} / {count}
        </span>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-raised shadow-raised transition-transform duration-150 active:scale-95"
            >
              <ChevronLeft aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-raised shadow-raised transition-transform duration-150 active:scale-95"
            >
              <ChevronRight aria-hidden />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photo thumbnails">
          {images.map((img, i) => (
            <li key={`${img.url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'relative block h-16 w-24 overflow-hidden rounded-md border-2 transition-[border-color,opacity] duration-150',
                  i === index ? 'border-forest' : 'border-transparent opacity-75 hover:opacity-100',
                )}
              >
                <PropertyImage src={img.url} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${title}, photo gallery`}
        size="lg"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-sunken sm:aspect-[16/10]">
          <div key={index} className="absolute inset-0 animate-[fade-in_250ms_ease-out]">
            <PropertyImage src={current.url} alt={alt} sizes="1100px" className="object-contain" />
          </div>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-raised shadow-raised"
              >
                <ChevronLeft aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-raised shadow-raised"
              >
                <ChevronRight aria-hidden />
              </button>
            </>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-muted" aria-live="polite">
          Photo {index + 1} of {count}
        </p>
      </Dialog>
    </div>
  );
}
