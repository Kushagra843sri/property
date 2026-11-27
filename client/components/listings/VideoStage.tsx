import { videoThumb } from '@/lib/video';

/**
 * The listing's video, first thing on the page. Dealer videos are filmed on phones (portrait), so
 * the player is a portrait frame centred on a dark stage whose backdrop is the blurred preview.
 * shortcut: assumes portrait video; a landscape one still plays but letterboxes inside the frame.
 */
export function VideoStage({ src, title }: { src: string; title: string }) {
  const thumb = videoThumb(src);
  return (
    <div className="relative aspect-[4/5] max-h-[78vh] w-full overflow-hidden rounded-lg bg-forest-deep sm:aspect-[16/10]">
      {thumb && (
        // Plain <img>: the CDN needs the browser's Referer, which Next's optimizer would not send.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-125 object-cover opacity-40 blur-2xl"
        />
      )}
      <div className="absolute inset-y-3 left-1/2 aspect-[9/16] -translate-x-1/2 overflow-hidden rounded-md shadow-overlay ring-1 ring-gold/40 sm:inset-y-4">
        <iframe
          title={`Video tour of ${title}`}
          src={src}
          allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="size-full"
        />
      </div>
    </div>
  );
}
