/**
 * Bunny Stream helpers. A listing stores only the player link; the preview picture lives on the
 * library's CDN host next to the video.
 *
 * shortcut: one library only (id 823842), so the CDN host is a constant. If the library changes,
 * edit it here, or serve the thumbnail URL from the API instead.
 */
export const BUNNY_CDN_HOST = 'vz-532563bc-540.b-cdn.net';

const VIDEO_URL =
  /^https:\/\/(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/\d+\/([0-9a-f-]{36})/;

/** Preview picture of a listing's video, or undefined when there is none or the link is odd. */
export function videoThumb(videoUrl: string | null | undefined): string | undefined {
  const id = videoUrl?.match(VIDEO_URL)?.[1];
  return id ? `https://${BUNNY_CDN_HOST}/${id}/thumbnail.jpg` : undefined;
}
