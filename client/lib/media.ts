/** Upload rules for admin media. Keep VIDEO_MAX_MB equal to the server's MAX_VIDEO_MB (default 200). */
export const PHOTO_MAX_MB = 5;
export const PHOTO_MAX_PER_LISTING = 20; // matches MAX_IMAGES_PER_PROPERTY on the server
export const VIDEO_MAX_MB = 200;

export const MEDIA = {
  photo: {
    types: ['image/jpeg', 'image/png', 'image/webp'],
    typeLabel: 'JPG, PNG or WebP',
    maxMb: PHOTO_MAX_MB,
    multiple: true,
  },
  video: {
    types: ['video/mp4', 'video/quicktime', 'video/webm'],
    typeLabel: 'MP4, MOV or WebM',
    maxMb: VIDEO_MAX_MB,
    multiple: false,
  },
} as const;

export type MediaKind = keyof typeof MEDIA;

/** Splits chosen files into the usable ones and a plain-language problem for the rest. */
export function checkFiles(kind: MediaKind, files: File[]): { ok: File[]; problem: string } {
  const rule = MEDIA[kind];
  const problems: string[] = [];
  const ok = files.filter((f) => {
    if (!(rule.types as readonly string[]).includes(f.type)) {
      problems.push(`${f.name} is not ${rule.typeLabel}.`);
      return false;
    }
    if (f.size > rule.maxMb * 1024 * 1024) {
      problems.push(`${f.name} is larger than ${rule.maxMb} MB.`);
      return false;
    }
    return true;
  });
  return { ok, problem: problems.join(' ') };
}

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
