'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { FEATURES } from '@/lib/flags';
import { cn } from '@/lib/cn';

// Loaded only on demand; three.js never enters the main bundle.
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

/**
 * 3D runs on phones and laptops alike. Data-saver, reduced-motion, no-WebGL and very weak devices
 * keep the static poster and never download the three.js chunk (~130 KB).
 */
function canUse3d(): boolean {
  if (!FEATURES.hero3d || typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  // shortcut: only very weak phones (under 2 GB / 2 cores) keep the poster; raise if phones stutter.
  if ((nav.deviceMemory ?? 8) < 2 || (nav.hardwareConcurrency ?? 8) < 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Hero picture. The poster is always rendered first (it is the LCP element); the 3D scene is an
 * enhancement mounted after idle time, paused off-screen, and skipped entirely for reduced motion,
 * data-saver, no WebGL, or when FEATURES.hero3d is false.
 */
export function HeroVisual({ poster }: { poster: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (!canUse3d()) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const start = () => setEnabled(true);
    const handle = idle ? idle(start) : window.setTimeout(start, 400);
    return () => {
      if (!idle) window.clearTimeout(handle);
    };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting));
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled]);

  return (
    <div
      ref={box}
      className="relative aspect-[16/11] overflow-hidden rounded-lg border border-line-on-dark bg-forest-deep sm:aspect-[16/10]"
    >
      {/* The poster is the first paint (LCP). It fades out once the 3D scene is ready so the two
          never overlap. */}
      <Image
        src={poster}
        alt="Illustration of a gold and black city skyline"
        fill
        priority
        unoptimized
        sizes="(min-width: 1024px) 720px, 100vw"
        className={cn(
          'object-cover transition-opacity duration-[800ms] ease-out',
          ready ? 'opacity-0' : 'opacity-100',
        )}
      />
      {enabled && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-[800ms] ease-out',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <HeroScene active={inView && tabVisible} onReady={() => setReady(true)} />
        </div>
      )}
      {ready && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-3 rounded-pill bg-black/55 px-3 py-1.5 text-xs text-on-forest-muted ring-1 ring-line-on-dark backdrop-blur-sm"
          style={{ borderRadius: 'var(--r-pill)' }}
        >
          Drag to turn
        </span>
      )}
    </div>
  );
}
