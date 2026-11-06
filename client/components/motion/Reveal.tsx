'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Scroll reveal that is visible by default. Only elements that start below the fold are "armed"
 * (hidden) by this effect, so no-JS and reduced-motion users always see everything.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already on screen (or no IntersectionObserver): leave it visible, no animation.
    if (
      typeof IntersectionObserver === 'undefined' ||
      el.getBoundingClientRect().top < window.innerHeight
    )
      return;
    document.documentElement.classList.add('js'); // scripting is proven on: safe to hide
    el.dataset.armed = 'true';
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.in = 'true';
          io.disconnect(); // once
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
