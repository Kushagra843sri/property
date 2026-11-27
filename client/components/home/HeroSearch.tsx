'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { typeLabel } from '@/lib/format';
import type { AreaOption } from '@/lib/types';

const TYPES = ['flat', 'pg', 'room', 'shop', 'office'];
const field =
  'min-h-12 w-full rounded-md border border-line-on-dark bg-forest-deep px-3 text-on-forest ' +
  'transition-colors hover:border-gold focus:border-gold';

/** Hero search: Buy or Rent, area, type. Plain links to /listings, so it works on every phone. */
export function HeroSearch({ areas }: { areas: AreaOption[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<'rent' | 'buy'>('rent');
  const [locality, setLocality] = useState('');
  const [type, setType] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({ purpose });
    if (locality) q.set('locality', locality);
    if (type) q.set('type', type);
    router.push(`/listings?${q}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Search properties"
      className="fade-up rounded-lg border border-line-on-dark bg-black/45 p-3 backdrop-blur-sm sm:p-4"
      style={{ ['--d' as string]: '520ms' }}
    >
      <div
        role="radiogroup"
        aria-label="I want to"
        className="mb-3 inline-flex rounded-md bg-forest-deep p-1 ring-1 ring-line-on-dark"
      >
        {(['rent', 'buy'] as const).map((v) => (
          <label key={v}>
            <input
              type="radio"
              name="purpose"
              value={v}
              checked={purpose === v}
              onChange={() => setPurpose(v)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 cursor-pointer items-center rounded px-6 text-[0.9375rem] font-medium text-on-forest-muted transition-colors hover:text-on-forest peer-checked:bg-gold peer-checked:text-forest-deep peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-bright">
              {v === 'rent' ? 'Rent' : 'Buy'}
            </span>
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block text-sm text-on-forest-muted">
          Area
          <select
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className={`${field} mt-1`}
          >
            <option value="">Any area</option>
            {areas.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-on-forest-muted">
          Property type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`${field} mt-1`}
          >
            <option value="">Any type</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass('gold', 'lg', 'self-end')}>
          <Search size={18} aria-hidden /> Search
        </button>
      </div>
    </form>
  );
}
