'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import type { AdminProperty } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ImageManager } from '@/components/admin/ImageManager';
import { PageHeader, State } from '@/components/admin/parts';
import { PropertyForm } from '@/components/admin/PropertyForm';

export default function EditListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, reload } = useApi<AdminProperty>(`/admin/properties/${id}`);
  // Local copy so photo changes show instantly; reset when the server copy changes.
  const [local, setLocal] = useState<AdminProperty | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = local && local.id === id ? local : data;

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/admin/properties/${id}`, { method: 'DELETE' });
      toast.success('Listing deleted.');
      router.push('/admin/listings');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete.');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={p ? p.title : 'Listing'}
        actions={
          p && (
            <Link
              href={`/listings/${p.slug}`}
              target="_blank"
              className="inline-flex min-h-11 items-center gap-2 text-forest underline underline-offset-4"
            >
              <ExternalLink size={16} aria-hidden /> View on site
            </Link>
          )
        }
      />
      <State
        loading={loading && !p}
        error={error}
        empty={!p}
        emptyText="Listing not found."
        onRetry={reload}
      >
        {p && (
          <>
            {/* key: the form re-initialises when a different saved version arrives */}
            <PropertyForm
              key={`${p.id}-${p.status}-${p.type}`}
              initial={p}
              onSaved={(saved) => {
                setLocal(saved);
                toast.success('Saved.');
              }}
            />
            <ImageManager property={p} onChange={setLocal} />
            <section aria-labelledby="danger" className="mt-16 max-w-4xl border-t border-line pt-8">
              <h2 id="danger" className="text-[length:var(--text-xl)]">
                Delete this listing
              </h2>
              <p className="mt-1 text-muted">
                This removes the listing, its photos and the interests registered on it. It cannot
                be undone. To hide it instead, set the status to hidden.
              </p>
              {confirm ? (
                <div className="mt-4 flex gap-3">
                  <Button variant="danger" loading={busy} onClick={remove}>
                    Yes, delete permanently
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="danger" className="mt-4" onClick={() => setConfirm(true)}>
                  <Trash2 size={18} aria-hidden /> Delete listing
                </Button>
              )}
            </section>
          </>
        )}
      </State>
    </>
  );
}
