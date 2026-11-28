'use client';

import { useState } from 'react';
import { Film } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, uploadFile } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { MediaPickerDialog } from './MediaPickerDialog';

/**
 * The listing's video: upload one from the computer (it goes to the video library and the link is
 * filled in for you) or paste a player link. The link box is the form value (`videoUrl`).
 */
export function VideoField({
  defaultValue,
  error,
}: {
  defaultValue?: string | null;
  error?: string | undefined;
}) {
  const [url, setUrl] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function upload(files: File[]) {
    const file = files[0];
    if (!file || busy) return;
    setBusy(true);
    setProgress(0);
    try {
      const res = await uploadFile<{ videoUrl: string }>('/admin/video', file, setProgress);
      setUrl(res.data.videoUrl);
      setOpen(false);
      toast.success(
        'Video uploaded. It can take a minute before it plays. Save the listing to keep it.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'The upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Field
        label="Video (optional)"
        error={error}
        hint="Upload one from your computer, or paste a Bunny Stream player link."
      >
        {(a) => (
          <Input
            {...a}
            name="videoUrl"
            type="url"
            maxLength={300}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        )}
      </Field>
      <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}>
        <Film size={18} aria-hidden /> Upload a video from this computer
      </Button>
      <MediaPickerDialog
        open={open}
        onClose={() => (busy ? undefined : setOpen(false))}
        kind="video"
        onPick={upload}
        busy={busy}
        progress={progress}
      />
    </div>
  );
}
