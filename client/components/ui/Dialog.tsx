'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'lg';
}

/** Native <dialog>: focus trap, Escape and inert background come from the platform. */
export function Dialog({ open, onClose, title, children, size = 'sm' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      className={`m-auto rounded-lg ${size === 'lg' ? 'w-[min(72rem,calc(100vw-1rem))]' : 'w-[min(32rem,calc(100vw-2rem))]'} bg-raised p-0 text-ink shadow-overlay backdrop:bg-[var(--scrim)] open:animate-[dialog-in_250ms_var(--ease-emph)]`}
    >
      <div className={`relative ${size === 'lg' ? 'p-2 sm:p-4' : 'p-6 sm:p-8'}`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink"
        >
          <X size={20} aria-hidden />
        </button>
        {open && children}
      </div>
    </dialog>
  );
}
