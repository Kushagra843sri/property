import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Where a listing's video lives. `upload` streams the bytes through; nothing is stored here. */
export interface VideoStore {
  /** Returns the player link to save on the listing. */
  upload(body: Readable, size: number, title: string): Promise<string>;
}

const BUNNY_API = 'https://video.bunnycdn.com';
const UPLOAD_TIMEOUT_MS = 15 * 60_000;

/** Dev/test stand-in: reads and discards the bytes and returns a link of the right shape. */
class MockVideoStore implements VideoStore {
  async upload(body: Readable) {
    for await (const chunk of body) void chunk;
    return `https://iframe.mediadelivery.net/embed/123456/${randomUUID()}`;
  }
}

class BunnyStore implements VideoStore {
  constructor(
    private key: string,
    private library: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return { AccessKey: this.key, ...extra };
  }

  async upload(body: Readable, size: number, title: string) {
    const created = await fetch(`${BUNNY_API}/library/${this.library}/videos`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!created.ok) throw new Error(`video provider responded ${created.status} on create`);
    const { guid } = (await created.json()) as { guid?: string };
    if (!guid) throw new Error('video provider returned no video id');

    try {
      const put = await fetch(`${BUNNY_API}/library/${this.library}/videos/${guid}`, {
        method: 'PUT',
        headers: this.headers({
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(size),
        }),
        // Streamed, never buffered: the free host has little memory. `duplex` is required for a stream body.
        body: Readable.toWeb(body) as unknown as BodyInit,
        duplex: 'half',
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      } as RequestInit & { duplex: 'half' });
      if (!put.ok) throw new Error(`video provider responded ${put.status} on upload`);
    } catch (err) {
      // Do not leave an empty video behind in the library.
      await fetch(`${BUNNY_API}/library/${this.library}/videos/${guid}`, {
        method: 'DELETE',
        headers: this.headers(),
        signal: AbortSignal.timeout(15_000),
      }).catch((e) => logger.warn({ err: e }, 'could not remove the failed video'));
      throw err;
    }
    return `https://iframe.mediadelivery.net/embed/${this.library}/${guid}`;
  }
}

let override: VideoStore | undefined;
/** Test seam, same pattern as the image store. */
export const setVideoStore = (s: VideoStore | undefined) => {
  override = s;
};

/** The store to use, or undefined when video upload is not set up (production without a key). */
export function getVideoStore(): VideoStore | undefined {
  if (override) return override;
  if (env.BUNNY_API_KEY && env.BUNNY_LIBRARY_ID)
    return new BunnyStore(env.BUNNY_API_KEY, env.BUNNY_LIBRARY_ID);
  return env.NODE_ENV === 'production' ? undefined : new MockVideoStore();
}
