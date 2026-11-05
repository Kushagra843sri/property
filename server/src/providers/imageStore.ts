import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

export interface StoredImage {
  url: string;
  publicId: string;
}
export interface ImageStore {
  upload(data: Buffer): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
}

/** Dev fallback: stores nothing, returns a placeholder URL. Forbidden in production by env validation. */
class MockImageStore implements ImageStore {
  removed: string[] = [];
  async upload() {
    const id = randomBytes(8).toString('hex');
    return { url: `https://placehold.co/1200x900/png?text=mock-${id}`, publicId: `mock/${id}` };
  }
  async remove(publicId: string) {
    this.removed.push(publicId);
  }
}

class CloudinaryStore implements ImageStore {
  private endpoint = (action: string) =>
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/${action}`;

  // Cloudinary signature: sha1 of the sorted `k=v&...` params followed by the API secret.
  private sign(params: Record<string, string>) {
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return createHash('sha1')
      .update(toSign + env.CLOUDINARY_API_SECRET)
      .digest('hex');
  }

  private async post(action: string, params: Record<string, string>, file?: Buffer) {
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.set(k, v);
    form.set('api_key', env.CLOUDINARY_API_KEY as string);
    form.set('signature', this.sign(params));
    if (file) form.set('file', new Blob([new Uint8Array(file)]), 'upload');
    const res = await fetch(this.endpoint(action), {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`image provider responded ${res.status}`);
    return (await res.json()) as { secure_url?: string; public_id?: string };
  }

  async upload(data: Buffer) {
    const params = {
      folder: env.CLOUDINARY_FOLDER,
      public_id: randomBytes(12).toString('hex'),
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const out = await this.post('upload', params, data);
    if (!out.secure_url || !out.public_id) throw new Error('image provider returned no url');
    return { url: out.secure_url, publicId: out.public_id };
  }

  async remove(publicId: string) {
    await this.post('destroy', {
      public_id: publicId,
      timestamp: String(Math.floor(Date.now() / 1000)),
    });
  }
}

let store: ImageStore =
  env.IMAGE_PROVIDER === 'cloudinary' ? new CloudinaryStore() : new MockImageStore();
export const getImageStore = () => store;
export const setImageStore = (s: ImageStore) => {
  store = s;
};
