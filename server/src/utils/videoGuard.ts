import { Transform, type TransformCallback } from 'node:stream';
import { AppError } from './errors.js';

const MP4_OR_MOV = 'ftyp'; // bytes 4..8 of an MP4 / MOV file
const WEBM_MAGIC = 0x1a45dfa3; // EBML header (WebM / Matroska)

/** True when the first bytes look like an MP4, MOV or WebM file. */
export function looksLikeVideo(head: Buffer): boolean {
  if (head.length < 12) return false;
  return (
    head.subarray(4, 8).toString('latin1') === MP4_OR_MOV || head.readUInt32BE(0) === WEBM_MAGIC
  );
}

/**
 * Pass-through for an upload: checks the file type by its first bytes and stops at the size limit,
 * without ever holding the file in memory.
 */
export class VideoGuard extends Transform {
  private seen = 0;
  private head = Buffer.alloc(0);
  private checked = false;

  constructor(private maxBytes: number) {
    super();
  }

  override _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
    this.seen += chunk.length;
    if (this.seen > this.maxBytes)
      return cb(new AppError(413, 'too_large', 'That video is too large'));
    if (!this.checked) {
      this.head = Buffer.concat([this.head, chunk]);
      if (this.head.length >= 12) {
        this.checked = true;
        if (!looksLikeVideo(this.head))
          return cb(AppError.badRequest('That file is not a valid MP4, MOV or WebM video'));
      }
    }
    cb(null, chunk);
  }

  override _flush(cb: TransformCallback) {
    if (!this.checked)
      return cb(AppError.badRequest('That file is not a valid MP4, MOV or WebM video'));
    cb();
  }
}
