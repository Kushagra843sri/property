'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Film, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';
import { MEDIA, checkFiles, formatSize, type MediaKind } from '@/lib/media';

interface Props {
  open: boolean;
  onClose: () => void;
  kind: MediaKind;
  /** Called with the chosen files. The dialog stays open while it runs, so progress can show. */
  onPick: (files: File[]) => void | Promise<void>;
  /** How many more files may be added (photos only). */
  maxFiles?: number;
  busy?: boolean;
  /** 0 to 100 while a video uploads. */
  progress?: number;
}

/**
 * "Add photos" / "Add a video": drag files in or browse the computer's own file chooser, review
 * them, then confirm. The same dialog serves both kinds so the admin learns one thing.
 */
export function MediaPickerDialog({ open, onClose, kind, ...rest }: Props) {
  const title = kind === 'photo' ? 'Add photos' : 'Add a video';
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <Picker kind={kind} title={title} onClose={onClose} {...rest} />
    </Dialog>
  );
}

function Picker({
  kind,
  title,
  onClose,
  onPick,
  maxFiles = Infinity,
  busy = false,
  progress,
}: Omit<Props, 'open'> & { title: string }) {
  const rule = MEDIA[kind];
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState('');
  const [dragging, setDragging] = useState(false);

  // Preview pictures for photos; always released again.
  const previews = useMemo(
    () => (kind === 'photo' ? files.map((f) => URL.createObjectURL(f)) : []),
    [kind, files],
  );
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function add(list: FileList | File[] | null) {
    if (!list?.length || busy) return;
    const { ok, problem: p } = checkFiles(kind, [...list]);
    let next = rule.multiple ? [...files, ...ok] : ok.slice(0, 1);
    let note = p;
    if (next.length > maxFiles) {
      next = next.slice(0, maxFiles);
      const more = `Only ${maxFiles} more photo${maxFiles === 1 ? '' : 's'} can be added here.`;
      note = `${note} ${more}`.trim();
    }
    if (ok.length > 0) setFiles(next);
    setProblem(note);
    if (input.current) input.current.value = '';
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  const confirmLabel =
    kind === 'photo' ? `Add ${files.length} photo${files.length === 1 ? '' : 's'}` : 'Upload video';

  return (
    <div>
      <h2 className="pr-12 text-[length:var(--text-xl)]">{title}</h2>
      <p className="mt-2 text-sm text-muted">
        {rule.typeLabel}, up to {rule.maxMb} MB{kind === 'photo' ? ' each' : ''}.{' '}
        {kind === 'photo'
          ? 'The first photo is the cover.'
          : 'It goes to the video library and can take a minute before it plays.'}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'mt-5 grid place-items-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-gold bg-sunken' : 'border-line-strong bg-paper',
        )}
      >
        <UploadCloud size={32} aria-hidden className="text-muted" />
        <p>Drag {rule.multiple ? 'files' : 'a file'} here, or</p>
        <input
          ref={input}
          type="file"
          accept={rule.types.join(',')}
          multiple={rule.multiple}
          tabIndex={-1}
          aria-label={`Choose ${kind === 'photo' ? 'photos' : 'a video'} from your computer`}
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
        <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          Browse files on this computer
        </Button>
      </div>

      {problem && (
        <p role="alert" className="mt-3 rounded-md bg-error-bg px-3 py-2 text-sm text-error">
          {problem}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 grid gap-2" aria-label="Chosen files">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-3 rounded-md border border-line bg-raised p-2"
            >
              {kind === 'photo' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[i]} alt="" className="size-14 shrink-0 rounded object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded bg-sunken">
                  <Film size={22} aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="block text-xs text-muted">{formatSize(f.size)}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                aria-label={`Remove ${f.name}`}
                className="grid size-11 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-error disabled:opacity-50"
              >
                <Trash2 size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy && progress !== undefined && (
        <div className="mt-4">
          <label htmlFor="upload-progress" className="text-sm text-muted">
            Uploading… {progress}%
          </label>
          <progress id="upload-progress" max={100} value={progress} className="mt-1 h-2 w-full" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button loading={busy} disabled={files.length === 0} onClick={() => void onPick(files)}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
