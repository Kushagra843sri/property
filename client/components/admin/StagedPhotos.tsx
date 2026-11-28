'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PHOTO_MAX_PER_LISTING } from '@/lib/media';
import { MediaPickerDialog } from './MediaPickerDialog';

/**
 * Photos chosen while creating a listing. They are held in the browser and uploaded right after the
 * listing is saved (a photo needs the listing to exist first).
 */
export function StagedPhotos({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  return (
    <section
      aria-labelledby="staged-photos"
      className="rounded-lg border border-line bg-raised p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="staged-photos" className="text-[length:var(--text-xl)]">
          Photos {files.length > 0 && `(${files.length})`}
        </h2>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <ImagePlus size={18} aria-hidden /> Add photos
        </Button>
      </div>
      {files.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No photos chosen yet. They are uploaded when you create the listing; you can add more
          afterwards.
        </p>
      ) : (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="relative overflow-hidden rounded-md border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urls[i]}
                alt={`Chosen photo ${i + 1}: ${f.name}`}
                className="aspect-[4/3] w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs text-gold-bright">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 grid size-11 place-items-center rounded-md bg-black/60 text-on-forest hover:bg-black/80"
              >
                <Trash2 size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        kind="photo"
        maxFiles={PHOTO_MAX_PER_LISTING - files.length}
        onPick={(picked) => {
          onChange([...files, ...picked]);
          setOpen(false);
        }}
      />
    </section>
  );
}
