'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { FEATURES } from '@/lib/flags';
import { cn } from '@/lib/cn';

// Loaded only on demand; three.js never enters the main bundle.
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

function canUse3d(): { ok: boolean; light: boolean } {
  if (!FEATURES.hero3d || typeof window === 'undefined') return { ok: false, light: true };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return { ok: false, light: true };
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return { ok: false, light: true };
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return { ok: false, light: true };
  } catch {
    return { ok: false, light: true };
  }
  const small =
    window.matchMedia('(max-width: 767px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  return { ok: true, light: small };
}

/**
 * Hero picture. The poster is always rendered first (it is the LCP element); the 3D scene is an
 * enhancement mounted after idle time, paused off-screen, and skipped entirely for reduced motion,
 * data-saver, no WebGL, or when FEATURES.hero3d is false.
 */
export function HeroVisual({ poster }: { poster: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<{ ok: boolean; light: boolean }>({ ok: false, light: true });
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const check = canUse3d();
    if (!check.ok) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    const start = () => setMode(check);
    const handle = idle ? idle(start) : window.setTimeout(start, 400);
    return () => {
      if (!idle) window.clearTimeout(handle);
    };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !mode.ok) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting));
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [mode.ok]);

  return (
    <div
      ref={box}
      className="relative aspect-[16/11] overflow-hidden rounded-lg bg-sunken sm:aspect-[16/10]"
    >
      <Image
        src={poster}
        alt="Illustration of apartment buildings. PLACEHOLDER until the dealer's photography is supplied."
        fill
        priority
        unoptimized
        sizes="(min-width: 1024px) 720px, 100vw"
        className="object-cover"
      />
      {mode.ok && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-[800ms] ease-out',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <HeroScene
            active={inView && tabVisible}
            light={mode.light}
            onReady={() => setReady(true)}
          />
        </div>
      )}
    </div>
  );
}
