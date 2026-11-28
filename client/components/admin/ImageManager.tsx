'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import type { AdminProperty } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { PropertyImage } from '@/components/listings/PropertyImage';
import { PHOTO_MAX_PER_LISTING } from '@/lib/media';
import { MediaPickerDialog } from './MediaPickerDialog';

export function ImageManager({
  property,
  onChange,
}: {
  property: AdminProperty;
  onChange: (p: AdminProperty) => void;
}) {
  const base = `/admin/properties/${property.id}/images`;
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const images = [...property.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const fail = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : 'Something went wrong.');

  async function upload(files: File[]) {
    if (!files.length || busy) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    setBusy(true);
    try {
      const res = await api<AdminProperty>(base, { method: 'POST', formData: fd });
      onChange(res.data);
      setPicking(false);
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} added.`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function reorder(from: number, to: number) {
    if (busy || to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setBusy(true);
    try {
      const res = await api<AdminProperty>(base, {
        method: 'PATCH',
        body: { images: next.map((im, i) => ({ publicId: im.publicId, order: i })) },
      });
      onChange(res.data);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveAlt(publicId: string, alt: string, order: number) {
    try {
      const res = await api<AdminProperty>(base, {
        method: 'PATCH',
        body: { images: [{ publicId, order, alt }] },
      });
      onChange(res.data);
    } catch (err) {
      fail(err);
    }
  }

  async function remove(publicId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api<AdminProperty>(`${base}?publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });
      onChange(res.data);
      setConfirming(null);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="photos" className="mt-12 max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="photos" className="text-[length:var(--text-xl)]">
          Photos ({images.length})
        </h2>
        <Button variant="secondary" onClick={() => setPicking(true)}>
          <Upload size={18} aria-hidden /> Add photos
        </Button>
      </div>
      <MediaPickerDialog
        open={picking}
        onClose={() => (busy ? undefined : setPicking(false))}
        kind="photo"
        maxFiles={PHOTO_MAX_PER_LISTING - images.length}
        onPick={upload}
        busy={busy}
      />
      <p className="mb-4 text-sm text-muted">
        JPG, PNG or WebP, up to 5 MB each. The first photo is the cover. Location data is removed
        from every photo.
      </p>
      {images.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-8 text-center text-muted">
          No photos yet.
        </p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2">
          {images.map((im, i) => (
            <li
              key={im.publicId}
              className="overflow-hidden rounded-lg border border-line bg-raised"
            >
              <div className="relative aspect-[4/3]">
                <PropertyImage src={im.url} alt={im.alt || `Photo ${i + 1}`} sizes="400px" />
              </div>
              <div className="flex flex-col gap-3 p-3">
                <Input
                  aria-label={`Description of photo ${i + 1}`}
                  defaultValue={im.alt ?? ''}
                  maxLength={200}
                  placeholder="Describe the photo, for example: living room"
                  onBlur={(e) =>
                    e.target.value !== (im.alt ?? '') && saveAlt(im.publicId, e.target.value, i)
                  }
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      aria-label={`Move photo ${i + 1} earlier`}
                      disabled={i === 0 || busy}
                      onClick={() => reorder(i, i - 1)}
                    >
                      <ArrowUp size={18} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Move photo ${i + 1} later`}
                      disabled={i === images.length - 1 || busy}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <ArrowDown size={18} aria-hidden />
                    </Button>
                  </div>
                  {confirming === im.publicId ? (
                    <div className="flex gap-2">
                      <Button variant="danger" loading={busy} onClick={() => remove(im.publicId)}>
                        Yes, remove
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => setConfirming(im.publicId)}>
                      <Trash2 size={18} aria-hidden /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
