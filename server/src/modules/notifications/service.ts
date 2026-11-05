import { env } from '../../config/env.js';
import { getMailer } from '../../providers/mailer.js';
import { logger } from '../../utils/logger.js';

const clientUrl = () => env.CLIENT_URL ?? env.CORS_ORIGINS[0] ?? '';
export const listingUrl = (slug: string) => `${clientUrl()}/listings/${slug}`;

/** Send an alert to the dealer. Returns true if delivered; never throws (alerts must not break requests). */
export async function notifyDealer(subject: string, text: string): Promise<boolean> {
  const to = env.DEALER_NOTIFY_EMAIL;
  if (!to) {
    logger.warn('DEALER_NOTIFY_EMAIL not set; dealer notification skipped');
    return false;
  }
  try {
    await getMailer().send({ to, subject, text });
    return true;
  } catch (err) {
    logger.error({ err }, 'dealer notification failed');
    return false;
  }
}
